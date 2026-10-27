/** Real claim-existing-company UI -> Next API -> supabase-js -> isolated SQL/RLS + fake storage. Loopback fixture only. */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, createWriteStream, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// This script runs from a git worktree with no node_modules of its own;
// Node's own ancestor-directory module resolution (the same mechanism that
// already makes plain `npx tsc`/`npx vitest` work here) finds the real
// installs in the main checkout -- resolve the two binaries this script
// spawns the same way, instead of assuming they live under `root`.
const req = createRequire(import.meta.url);
// req.resolve() on a specific subpath like 'playwright/cli.js' is blocked by
// that package's "exports" map; resolving the package root (always exported)
// and joining the real subpath as a plain filesystem path sidesteps that --
// it's not asking Node's resolver to resolve the subpath, just building a
// literal path string to hand directly to spawn().
const nextBin = join(dirname(req.resolve('next/package.json')), 'dist/bin/next');
const playwrightCli = join(dirname(req.resolve('playwright/package.json')), 'cli.js');
const playwrightTestEntry = join(dirname(req.resolve('playwright/package.json')), 'test.mjs');
const chromium = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH, modulePath = process.env.KEBU_PGLITE_MODULE_PATH;
if (!chromium || !modulePath) throw Error('Set local Chromium and PGlite module paths. No hosted fallback.');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const { pgcrypto } = await import(pathToFileURL(join(dirname(modulePath), 'contrib/pgcrypto.js')).href);
const db = new PGlite({ extensions: { pgcrypto } });

const claimant = '11111111-1111-4111-8111-111111111111';
const owner = '22222222-2222-4222-8222-222222222222'; // founder of the already-owned business
const adminUser = '33333333-3333-4333-8333-333333333333';

const output = process.env.KEBU_BUSINESS_CLAIMS_UI_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), 'kebu-claims-ui-'));
mkdirSync(output, { recursive: true });

// businesses/business_members shapes are archived-only (never in the
// canonical supabase/migrations/ chain -- see
// tests/business/business-members-select-policy.local.test.ts's own note);
// reconstructed verbatim from supabase/migrations_archive/legacy/
// 005_kebu_id_draft_business.sql, trimmed to the columns this feature
// reads/writes. The real migration file for business_claims itself is
// applied verbatim below, not reconstructed.
await db.exec(`
  create extension if not exists pgcrypto;
  create schema auth;
  create table auth.users(id uuid primary key, email text, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create role authenticated; create role anon; create role service_role bypassrls;
  alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
  grant usage on schema public, auth to authenticated, anon, service_role;
  grant execute on all functions in schema auth to authenticated, anon, service_role;

  create or replace function public.set_updated_at() returns trigger language plpgsql as $$
  begin new.updated_at = now(); return new; end; $$;

  create table public.businesses (
    id uuid primary key default gen_random_uuid(),
    legal_name text not null,
    trading_name text,
    public_kebu_id text not null default 'KEBU-SN-01-TEST01',
    country_code text not null default 'SN',
    category text not null default 'retail',
    created_by uuid not null references auth.users(id) on delete restrict
  );

  create table public.business_members (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null,
    status text not null default 'active' check (status in ('pending','active','removed')),
    unique (business_id, user_id)
  );

  create table public.business_audit_logs (
    id uuid primary key default gen_random_uuid(),
    business_id uuid, actor_user_id uuid, action text, metadata jsonb, created_at timestamptz default now()
  );

  create table public.privileged_audit_events (
    id uuid primary key default gen_random_uuid(),
    actor_user_id uuid, actor_role text, action text, project_id uuid, support_session_id uuid,
    reason text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz default now()
  );

  create table public.platform_staff_roles (
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null,
    active boolean not null default true,
    primary key (user_id, role)
  );

  create schema storage;
  create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
  $$;
`);
await db.exec(readFileSync(resolve(root, 'supabase/migrations/20261027050000_business_claims.sql'), 'utf8'));

await db.exec(`
  insert into auth.users(id) values ('${claimant}'),('${owner}'),('${adminUser}');
  insert into public.platform_staff_roles(user_id, role, active) values ('${adminUser}', 'admin', true);
`);

const orphaned = await db.query(
  `insert into public.businesses(legal_name, created_by) values ('Orphaned Bakery', '${adminUser}') returning id`,
);
const orphanedId = orphaned.rows[0].id;
const owned = await db.query(
  `insert into public.businesses(legal_name, created_by) values ('Owned Tailors', '${owner}') returning id`,
);
const ownedId = owned.rows[0].id;
await db.exec(
  `insert into public.business_members(business_id, user_id, role, status) values ('${ownedId}', '${owner}', 'founder', 'active');`,
);
const orphaned2 = await db.query(
  `insert into public.businesses(legal_name, created_by) values ('Orphaned Dye House', '${adminUser}') returning id`,
);
const orphaned2Id = orphaned2.rows[0].id;

const TABLES = {
  businesses: { columns: ['id', 'legal_name', 'trading_name', 'public_kebu_id', 'country_code', 'category', 'created_by'] },
  business_members: { columns: ['id', 'business_id', 'user_id', 'role', 'status'] },
  business_claims: {
    columns: [
      'id', 'business_id', 'claimant_user_id', 'note', 'proof_storage_path', 'proof_file_name', 'proof_mime_type',
      'status', 'reviewed_by', 'reviewed_at', 'review_reason', 'created_at',
    ],
  },
  business_audit_logs: { columns: ['id', 'business_id', 'actor_user_id', 'action', 'metadata'] },
  platform_staff_roles: { columns: ['user_id', 'role', 'active'] },
  privileged_audit_events: { columns: ['id', 'actor_user_id', 'actor_role', 'action', 'reason', 'metadata'] },
};

const ALL_IDS = [claimant, owner, adminUser];
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
async function drain(req) { const chunks = []; for await (const c of req) chunks.push(c); return Buffer.concat(chunks); }
async function runAs(uid, fn) {
  return db.transaction(async (tx) => {
    if (uid === 'SERVICE') { await tx.exec('set local role service_role'); }
    else { await tx.exec('set local role authenticated'); await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]); }
    return fn(tx);
  });
}

let totalQueries = 0;
const backend = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:38462');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,x-client-info,content-type,accept,prefer');
  res.setHeader('Content-Type', 'application/json');
  const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:38463');
  try {
    if (url.pathname === '/__qa/state') {
      const claims = await db.query('select row_to_json(c) as row from business_claims c order by created_at');
      const members = await db.query('select row_to_json(m) as row from business_members m order by id');
      send(200, { claims: claims.rows.map((x) => x.row), members: members.rows.map((x) => x.row), queries: totalQueries });
      return;
    }

    const uid = identity(req);

    // Fake storage: no real bytes/RLS behind this (the SQL-level test
    // already proves the real migration's table RLS; this just lets the
    // app's real upload/sign calls complete so the UI flow runs end to end).
    if (url.pathname.startsWith('/storage/v1/object/sign/')) {
      await drain(req);
      send(200, { signedURL: `/fixture-signed${url.pathname.replace('/storage/v1/object/sign', '')}` });
      return;
    }
    if (url.pathname.startsWith('/storage/v1/object/') && req.method === 'POST') {
      await drain(req);
      send(200, { Id: 'fixture', Key: url.pathname.replace('/storage/v1/object/', '') });
      return;
    }

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
      else if (raw.startsWith('in.(') && raw.endsWith(')')) {
        const items = raw.slice(4, -1).split(',').filter(Boolean);
        const placeholders = items.map((item) => { values.push(item); return '$' + values.length; });
        clauses.push(`"${key}" in (${placeholders.join(',')})`);
      } else throw Error('Unsupported fixture filter: ' + raw);
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
      sql = `insert into ${table}(${keys.map((key) => '"' + key + '"').join(',')}) values(${vals.join(',')}) returning row_to_json(${table}) as row`;
    } else if (req.method === 'PATCH') {
      const row = rowsIn[0];
      const keys = Object.keys(row).filter((key) => spec.columns.includes(key));
      if (!keys.length) throw Error('Invalid fixture columns for ' + table);
      const patch = keys.map((key) => { values.push(row[key]); return `"${key}"=$${values.length}`; });
      sql = `update ${table} set ${patch.join(',')}${where} returning row_to_json(${table}) as row`;
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
    console.error('[fixture]', req.method, url.pathname, cause);
    send(cause.code === '23505' ? 409 : cause.code === '42501' ? 403 : 400, { code: cause.code ?? 'fixture_error', message: cause.message });
  }
});
await new Promise((done) => backend.listen(38463, '127.0.0.1', done));

const temp = mkdtempSync(join(tmpdir(), 'kebu-claims-config-')), config = join(temp, 'playwright.config.mjs');
writeFileSync(config, `import{defineConfig}from${JSON.stringify(playwrightTestEntry)};export default defineConfig({testDir:${JSON.stringify(join(root, 'tests/platform'))},testMatch:'business-claims.local.spec.ts',workers:1,retries:0,maxFailures:1,timeout:60000,reporter:[['list'],['json',{outputFile:${JSON.stringify(join(output, 'results.json'))}}]],outputDir:${JSON.stringify(join(output, 'traces'))},use:{actionTimeout:10000,baseURL:'http://127.0.0.1:38462',viewport:{width:1440,height:1000},launchOptions:{executablePath:${JSON.stringify(chromium)},args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']}}});`);
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:38463',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-local-fixture',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  SUPABASE_SECRET_KEY: '',
  SUPABASE_URL: '',
  DATABASE_URL: '',
  ANTHROPIC_API_KEY: '',
  VERCEL_ENV: '',
  KEBU_CLAIMS_TEST_ORPHANED_ID: orphanedId,
  KEBU_CLAIMS_TEST_OWNED_ID: ownedId,
  KEBU_CLAIMS_TEST_ORPHANED2_ID: orphaned2Id,
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
  server = spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', '38462'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.pipe(log); server.stderr.pipe(log);
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(Error('Startup timeout')), 30000);
    server.stdout.on('data', (bytes) => { if (bytes.toString().includes('Ready')) { clearTimeout(timer); done(); } });
    server.on('exit', (code) => fail(Error('Server exit ' + code)));
  });
  tests = spawn(process.execPath, [playwrightCli, 'test', '--config', config], { cwd: root, env, stdio: 'inherit' });
  const code = await new Promise((done) => tests.on('exit', done));
  const report = JSON.parse(readFileSync(join(output, 'results.json'), 'utf8'));
  const receipt = { ...report.stats, sqlQueries: totalQueries };
  writeFileSync(join(output, 'verification.json'), JSON.stringify(receipt, null, 2));
  console.log('BUSINESS_CLAIMS_UI_RESULT', JSON.stringify(receipt));
  if (code !== 0 || report.stats.unexpected || report.stats.skipped) throw Error('Business claims browser gate failed');
} finally {
  await stopChild(tests); await stopChild(server); await new Promise((done) => backend.close(done)); await db.close(); rmSync(temp, { recursive: true, force: true });
}
