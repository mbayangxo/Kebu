import assert from 'node:assert/strict';
/** Real Liguey UI -> Next API -> supabase-js -> isolated SQL/RLS. Loopback Auth/REST fixture only. */
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

const founder = '33333333-3333-4333-8333-333333333333';
const employee = '44444444-4444-4444-8444-444444444444';
const applicant = '55555555-5555-4555-8555-555555555555';
const otherApplicant = '66666666-6666-4666-8666-666666666666';
const strangerFounder = '77777777-7777-4777-8777-777777777777';
const businessId = '88888888-8888-4888-8888-888888888888';
const serviceRoleKey = 'fixture-service-role-key';

const output = process.env.KEBU_LIGUEY_UI_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), 'kebu-liguey-ui-'));
mkdirSync(output, { recursive: true });
const read = (path) => readFileSync(join(root, path), 'utf8');

await db.exec(`
  create extension if not exists pgcrypto;
  create schema auth;
  create table auth.users(id uuid primary key, email text, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create role authenticated; create role anon; create role service_role bypassrls;
  alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
  grant usage on schema public, auth to authenticated, anon, service_role;
  grant execute on all functions in schema auth to authenticated, anon, service_role;
  create or replace function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at = now(); return new; end$$;
  create table public.businesses(id uuid primary key default gen_random_uuid(), created_by uuid not null references auth.users(id), legal_name text not null default 'Fixture Business', trading_name text);
  create table public.business_members(
    id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('founder','cofounder','beneficial_owner','director','administrator','finance_manager','store_manager','developer','designer','employee','accountant','legal_representative','viewer')),
    status text not null default 'active' check (status in ('pending','active','removed')), unique(business_id,user_id)
  );
  alter table public.business_members enable row level security;
  create policy "members select own" on public.business_members for select using (user_id = auth.uid());
  insert into auth.users(id) values ('${founder}'),('${employee}'),('${applicant}'),('${otherApplicant}'),('${strangerFounder}');
  insert into public.businesses(id, created_by, trading_name) values ('${businessId}', '${founder}', 'Fixture Translation Co');
  insert into public.business_members(business_id,user_id,role,status) values
    ('${businessId}','${founder}','founder','active'),
    ('${businessId}','${employee}','employee','active');
`);
await db.exec(read('supabase/migrations/20261016120000_library_sharing.sql'));
await db.exec(read('supabase/migrations/20261016180000_liguey_worker_profiles.sql'));
await db.exec(read('supabase/migrations/20261016190000_liguey_job_listings_applications.sql'));
await db.exec(read('supabase/migrations/20261016200000_liguey_profile_visibility_for_reviewers.sql'));
await db.exec(read('supabase/migrations/20261016210000_liguey_applicant_listing_visibility.sql'));
await db.exec(read('supabase/migrations/20261020000000_liguey_yande_applicant_insight.sql'));

const TABLES = {
  worker_profiles: { columns: ['user_id','headline','bio','skills','languages','experience','location','country_code','remote_eligible','availability','is_discoverable','verified_at','created_at','updated_at'], json: new Set(['experience']) },
  worker_profile_evidence: { columns: ['id','user_id','library_node_id','label','created_at'], json: new Set() },
  job_listings: { columns: ['id','business_id','public_id','title','description','requirements','employment_type','location_type','location','status','created_by','created_at','updated_at'], json: new Set() },
  job_applications: { columns: ['id','listing_id','business_id','applicant_user_id','cover_note','status','decided_at','decided_by','created_at','updated_at'], json: new Set() },
  businesses: { columns: ['id','created_by','legal_name','trading_name'], json: new Set() },
  business_members: { columns: ['id','business_id','user_id','role','status'], json: new Set() },
  library_nodes: { columns: ['id','owner_id','parent_id','kind','title','storage_path','mime_type','byte_size','source_kind','source_id','metadata','starred','trashed_at','created_at','updated_at'], json: new Set(['metadata']) },
  liguey_applicant_insights: { columns: ['id','application_id','business_id','generated_by','model','summary','strengths','questions_to_ask','caution','created_at','updated_at'], json: new Set() },
  liguey_ai_usage: { columns: ['business_id','month_start','generation_count','updated_at'], json: new Set() },
};

async function run(uid, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec('set local role ' + (uid === 'SERVICE' ? 'service_role' : 'authenticated'));
    if (uid !== 'SERVICE') await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
    return tx.query(sql, params);
  });
}

function identity(req) {
  const raw = (req.headers.authorization ?? '').split(' ')[1] ?? '';
  if (raw === serviceRoleKey) return 'SERVICE';
  try {
    const id = JSON.parse(Buffer.from(raw.split('.')[1], 'base64url').toString()).sub;
    return [founder, employee, applicant, otherApplicant, strangerFounder].includes(id) ? id : null;
  } catch { return null; }
}
async function payload(req) { let body = ''; for await (const bytes of req) body += bytes; return body ? JSON.parse(body) : {}; }

let queries = 0;
let lastAnthropicRequest = null;
const backend = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:38440');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,x-client-info,content-type');
  res.setHeader('Content-Type', 'application/json');
  const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:38441');
  try {
    if (url.pathname === '/__qa/reset' && req.method === 'POST') {
      await db.exec('truncate worker_profiles, worker_profile_evidence, job_listings, job_applications, liguey_ai_usage cascade');
      queries = 0; lastAnthropicRequest = null; send(200, { ok: true }); return;
    }
    if (url.pathname === '/__qa/state') {
      const [profiles, evidence, listings, applications, insights] = await Promise.all([
        db.query('select row_to_json(w) as row from worker_profiles w'),
        db.query('select row_to_json(w) as row from worker_profile_evidence w'),
        db.query('select row_to_json(w) as row from job_listings w order by created_at'),
        db.query('select row_to_json(w) as row from job_applications w order by created_at'),
        db.query('select row_to_json(w) as row from liguey_applicant_insights w order by created_at'),
      ]);
      send(200, { profiles: profiles.rows.map((x) => x.row), evidence: evidence.rows.map((x) => x.row), listings: listings.rows.map((x) => x.row), applications: applications.rows.map((x) => x.row), insights: insights.rows.map((x) => x.row), lastAnthropicRequest, queries });
      return;
    }
    const uid = identity(req);
    if (url.pathname.startsWith('/auth/')) {
      if (!uid || uid === 'SERVICE') { send(401, { message: 'Fixture session missing' }); return; }
      send(200, { id: uid, email: uid + '@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-16T12:00:00Z' });
      return;
    }
    if (url.pathname === '/v1/messages' && req.method === 'POST') {
      const body = await payload(req);
      lastAnthropicRequest = body;
      const text = String(body.system ?? '').includes('Yande')
        ? JSON.stringify({
            summary: 'Fixture-generated: strong fit based on the real applicant profile.',
            strengths: ['Matches the listed language requirement', 'Has relevant informal experience'],
            questionsToAsk: ['Can you describe a recent example of this work?'],
            caution: '',
          })
        : '{}';
      send(200, { id: 'msg_fixture', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 } });
      return;
    }
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const fn = url.pathname.slice('/rest/v1/rpc/'.length);
      const uid = identity(req);
      const args = await payload(req);
      const keys = Object.keys(args);
      const placeholders = keys.map((key, index) => `${key} := $${index + 1}`);
      const values = keys.map((key) => args[key]);
      const result = await run(uid, `select ${fn}(${placeholders.join(',')}) as result`, values);
      queries++;
      const row = result.rows[0] ?? {};
      send(200, row.result);
      return;
    }
    if (!url.pathname.startsWith('/rest/v1/')) { send(404, { error: 'Fixture endpoint missing' }); return; }
    const table = url.pathname.slice('/rest/v1/'.length);
    const config = TABLES[table];
    if (!config) { send(200, []); return; }
    if (!uid) { send(401, { code: '42501', message: 'No fixture identity' }); return; }

    const values = []; const clauses = [];
    let order = null; let limit = null;
    for (const [key, value] of url.searchParams) {
      if (key === 'order') { const [col, dir] = value.split('.'); order = `"${col}" ${dir === 'desc' ? 'desc' : 'asc'}`; continue; }
      if (key === 'limit') { limit = Number(value); continue; }
      if (key === 'select') continue;
      if (!config.columns.includes(key)) continue;
      if (value.startsWith('eq.')) { values.push(value.slice(3)); clauses.push(`"${key}"=$${values.length}`); }
      else if (value === 'is.null') { clauses.push(`"${key}" is null`); }
      else if (value.startsWith('in.(') && value.endsWith(')')) {
        const items = value.slice(4, -1).split(',').filter(Boolean);
        if (!items.length) { clauses.push('false'); continue; }
        const placeholders = items.map((item) => { values.push(item); return '$' + values.length; });
        clauses.push(`"${key}" in (${placeholders.join(',')})`);
      } else throw Error('Unsupported fixture filter: ' + value);
    }
    const where = clauses.length ? ' where ' + clauses.join(' and ') : '';
    const raw = ['POST', 'PATCH'].includes(req.method) ? await payload(req) : {};
    const row = Array.isArray(raw) ? raw[0] : raw;
    const bindValue = (key, value) => (config.json.has(key) ? JSON.stringify(value) : value);
    let sql;
    if (req.method === 'GET') {
      sql = `select row_to_json(w) as row from ${table} w${where}${order ? ' order by ' + order : ''}${limit ? ' limit ' + limit : ''}`;
    } else if (req.method === 'POST') {
      const keys = Object.keys(row);
      if (!keys.length || keys.some((key) => !config.columns.includes(key))) throw Error('Invalid fixture columns for ' + table);
      const vals = keys.map((key) => { values.push(bindValue(key, row[key])); return '$' + values.length + (config.json.has(key) ? '::jsonb' : ''); });
      sql = `insert into ${table}(${keys.map((key) => '"' + key + '"').join(',')}) values(${vals.join(',')}) returning row_to_json(${table}) as row`;
    } else if (req.method === 'PATCH') {
      const keys = Object.keys(row);
      if (!keys.length || keys.some((key) => !config.columns.includes(key))) throw Error('Invalid fixture columns for ' + table);
      const patch = keys.map((key) => { values.push(bindValue(key, row[key])); return `"${key}"=$${values.length}${config.json.has(key) ? '::jsonb' : ''}`; });
      sql = `update ${table} set ${patch.join(',')}${where} returning row_to_json(${table}) as row`;
    } else if (req.method === 'DELETE') {
      sql = `delete from ${table}${where} returning row_to_json(${table}) as row`;
    } else { send(405, { error: 'Unsupported fixture method' }); return; }

    const result = await run(uid, sql, values); queries++;
    const rows = result.rows.map((x) => x.row);
    if ((req.headers.accept ?? '').includes('object+json')) {
      if (rows.length !== 1) { send(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows` }); return; }
      send(200, rows[0]); return;
    }
    send(req.method === 'POST' ? 201 : 200, rows);
  } catch (cause) {
    send(cause.code === '23505' ? 409 : cause.message?.includes('row-level security') ? 403 : 400, { code: cause.code ?? 'fixture_error', message: cause.message });
  }
});
await new Promise((done) => backend.listen(38441, '127.0.0.1', done));

const temp = mkdtempSync(join(tmpdir(), 'kebu-liguey-config-'));
const config = join(temp, 'playwright.config.mjs');
writeFileSync(config, `import{defineConfig}from${JSON.stringify(join(root, 'node_modules/playwright/test.mjs'))};export default defineConfig({testDir:${JSON.stringify(join(root, 'tests/platform'))},testMatch:'liguey.local.spec.ts',workers:1,retries:0,maxFailures:1,timeout:60000,reporter:[['list'],['json',{outputFile:${JSON.stringify(join(output, 'results.json'))}}]],outputDir:${JSON.stringify(join(output, 'traces'))},use:{actionTimeout:10000,baseURL:'http://127.0.0.1:38440',viewport:{width:1440,height:1000},launchOptions:{executablePath:${JSON.stringify(chromium)},args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']}}});`);
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:38441', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-local-fixture', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey, SUPABASE_SECRET_KEY: '', SUPABASE_URL: '', DATABASE_URL: '', ANTHROPIC_API_KEY: 'fixture-anthropic-key', ANTHROPIC_BASE_URL: 'http://127.0.0.1:38441', VERCEL_ENV: '' };
rmSync(join(root, '.next/dev'), { recursive: true, force: true });

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((done) => {
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
    const timer = setTimeout(() => fail(Error('Startup timeout')), 30000);
    server.stdout.on('data', (bytes) => { if (bytes.toString().includes('Ready')) { clearTimeout(timer); done(); } });
    server.on('exit', (code) => fail(Error('Server exit ' + code)));
  });
  tests = spawn(process.execPath, [join(root, 'node_modules/playwright/cli.js'), 'test', '--config', config], { cwd: root, env, stdio: 'inherit' });
  const code = await new Promise((done) => tests.on('exit', done));
  const report = JSON.parse(readFileSync(join(output, 'results.json'), 'utf8'));
  const receipt = { ...report.stats, sqlQueries: queries };
  writeFileSync(join(output, 'verification.json'), JSON.stringify(receipt, null, 2));
  console.log('LIGUEY_UI_RESULT', JSON.stringify(receipt));
  if (code !== 0 || report.stats.unexpected || report.stats.skipped) throw Error('Liguey browser gate failed');
} finally {
  await stopChild(tests); await stopChild(server);
  await new Promise((done) => backend.close(done));
  await db.close();
  rmSync(temp, { recursive: true, force: true });
}
