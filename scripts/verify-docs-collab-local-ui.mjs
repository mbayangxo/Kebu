import assert from 'node:assert/strict';
/**
 * Real Library Documents UI, two independent browser contexts, one real
 * Yjs CRDT document synced over a from-scratch Supabase Realtime fixture
 * (tests/platform/support/fake-supabase-realtime.ts speaks the actual
 * @supabase/realtime-js wire protocol) -> Next API -> supabase-js ->
 * isolated SQL/RLS. Loopback Auth/REST fixture only, no hosted Supabase.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, createWriteStream, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const chromium = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH, modulePath = process.env.KEBU_PGLITE_MODULE_PATH;
if (!chromium || !modulePath) throw Error('Set local Chromium and PGlite module paths. No hosted fallback.');
const { PGlite } = await import(pathToFileURL(modulePath).href), db = new PGlite();
const userA = '55555555-5555-4555-8555-555555555555', userB = '66666666-6666-4666-8666-666666666666', stranger = '77777777-7777-4777-8777-777777777777';
const business = '88888888-8888-4888-8888-888888888888';
const output = process.env.KEBU_DOCS_COLLAB_UI_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), 'kebu-docs-collab-ui-'));
mkdirSync(output, { recursive: true });
const read = (path) => readFileSync(join(root, path), 'utf8');

await db.exec(`
  create role authenticated; create schema auth; create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table public.businesses(id uuid primary key, public_kebu_id text, legal_name text, trading_name text, lifecycle_status text not null default 'active');
  create table public.business_members(business_id uuid, user_id uuid, role text not null default 'member', status text not null);
  create table public.user_profiles(id uuid primary key, active_business_id uuid, updated_at timestamptz not null default now());
  grant usage on schema auth,public to authenticated; grant execute on function auth.uid() to authenticated;
  grant select on public.business_members, public.businesses to authenticated;
  grant select, update on public.user_profiles to authenticated;
`);
for (const id of [userA, userB, stranger]) await db.query('insert into auth.users values($1)', [id]);
await db.exec(read('supabase/migrations/20260920081000_workspace_items.sql'));
await db.exec('alter table workspace_items add column room_id uuid; grant select,insert,update,delete on workspace_items to authenticated; create function public.can_access_room(uuid) returns boolean language sql as $$select false$$;');
const scoped = read('supabase/migrations/20260920086000_room_scope_hardening.sql');
await db.exec(scoped.slice(scoped.indexOf('drop policy if exists "Workspace members read items"')));
await db.exec(read('supabase/migrations/20261014043916_workspace_item_identity_guard.sql'));
await db.exec(read('supabase/migrations/20261016150000_workspace_item_visibility.sql'));
await db.exec(read('supabase/migrations/20261107040000_workspace_item_rich_content.sql').replace(/notify pgrst[^;]*;/i, ''));

await db.exec(`create schema realtime; create table realtime.messages(topic text,extension text);
  alter table realtime.messages enable row level security;
  create function realtime.topic() returns text language sql stable as $$select current_setting('request.topic',true)$$;`);
await db.exec(read('supabase/migrations/20261112075718_document_collaboration_state.sql'));

const docId = '99999999-9999-4999-8999-999999999999';
await db.query('insert into businesses(id, public_kebu_id, legal_name, trading_name) values($1,$2,$3,$4)', [business, 'kebu-collab-biz', 'Collab Biz', 'Collab Biz']);
for (const uid of [userA, userB]) {
  await db.query("insert into business_members(business_id,user_id,role,status) values($1,$2,'member','active')", [business, uid]);
  await db.query('insert into user_profiles(id, active_business_id) values($1,$2)', [uid, business]);
}
await db.query("insert into workspace_items(id,owner_id,business_id,kind,title,body) values($1,$2,$3,'doc','Shared design brief','Initial text')", [docId, userA, business]);

async function asUser(uid, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
    return tx.query(sql, params);
  });
}
// A sanity check mirroring verify-work-local-ui.mjs's own: the stranger must
// not see this business-scoped document via RLS, which is exactly what the
// collab-join route and the browser-level "stranger denied" test below rely on.
assert.equal((await asUser(stranger, 'select id from workspace_items where id=$1', [docId])).rows.length, 0);
assert.equal((await asUser(userB, 'select id from workspace_items where id=$1', [docId])).rows.length, 1);

const workspaceItemColumns = new Set(['id', 'owner_id', 'business_id', 'room_id', 'kind', 'title', 'body', 'rich_content', 'collab_state', 'collab_epoch', 'collab_write_id', 'status', 'due_at', 'start_at', 'end_at', 'visibility', 'created_at', 'updated_at']);
let queries = 0, totalQueries = 0;
function identity(req) {
  try {
    const raw = (req.headers.authorization ?? '').split(' ')[1];
    const id = JSON.parse(Buffer.from(raw.split('.')[1], 'base64url').toString()).sub;
    return [userA, userB, stranger].includes(id) ? id : null;
  } catch { return null; }
}
async function payload(req) { let body = ''; for await (const bytes of req) body += bytes; return body ? JSON.parse(body) : {}; }

function parseFilters(searchParams, allowedColumns) {
  const values = [], clauses = [];
  for (const [key, value] of searchParams) {
    if (key === 'select' || key === 'order' || key === 'limit') continue;
    if (!allowedColumns.has(key)) continue;
    if (value.startsWith('eq.')) { values.push(value.slice(3)); clauses.push(`"${key}"=$${values.length}`); }
    else if (value.startsWith('neq.')) { values.push(value.slice(4)); clauses.push(`"${key}"<>$${values.length}`); }
    else if (value === 'is.null') { clauses.push(`"${key}" is null`); }
    else if (value.startsWith('in.(') && value.endsWith(')')) {
      const items = value.slice(4, -1).split(',').filter(Boolean);
      const placeholders = items.map((item) => { values.push(item); return '$' + values.length; });
      clauses.push(`"${key}" in (${placeholders.join(',')})`);
    } else throw Error('Unsupported fixture filter: ' + value);
  }
  return { values, where: clauses.length ? ' where ' + clauses.join(' and ') : '' };
}

const backend = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:38434');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,x-client-info,content-type');
  res.setHeader('Content-Type', 'application/json');
  const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:38435');
  try {
    if (url.pathname === '/__qa/state' && req.method === 'GET') {
      const result = await db.query('select row_to_json(w) as row from workspace_items w order by created_at');
      send(200, { items: result.rows.map((x) => x.row), queries });
      return;
    }
    const uid = identity(req);
    if (url.pathname.startsWith('/auth/')) {
      if (!uid) { send(401, { message: 'Fixture session missing' }); return; }
      send(200, { id: uid, email: `${uid === userA ? 'alice' : uid === userB ? 'bob' : 'stranger'}@example.test`, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-14T12:00:00Z' });
      return;
    }
    if (!url.pathname.startsWith('/rest/v1/')) { send(404, { error: 'Fixture endpoint missing' }); return; }
    const table = url.pathname.slice('/rest/v1/'.length);
    if (!uid) { send(401, { code: '42501', message: 'No fixture identity' }); return; }

    if (table === 'business_members') {
      const { values, where } = parseFilters(url.searchParams, new Set(['user_id', 'status', 'business_id']));
      const result = await db.query(`select row_to_json(b) as row from business_members b${where}`, values);
      send(200, result.rows.map((x) => x.row));
      return;
    }
    if (table === 'businesses') {
      const { values, where } = parseFilters(url.searchParams, new Set(['id', 'lifecycle_status']));
      const result = await db.query(`select row_to_json(b) as row from businesses b${where}`, values);
      send(200, result.rows.map((x) => x.row));
      return;
    }
    if (table === 'user_profiles') {
      const { values, where } = parseFilters(url.searchParams, new Set(['id']));
      if (req.method === 'PATCH') {
        const row = await payload(req);
        const result = await db.query(`update user_profiles set active_business_id=$1, updated_at=now()${where}`.replace('$1', '$' + (values.length + 1)), [...values, row.active_business_id ?? null]);
        send(200, result.rows);
        return;
      }
      const result = await db.query(`select row_to_json(u) as row from user_profiles u${where}`, values);
      send(200, result.rows.map((x) => x.row));
      return;
    }
    if (table !== 'workspace_items') { send(200, []); return; }

    const { values, where } = parseFilters(url.searchParams, workspaceItemColumns);
    const raw = ['POST', 'PATCH'].includes(req.method) ? await payload(req) : {};
    const row = Array.isArray(raw) ? raw[0] : raw;
    const bindValue = (key, value) => (key === 'rich_content' && value !== null ? JSON.stringify(value) : value);
    const castSuffix = (key) => (key === 'rich_content' ? '::jsonb' : '');
    let sql;
    if (req.method === 'GET') sql = `select row_to_json(w) as row from workspace_items w${where} order by updated_at desc limit 200`;
    else if (req.method === 'POST') {
      const keys = Object.keys(row);
      if (!keys.length || keys.some((key) => !workspaceItemColumns.has(key))) throw Error('Invalid fixture columns');
      const vals = keys.map((key) => { values.push(bindValue(key, row[key])); return '$' + values.length + castSuffix(key); });
      sql = `insert into workspace_items(${keys.map((key) => '"' + key + '"').join(',')}) values(${vals.join(',')}) returning row_to_json(workspace_items) as row`;
    } else if (req.method === 'PATCH') {
      const keys = Object.keys(row);
      if (!keys.length || keys.some((key) => !workspaceItemColumns.has(key))) throw Error('Invalid fixture columns');
      const patch = keys.map((key) => { values.push(bindValue(key, row[key])); return `"${key}"=$${values.length}${castSuffix(key)}`; });
      sql = `update workspace_items set ${patch.join(',')}${where} returning row_to_json(workspace_items) as row`;
    } else if (req.method === 'DELETE') sql = `delete from workspace_items${where} returning row_to_json(workspace_items) as row`;
    else { send(405, { error: 'Unsupported fixture method' }); return; }

    const result = await db.transaction(async (tx) => {
      await tx.exec('set local role authenticated');
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
      return tx.query(sql, values);
    });
    queries++; totalQueries++;
    const rows = result.rows.map((x) => x.row);
    send(req.method === 'POST' ? 201 : 200, rows);
  } catch (cause) {
    send(cause.code === '23505' ? 409 : 400, { code: cause.code ?? 'fixture_error', message: cause.message });
  }
});
await new Promise((done) => backend.listen(38435, '127.0.0.1', done));

const temp = mkdtempSync(join(tmpdir(), 'kebu-docs-collab-config-')), config = join(temp, 'playwright.config.mjs');
writeFileSync(config, `import{defineConfig}from${JSON.stringify(join(root, 'node_modules/playwright/test.mjs'))};export default defineConfig({testDir:${JSON.stringify(join(root, 'tests/platform'))},testMatch:'work-documents-collab.local.spec.ts',workers:1,retries:0,maxFailures:1,timeout:60000,reporter:[['list'],['json',{outputFile:${JSON.stringify(join(output, 'results.json'))}}]],outputDir:${JSON.stringify(join(output, 'traces'))},use:{actionTimeout:25000,baseURL:'http://127.0.0.1:38434',viewport:{width:1440,height:1000},launchOptions:{executablePath:${JSON.stringify(chromium)},args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']}}});`);
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:38435', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-local-fixture', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', SUPABASE_SECRET_KEY: '', SUPABASE_URL: '', DATABASE_URL: '', ANTHROPIC_API_KEY: '', VERCEL_ENV: '', KEBU_DOCS_COLLAB_USER_A: userA, KEBU_DOCS_COLLAB_USER_B: userB, KEBU_DOCS_COLLAB_STRANGER: stranger, KEBU_DOCS_COLLAB_DOC_ID: docId };
rmSync(join(root, '.next/dev'), { recursive: true, force: true });
async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((done) => {
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    child.once('close', () => { clearTimeout(timer); done(); }); child.kill();
  });
}
let server, tests;
try {
  const log = createWriteStream(join(output, 'server.log'));
  server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '38434'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.pipe(log); server.stderr.pipe(log);
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(Error('Startup timeout')), 30000);
    server.stdout.on('data', (bytes) => { if (bytes.toString().includes('Ready')) { clearTimeout(timer); done(); } });
    server.on('exit', (code) => fail(Error('Server exit ' + code)));
  });
  tests = spawn(process.execPath, [join(root, 'node_modules/playwright/cli.js'), 'test', '--config', config], { cwd: root, env, stdio: 'inherit' });
  const code = await new Promise((done) => tests.on('exit', done));
  const report = JSON.parse(readFileSync(join(output, 'results.json'), 'utf8'));
  const receipt = { ...report.stats, sqlQueries: totalQueries, sqlAssertions: 2 };
  writeFileSync(join(output, 'verification.json'), JSON.stringify(receipt, null, 2));
  console.log('DOCS_COLLAB_UI_RESULT', JSON.stringify(receipt));
  if (code !== 0 || report.stats.unexpected || report.stats.expected < 3 || report.stats.skipped) throw Error('Docs collaboration browser gate failed');
} finally {
  await stopChild(tests); await stopChild(server); await new Promise((done) => backend.close(done)); await db.close(); rmSync(temp, { recursive: true, force: true });
}
