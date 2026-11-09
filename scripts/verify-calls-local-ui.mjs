/** Real Calls UI -> Next API -> supabase-js -> isolated SQL/RLS, with a fixture
 * Realtime transport (see tests/platform/calls-editor.local.spec.ts). Loopback
 * Auth/REST/RPC fixture only — no hosted Supabase, no real STUN/TURN relay. */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, createWriteStream, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const chromium = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH, modulePath = process.env.KEBU_PGLITE_MODULE_PATH;
if (!chromium || !modulePath) throw Error('Set local Chromium and PGlite module paths. No hosted fallback.');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const { pgcrypto } = await import(pathToFileURL(resolve(dirname(modulePath), 'contrib/pgcrypto.js')).href);
const db = new PGlite({ extensions: { pgcrypto } });

const host = '33333333-3333-4333-8333-333333333333', guest = '44444444-4444-4444-8444-444444444444';
const roomId = '55555555-5555-4555-8555-555555555555';
const output = process.env.KEBU_CALLS_UI_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), 'kebu-calls-ui-'));
mkdirSync(output, { recursive: true });
const read = path => readFileSync(join(root, path), 'utf8');

await db.exec(`
  create extension if not exists pgcrypto;
  create schema auth;
  create table auth.users(id uuid primary key, email text, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  do $$begin
    if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
    if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
    if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
  end$$;
  grant usage on schema public, auth to authenticated, anon, service_role;
  grant execute on all functions in schema auth to authenticated, anon, service_role;
  create table public.businesses(id uuid primary key);
  create table public.business_members(business_id uuid, user_id uuid, status text);
  grant select on public.business_members to authenticated, anon, service_role;
  insert into auth.users(id) values ('${host}'), ('${guest}');
`);
// The real rooms migration, verbatim, minus workspace_items/space_channels/space_messages
// policies this fixture doesn't model (same trim used in tests/rooms/private-call-access.local.test.ts).
const roomsMigration = read('supabase/migrations/20260920085000_kebu_rooms.sql')
  .split(';').filter((stmt) => !/workspace_items|space_channels|space_messages/.test(stmt)).join(';');
await db.exec(roomsMigration);
await db.exec(`
  grant select on public.rooms, public.room_members to authenticated, anon, service_role;
  insert into public.rooms(id, created_by, name, room_type) values ('${roomId}', '${host}', 'Test room', 'project');
  insert into public.room_members(room_id, user_id, role) values ('${roomId}', '${guest}', 'member');
`);
// The real room-calls migration, verbatim.
await db.exec(read('supabase/migrations/20261108020000_room_calls_mesh.sql'));

const TABLES = {
  room_calls: { columns: ['id', 'room_id', 'started_by', 'started_at', 'ended_at', 'max_participants'], jsonb: new Set(), orderBy: 'started_at' },
  room_call_participants: { columns: ['id', 'call_id', 'user_id', 'joined_at', 'left_at'], jsonb: new Set(), orderBy: 'joined_at' },
};
const RPCS = { room_call_join: ['p_room'], room_call_leave: ['p_call'], room_call_end: ['p_call'] };

function identity(req) {
  try {
    const raw = (req.headers.authorization ?? '').split(' ')[1];
    const id = JSON.parse(Buffer.from(raw.split('.')[1], 'base64url').toString()).sub;
    return [host, guest].includes(id) ? id : null;
  } catch { return null; }
}
async function payload(req) { let body = ''; for await (const bytes of req) body += bytes; return body ? JSON.parse(body) : {}; }
async function asUser(uid, sql, params = []) {
  return db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
    return tx.query(sql, params);
  });
}

const backend = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:38460');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,x-client-info,content-type,prefer,accept');
  res.setHeader('Content-Type', 'application/json');
  const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:38461');
  try {
    if (url.pathname === '/__qa/reset' && req.method === 'POST') {
      await db.exec('truncate room_call_participants, room_calls cascade');
      send(200, { ok: true }); return;
    }
    const uid = identity(req);
    if (url.pathname.startsWith('/auth/')) {
      if (!uid) { send(401, { message: 'Fixture session missing' }); return; }
      send(200, { id: uid, email: uid === host ? 'host@example.test' : 'guest@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-11-08T12:00:00Z' });
      return;
    }
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const fn = url.pathname.slice('/rest/v1/rpc/'.length);
      const argNames = RPCS[fn];
      if (!argNames) { send(404, { message: 'Unknown fixture RPC' }); return; }
      if (!uid) { send(401, { code: '42501', message: 'No fixture identity' }); return; }
      const body = await payload(req);
      const args = argNames.map((name) => body[name] ?? null);
      const placeholders = args.map((_, i) => `$${i + 1}`).join(',');
      const result = await asUser(uid, `select public.${fn}(${placeholders}) as value`, args);
      send(200, result.rows[0]?.value ?? null);
      return;
    }
    if (!url.pathname.startsWith('/rest/v1/')) { send(404, { error: 'Fixture endpoint missing' }); return; }
    const table = url.pathname.slice('/rest/v1/'.length);
    const spec = TABLES[table];
    if (!spec) { send(200, []); return; }
    if (!uid) { send(401, { code: '42501', message: 'No fixture identity' }); return; }

    const values = [], clauses = [];
    for (const [key, value] of url.searchParams) {
      if (!spec.columns.includes(key)) continue;
      if (value.startsWith('eq.')) { values.push(value.slice(3)); clauses.push(`"${key}"=$${values.length}`); }
      else if (value === 'is.null') { clauses.push(`"${key}" is null`); }
      else if (value.startsWith('in.(') && value.endsWith(')')) {
        const items = value.slice(4, -1).split(',').filter(Boolean);
        if (!items.length) { clauses.push('false'); continue; }
        const placeholders = items.map((item) => { values.push(item); return `$${values.length}`; });
        clauses.push(`"${key}" in (${placeholders.join(',')})`);
      } else throw Error('Unsupported fixture filter');
    }
    const where = clauses.length ? ' where ' + clauses.join(' and ') : '';
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? ` limit ${Number(limitParam)}` : '';

    if (req.method !== 'GET') { send(405, { error: 'This fixture table is read-only; writes go through the RPCs.' }); return; }
    const sql = `select row_to_json(w) as row from ${table} w${where} order by ${spec.orderBy} desc${limit}`;
    const result = await asUser(uid, sql, values);
    send(200, result.rows.map(x => x.row));
  } catch (cause) {
    send(cause.code === '23505' ? 409 : 400, { code: cause.code ?? 'fixture_error', message: cause.message });
  }
});
await new Promise(done => backend.listen(38461, '127.0.0.1', done));

const temp = mkdtempSync(join(tmpdir(), 'kebu-calls-config-')), config = join(temp, 'playwright.config.mjs');
writeFileSync(config, `import{defineConfig}from${JSON.stringify(join(root, 'node_modules/playwright/test.mjs'))};export default defineConfig({testDir:${JSON.stringify(join(root, 'tests/platform'))},testMatch:'calls-editor.local.spec.ts',workers:1,retries:0,maxFailures:1,timeout:60000,reporter:[['list'],['json',{outputFile:${JSON.stringify(join(output, 'results.json'))}}]],outputDir:${JSON.stringify(join(output, 'traces'))},use:{actionTimeout:10000,baseURL:'http://127.0.0.1:38460',viewport:{width:1280,height:900},screenshot:'only-on-failure',launchOptions:{executablePath:${JSON.stringify(chromium)},args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--auto-select-desktop-capture-source=Entire screen']}}});`);
const env = {
  ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:38461', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-local-fixture',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', SUPABASE_SECRET_KEY: '', SUPABASE_URL: '', DATABASE_URL: '', ANTHROPIC_API_KEY: '', VERCEL_ENV: '',
  KEBU_CALLS_HOST_ID: host, KEBU_CALLS_GUEST_ID: guest, KEBU_CALLS_ROOM_ID: roomId,
};
rmSync(join(root, '.next/dev'), { recursive: true, force: true });

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(done => {
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    child.once('close', () => { clearTimeout(timer); done(); });
    child.kill();
  });
}

let server, tests;
try {
  const log = createWriteStream(join(output, 'server.log'));
  server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '38460'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.pipe(log); server.stderr.pipe(log);
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(Error('Startup timeout')), 60000);
    server.stdout.on('data', bytes => { if (bytes.toString().includes('Ready')) { clearTimeout(timer); done(); } });
    server.on('exit', code => fail(Error('Server exit ' + code)));
  });
  tests = spawn(process.execPath, [join(root, 'node_modules/playwright/cli.js'), 'test', '--config', config], { cwd: root, env, stdio: 'inherit' });
  const code = await new Promise(done => tests.on('exit', done));
  const report = JSON.parse(readFileSync(join(output, 'results.json'), 'utf8'));
  const receipt = { ...report.stats };
  writeFileSync(join(output, 'verification.json'), JSON.stringify(receipt, null, 2));
  console.log('CALLS_UI_RESULT', JSON.stringify(receipt));
  if (code !== 0 || report.stats.unexpected || report.stats.skipped) throw Error('Calls browser gate failed');
} finally {
  await stopChild(tests); await stopChild(server);
  await new Promise(done => backend.close(done));
  await db.close();
  rmSync(temp, { recursive: true, force: true });
}
