/** Real Account control-center UI -> Next API -> supabase-js -> isolated SQL/RLS. Loopback Auth/REST fixture only. */
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
const { pgcrypto } = await import(pathToFileURL(join(dirname(modulePath), 'contrib/pgcrypto.js')).href);
const db = new PGlite({ extensions: { pgcrypto } });

const verifiedUser = '11111111-1111-4111-8111-111111111111'; // verified indigenous African ID
const visitorUser = '22222222-2222-4222-8222-222222222222'; // verified but visitor -- never earns access

const output = process.env.KEBU_ACCOUNT_UI_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), 'kebu-account-ui-'));
mkdirSync(output, { recursive: true });

// Table shapes verbatim from supabase/migrations_archive/legacy/027_afrique_id.sql
// (+ 037_african_id_aid_types.sql's identity_type column) and
// supabase/migrations_archive/legacy/062_account_entitlements.sql, trimmed to
// the columns this feature's code actually reads/writes.
await db.exec(`
  create extension if not exists pgcrypto;
  create schema auth;
  create table auth.users(id uuid primary key, email text, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create role authenticated; create role anon; create role service_role bypassrls;
  alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
  grant usage on schema public, auth to authenticated, anon, service_role;
  grant execute on all functions in schema auth to authenticated, anon, service_role;

  create table public.afrique_ids(
    user_id uuid primary key references auth.users(id) on delete cascade,
    public_afrique_id text not null unique,
    country_code char(2) not null,
    identity_type text not null default 'visitor' check (identity_type in ('indigenous','visitor')),
    eligibility_status text not null default 'unverified' check (eligibility_status in ('unverified','pending','verified','rejected','expired','suspended','manual_review')),
    verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  );

  create table public.account_entitlements(
    user_id uuid not null references auth.users(id) on delete cascade,
    entitlement_key text not null,
    status text not null default 'none' check (status in ('none','pending','verified','revoked')),
    source text, granted_at timestamptz, revoked_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    primary key (user_id, entitlement_key)
  );

  -- /api/me/profile's own first query, unrelated to this feature -- declared
  -- here (deliberately unseeded) only so AccountPage's unconditional profile
  -- fetch resolves to a clean "no row" rather than tripping over an
  -- undeclared-table fixture edge case while this test loads /account.
  create table public.user_profiles(
    id uuid primary key references auth.users(id),
    name text, email text, avatar_url text, residence_country text, business_stage text, onboarding_complete boolean
  );

  insert into auth.users(id) values ('${verifiedUser}'),('${visitorUser}');
  insert into public.afrique_ids(user_id, public_afrique_id, country_code, identity_type, eligibility_status, verified_at)
  values
    ('${verifiedUser}', 'AID-SN-01-000001', 'SN', 'indigenous', 'verified', now()),
    ('${visitorUser}', 'AID-SN-01-000002', 'SN', 'visitor', 'verified', now());
`);

const TABLES = {
  afrique_ids: { columns: ['user_id', 'public_afrique_id', 'country_code', 'identity_type', 'eligibility_status', 'verified_at'], json: new Set() },
  account_entitlements: { columns: ['user_id', 'entitlement_key', 'status', 'source', 'granted_at', 'revoked_at'], json: new Set() },
  user_profiles: { columns: ['id'], json: new Set() },
};

const ALL_IDS = [verifiedUser, visitorUser];
const serviceRoleKey = 'fixture-service-role-key';

function identity(req) {
  const raw = (req.headers.authorization ?? '').split(' ')[1];
  if (raw === serviceRoleKey) return 'SERVICE';
  try {
    const id = JSON.parse(Buffer.from(raw.split('.')[1], 'base64url').toString()).sub;
    return ALL_IDS.includes(id) ? id : null;
  } catch { return null; }
}
async function payload(req) { let body = ''; for await (const bytes of req) body += bytes; return body ? JSON.parse(body) : {}; }
async function runAs(uid, fn) {
  return db.transaction(async (tx) => {
    if (uid === 'SERVICE') { await tx.exec('set local role service_role'); }
    else { await tx.exec('set local role authenticated'); await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]); }
    return fn(tx);
  });
}

let totalQueries = 0;
const backend = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:38460');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,x-client-info,content-type,accept,prefer');
  res.setHeader('Content-Type', 'application/json');
  const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:38461');
  try {
    if (url.pathname === '/__qa/reset' && req.method === 'POST') {
      await db.exec(`
        delete from public.account_entitlements;
        update public.afrique_ids set eligibility_status='verified', identity_type='indigenous' where user_id='${verifiedUser}';
      `);
      totalQueries = 0; send(200, { ok: true }); return;
    }
    if (url.pathname === '/__qa/state') {
      const entitlements = await db.query('select row_to_json(e) as row from account_entitlements e order by entitlement_key');
      send(200, { entitlements: entitlements.rows.map((x) => x.row), queries: totalQueries });
      return;
    }

    const uid = identity(req);
    if (url.pathname.startsWith('/auth/')) {
      if (!uid || uid === 'SERVICE') { send(401, { message: 'Fixture session missing' }); return; }
      send(200, { id: uid, email: uid + '@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-27T12:00:00Z' });
      return;
    }
    if (!url.pathname.startsWith('/rest/v1/')) { send(404, { error: 'Fixture endpoint missing' }); return; }
    const table = url.pathname.slice('/rest/v1/'.length);
    const spec = TABLES[table];
    if (!spec) { send(200, []); return; }
    if (!uid) { send(401, { code: '42501', message: 'No fixture identity' }); return; }

    const values = [], clauses = [];
    let orderClause = '', limitClause = '';
    for (const [key, raw] of url.searchParams) {
      if (key === 'order') { const [col, dir] = raw.split('.'); if (spec.columns.includes(col)) orderClause = ` order by "${col}" ${dir === 'desc' ? 'desc' : 'asc'}`; continue; }
      if (key === 'limit') { limitClause = ` limit ${Math.min(parseInt(raw, 10) || 200, 500)}`; continue; }
      if (key === 'select') continue;
      if (!spec.columns.includes(key)) continue;
      if (raw.startsWith('eq.')) { values.push(raw.slice(3)); clauses.push(`"${key}"=$${values.length}`); }
      else if (raw === 'is.null') clauses.push(`"${key}" is null`);
      else throw Error('Unsupported fixture filter: ' + raw);
    }
    const where = clauses.length ? ' where ' + clauses.join(' and ') : '';
    const rawBody = ['POST', 'PATCH', 'DELETE'].includes(req.method) ? await payload(req).catch(() => ({})) : {};
    const rowsIn = Array.isArray(rawBody) ? rawBody : [rawBody];

    let sql;
    if (req.method === 'GET') {
      sql = `select row_to_json(w) as row from ${table} w${where}${orderClause}${limitClause || ' limit 200'}`;
    } else if (req.method === 'POST') {
      const row = rowsIn[0];
      const keys = Object.keys(row).filter((key) => spec.columns.includes(key));
      if (!keys.length) throw Error('Invalid fixture columns for ' + table);
      const vals = keys.map((key) => { values.push(row[key]); return '$' + values.length; });
      if (table === 'account_entitlements') {
        // supabase-js .upsert({onConflict:'user_id,entitlement_key'}) -- emulate
        // as insert-or-update on the real composite primary key.
        const patch = keys.filter((key) => key !== 'user_id' && key !== 'entitlement_key').map((key) => `"${key}"=excluded."${key}"`);
        sql = `insert into ${table}(${keys.map((key) => '"' + key + '"').join(',')}) values(${vals.join(',')})
          on conflict (user_id, entitlement_key) do update set ${patch.length ? patch.join(',') : 'user_id=excluded.user_id'}
          returning row_to_json(${table}) as row`;
      } else {
        sql = `insert into ${table}(${keys.map((key) => '"' + key + '"').join(',')}) values(${vals.join(',')}) on conflict do nothing returning row_to_json(${table}) as row`;
      }
    } else if (req.method === 'PATCH') {
      const row = rowsIn[0];
      const keys = Object.keys(row).filter((key) => spec.columns.includes(key));
      if (!keys.length) throw Error('Invalid fixture columns for ' + table);
      const patch = keys.map((key) => { values.push(row[key]); return `"${key}"=$${values.length}`; });
      sql = `update ${table} set ${patch.join(',')}${where} returning row_to_json(${table}) as row`;
    } else if (req.method === 'DELETE') {
      sql = `delete from ${table}${where} returning row_to_json(${table}) as row`;
    } else { send(405, { error: 'Unsupported fixture method' }); return; }

    const result = await runAs(uid, (tx) => tx.query(sql, values));
    totalQueries++;
    const rows = result.rows.map((x) => x.row);
    if ((req.headers.accept ?? '').includes('object+json')) {
      if (rows.length !== 1) { send(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows` }); return; }
      send(200, rows[0]); return;
    }
    send(req.method === 'POST' ? 201 : 200, rows);
  } catch (cause) {
    send(cause.code === '23505' ? 409 : cause.code === '42501' ? 403 : 400, { code: cause.code ?? 'fixture_error', message: cause.message });
  }
});
await new Promise((done) => backend.listen(38461, '127.0.0.1', done));

const temp = mkdtempSync(join(tmpdir(), 'kebu-account-config-')), config = join(temp, 'playwright.config.mjs');
writeFileSync(config, `import{defineConfig}from${JSON.stringify(join(root, 'node_modules/playwright/test.mjs'))};export default defineConfig({testDir:${JSON.stringify(join(root, 'tests/platform'))},testMatch:'account-entitlements.local.spec.ts',workers:1,retries:0,maxFailures:1,timeout:60000,reporter:[['list'],['json',{outputFile:${JSON.stringify(join(output, 'results.json'))}}]],outputDir:${JSON.stringify(join(output, 'traces'))},use:{actionTimeout:10000,baseURL:'http://127.0.0.1:38460',viewport:{width:1440,height:1000},launchOptions:{executablePath:${JSON.stringify(chromium)},args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']}}});`);
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:38461',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-local-fixture',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  SUPABASE_SECRET_KEY: '',
  SUPABASE_URL: '',
  DATABASE_URL: '',
  ANTHROPIC_API_KEY: '',
  VERCEL_ENV: '',
};
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
  server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '38460'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.pipe(log); server.stderr.pipe(log);
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(Error('Startup timeout')), 30000);
    server.stdout.on('data', (bytes) => { if (bytes.toString().includes('Ready')) { clearTimeout(timer); done(); } });
    server.on('exit', (code) => fail(Error('Server exit ' + code)));
  });
  tests = spawn(process.execPath, [join(root, 'node_modules/playwright/cli.js'), 'test', '--config', config], { cwd: root, env, stdio: 'inherit' });
  const code = await new Promise((done) => tests.on('exit', done));
  const report = JSON.parse(readFileSync(join(output, 'results.json'), 'utf8'));
  const receipt = { ...report.stats, sqlQueries: totalQueries };
  writeFileSync(join(output, 'verification.json'), JSON.stringify(receipt, null, 2));
  console.log('ACCOUNT_ENTITLEMENTS_UI_RESULT', JSON.stringify(receipt));
  if (code !== 0 || report.stats.unexpected || report.stats.skipped) throw Error('Account entitlements browser gate failed');
} finally {
  await stopChild(tests); await stopChild(server); await new Promise((done) => backend.close(done)); await db.close(); rmSync(temp, { recursive: true, force: true });
}
