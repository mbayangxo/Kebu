/** Real Slides UI -> Next API -> supabase-js -> isolated SQL/RLS. Loopback Auth/REST fixture only. */
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

const owner = '33333333-3333-4333-8333-333333333333', other = '44444444-4444-4444-8444-444444444444';
const output = process.env.KEBU_SLIDES_UI_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), 'kebu-slides-ui-'));
mkdirSync(output, { recursive: true });
const read = path => readFileSync(join(root, path), 'utf8');

await db.exec(`
  create extension if not exists pgcrypto;
  create schema auth;
  create table auth.users(id uuid primary key, email text, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create or replace function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at = now(); return new; end$$;
  do $$begin
    if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
    if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
    if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
  end$$;
  alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
  grant usage on schema public, auth to authenticated, anon, service_role;
  grant execute on all functions in schema auth to authenticated, anon, service_role;
  insert into auth.users(id) values ('${owner}'), ('${other}');
`);
// The real migrations, verbatim.
await db.exec(read('supabase/migrations/20261016120000_library_sharing.sql'));
await db.exec(read('supabase/migrations/20261108010000_slide_bodies.sql'));
await db.exec(read('supabase/migrations/20261107010000_sheet_bodies.sql'));
await db.exec(read('supabase/migrations/20261112075207_editor_revision_guards.sql'));

const TABLES = {
  library_nodes: {
    columns: ['id', 'owner_id', 'parent_id', 'kind', 'title', 'storage_path', 'mime_type', 'byte_size', 'source_kind', 'source_id', 'metadata', 'starred', 'trashed_at', 'created_at', 'updated_at'],
    jsonb: new Set(['metadata']),
    orderBy: 'created_at',
  },
  slide_bodies: {
    columns: ['id', 'slides', 'width', 'height', 'updated_at'],
    jsonb: new Set(['slides']),
    orderBy: 'updated_at',
  },
};

function identity(req) {
  try {
    const raw = (req.headers.authorization ?? '').split(' ')[1];
    const id = JSON.parse(Buffer.from(raw.split('.')[1], 'base64url').toString()).sub;
    return [owner, other].includes(id) ? id : null;
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
function bindValue(table, key, value) {
  return TABLES[table].jsonb.has(key) && value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
}

const backend = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:38440');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,x-client-info,content-type,prefer,accept');
  res.setHeader('Content-Type', 'application/json');
  const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:38441');
  try {
    if (url.pathname === '/__qa/reset' && req.method === 'POST') {
      await db.exec('truncate slide_bodies, library_shares, library_nodes cascade');
      send(200, { ok: true }); return;
    }
    if (url.pathname === '/__qa/state') {
      const nodes = await db.query('select row_to_json(w) as row from library_nodes w order by created_at');
      const bodies = await db.query('select row_to_json(w) as row from slide_bodies w order by updated_at');
      send(200, { libraryNodes: nodes.rows.map(x => x.row), slideBodies: bodies.rows.map(x => x.row) }); return;
    }
    const uid = identity(req);
    if (url.pathname.startsWith('/auth/')) {
      if (!uid) { send(401, { message: 'Fixture session missing' }); return; }
      send(200, { id: uid, email: uid === owner ? 'qa@example.test' : 'other@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-14T12:00:00Z' });
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
      else throw Error('Unsupported fixture filter');
    }
    const where = clauses.length ? ' where ' + clauses.join(' and ') : '';
    const raw = ['POST', 'PATCH'].includes(req.method) ? await payload(req) : {};
    const row = Array.isArray(raw) ? raw[0] : raw;
    const prefer = req.headers.prefer ?? '';
    const isUpsert = req.method === 'POST' && prefer.includes('resolution=merge-duplicates');

    let sql;
    if (req.method === 'GET') {
      sql = `select row_to_json(w) as row from ${table} w${where} order by ${spec.orderBy}`;
    } else if (isUpsert) {
      const onConflict = url.searchParams.get('on_conflict') ?? 'id';
      const keys = Object.keys(row);
      if (!keys.length || keys.some(key => !spec.columns.includes(key))) throw Error('Invalid fixture columns');
      const vals = keys.map(key => { values.push(bindValue(table, key, row[key])); return '$' + values.length; });
      const updateSet = keys.filter(key => key !== onConflict).map(key => `"${key}"=excluded."${key}"`).join(',');
      sql = `insert into ${table}(${keys.map(key => '"' + key + '"').join(',')}) values(${vals.join(',')}) on conflict (${onConflict}) do update set ${updateSet || `"${onConflict}"=excluded."${onConflict}"`} returning row_to_json(${table}) as row`;
    } else if (req.method === 'POST') {
      const keys = Object.keys(row);
      if (!keys.length || keys.some(key => !spec.columns.includes(key))) throw Error('Invalid fixture columns');
      const vals = keys.map(key => { values.push(bindValue(table, key, row[key])); return '$' + values.length; });
      sql = `insert into ${table}(${keys.map(key => '"' + key + '"').join(',')}) values(${vals.join(',')}) returning row_to_json(${table}) as row`;
    } else if (req.method === 'PATCH') {
      const keys = Object.keys(row);
      if (!keys.length || keys.some(key => !spec.columns.includes(key))) throw Error('Invalid fixture columns');
      const patch = keys.map(key => { values.push(bindValue(table, key, row[key])); return `"${key}"=$${values.length}`; });
      sql = `update ${table} set ${patch.join(',')}${where} returning row_to_json(${table}) as row`;
    } else if (req.method === 'DELETE') {
      sql = `delete from ${table}${where} returning row_to_json(${table}) as row`;
    } else { send(405, { error: 'Unsupported fixture method' }); return; }

    const result = await asUser(uid, sql, values);
    const rows = result.rows.map(x => x.row);
    if ((req.headers.accept ?? '').includes('object+json')) {
      if (rows.length !== 1) { send(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows` }); return; }
      send(200, rows[0]); return;
    }
    send(req.method === 'POST' ? 201 : 200, rows);
  } catch (cause) {
    send(cause.code === '23505' ? 409 : 400, { code: cause.code ?? 'fixture_error', message: cause.message });
  }
});
await new Promise(done => backend.listen(38441, '127.0.0.1', done));

const temp = mkdtempSync(join(tmpdir(), 'kebu-slides-config-')), config = join(temp, 'playwright.config.mjs');
writeFileSync(config, `import{defineConfig}from${JSON.stringify(join(root, 'node_modules/playwright/test.mjs'))};export default defineConfig({testDir:${JSON.stringify(join(root, 'tests/platform'))},testMatch:'slides-editor.local.spec.ts',workers:1,retries:0,maxFailures:1,timeout:60000,reporter:[['list'],['json',{outputFile:${JSON.stringify(join(output, 'results.json'))}}]],outputDir:${JSON.stringify(join(output, 'traces'))},use:{actionTimeout:10000,baseURL:'http://127.0.0.1:38440',viewport:{width:1440,height:1000},launchOptions:{executablePath:${JSON.stringify(chromium)},args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']}}});`);
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:38441', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-local-fixture', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', SUPABASE_SECRET_KEY: '', SUPABASE_URL: '', DATABASE_URL: '', ANTHROPIC_API_KEY: '', VERCEL_ENV: '' };
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
  server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '38440'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
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
  console.log('SLIDES_UI_RESULT', JSON.stringify(receipt));
  if (code !== 0 || report.stats.unexpected || report.stats.expected < 3 || report.stats.skipped) throw Error('Slides browser gate failed');
} finally {
  await stopChild(tests); await stopChild(server);
  await new Promise(done => backend.close(done));
  await db.close();
  rmSync(temp, { recursive: true, force: true });
}
