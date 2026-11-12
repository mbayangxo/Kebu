/** Real Kebu Mail UI -> Next API -> supabase-js -> isolated SQL/RLS. Loopback Auth/REST fixture only. */
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

const userA = '11111111-1111-4111-8111-111111111111'; // sends mail
const userB = '22222222-2222-4222-8222-222222222222'; // forwards to userC
const userC = '33333333-3333-4333-8333-333333333333'; // forward target, then external forward
const founder = '44444444-4444-4444-8444-444444444444';
const businessId = '55555555-5555-4555-8555-555555555555';
const siteDomainId = '66666666-6666-4666-8666-666666666666';

const output = process.env.KEBU_MAIL_UI_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), 'kebu-mail-ui-'));
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
  create table public.businesses(id uuid primary key default gen_random_uuid(), created_by uuid not null references auth.users(id), legal_name text not null default 'Fixture Business', trading_name text);
  create table public.business_members(
    id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('founder','cofounder','beneficial_owner','director','administrator','finance_manager','store_manager','developer','designer','employee','accountant','legal_representative','viewer')),
    status text not null default 'active' check (status in ('pending','active','removed')), unique(business_id,user_id)
  );
  alter table public.business_members enable row level security;
  create policy "members select own" on public.business_members for select using (user_id = auth.uid());
  create table public.user_profiles(id uuid primary key references auth.users(id), active_business_id uuid references public.businesses(id), name text, email text);
  create table public.projects(id uuid primary key default gen_random_uuid(), business_id uuid references public.businesses(id));
  create table public.site_domains(id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id), hostname text, status text, verified boolean, is_primary boolean, verified_at timestamptz);
  insert into auth.users(id) values ('${userA}'),('${userB}'),('${userC}'),('${founder}');
  insert into public.businesses(id, created_by, trading_name) values ('${businessId}', '${founder}', 'Fixture Biz Co');
  insert into public.business_members(business_id,user_id,role,status) values ('${businessId}','${founder}','founder','active');
  insert into public.user_profiles(id, active_business_id) values ('${userA}',null),('${userB}',null),('${userC}',null),('${founder}','${businessId}');
  insert into public.site_domains(id, hostname, status, verified, is_primary) values ('${siteDomainId}', 'bizmail.test', 'verified', true, true);
`);
await db.exec(read('supabase/migrations/20260920084000_kebu_mail_m1.sql'));
await db.exec(read('supabase/migrations/20260920091000_kebu_mail_m2.sql'));
await db.exec(read('supabase/migrations/20260920121000_kebu_business_mail_m3.sql'));
await db.exec(read('supabase/migrations/20260920223000_kebu_mail_delivery_infrastructure.sql'));
await db.exec(read('supabase/migrations/20260920223500_kebu_mail_platform_domain_and_alerts.sql'));
await db.exec(read('supabase/migrations/20260920224000_kebu_mail_domain_event_metrics.sql'));
await db.exec(read('supabase/migrations/20260920230000_kebu_mail_reputation_guardrails.sql'));
await db.exec(read('supabase/migrations/20260921011500_mail_message_attention_states.sql'));
await db.exec(read('supabase/migrations/20261020000000_kebu_mail_forwarding.sql'));
await db.exec(read('supabase/migrations/20261020010000_kebu_business_mailbox_insert_repair.sql'));

// Pre-seeded as already-real-provider-verified, bypassing the register/verify
// steps this harness cannot drive for real without a live Resend account.
await db.exec(`
  update public.mail_platform_domains set status='verified', sending_enabled=true, inbound_enabled=true where domain='kebu.africa';
  insert into public.mail_domains(id, business_id, site_domain_id, domain, provider, provider_domain_id, status, sending_enabled, inbound_enabled, verified_at, created_by)
  values (gen_random_uuid(), '${businessId}', '${siteDomainId}', 'bizmail.test', 'resend', 'dom_fixture', 'verified', true, true, now(), '${founder}');
`);

const TABLES = {
  mailboxes: { columns: ['id','owner_user_id','business_id','mailbox_type','address','display_name','is_active','mail_domain_id','local_part','created_at','updated_at'], json: new Set() },
  mail_threads: { columns: ['id','mailbox_id','subject','normalized_subject','participant_key','last_message_at','created_at'], json: new Set() },
  mail_messages: { columns: ['id','mailbox_id','thread_id','provider_message_id','direction','folder','from_address','to_addresses','cc_addresses','subject','body_text','status','read_at','in_reply_to_message_id','priority','starred_at','waiting_until','scheduled_at','forwarded_from_message_id','forward_depth','created_at'], json: new Set() },
  mail_attachments: { columns: ['id','message_id','mailbox_id','uploaded_by','file_name','storage_path','mime','byte_size','provider_attachment_id','created_at'], json: new Set() },
  mail_forwarding_rules: { columns: ['id','mailbox_id','forward_to_address','is_active','created_by','created_at','updated_at'], json: new Set() },
  mail_domains: { columns: ['id','business_id','site_domain_id','domain','provider','provider_domain_id','status','dns_records','last_error','verified_at','sending_enabled','inbound_enabled','created_by','created_at','updated_at'], json: new Set(['dns_records']) },
  mail_platform_domains: { columns: ['domain','purpose','provider','provider_domain_id','status','sending_enabled','inbound_enabled','reputation_status','dns_records','last_error','verified_at','created_at','updated_at'], json: new Set(['dns_records']) },
  mail_delivery_jobs: { columns: ['id','message_id','mailbox_id','provider','status','attempt_count','max_attempts','next_attempt_at','provider_message_id','idempotency_key','last_error_code','last_error','sent_at','created_at','updated_at'], json: new Set() },
  mail_audit_events: { columns: ['id','mailbox_id','business_id','actor_user_id','event_type','metadata','created_at'], json: new Set(['metadata']) },
  user_profiles: { columns: ['id','active_business_id','name','email'], json: new Set() },
  businesses: { columns: ['id','created_by','legal_name','trading_name'], json: new Set() },
  business_members: { columns: ['id','business_id','user_id','role','status'], json: new Set() },
  projects: { columns: ['id','business_id'], json: new Set() },
  site_domains: { columns: ['id','project_id','hostname','status','verified','is_primary','verified_at'], json: new Set() },
};

const ALL_IDS = [userA, userB, userC, founder];
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
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:38450');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,x-client-info,content-type,accept');
  res.setHeader('Content-Type', 'application/json');
  const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:38451');
  try {
    if (url.pathname === '/__qa/reset' && req.method === 'POST') {
      await db.exec('truncate mailboxes, mail_delivery_jobs, mail_audit_events restart identity cascade');
      await db.exec(`
        update public.mail_platform_domains set status='verified', sending_enabled=true, inbound_enabled=true where domain='kebu.africa';
      `);
      totalQueries = 0; send(200, { ok: true }); return;
    }
    if (url.pathname === '/__qa/state') {
      const mailboxes = await db.query('select row_to_json(m) as row from mailboxes m order by created_at');
      const threads = await db.query('select row_to_json(t) as row from mail_threads t order by created_at');
      const messages = await db.query('select row_to_json(x) as row from mail_messages x order by created_at');
      const forwarding = await db.query('select row_to_json(f) as row from mail_forwarding_rules f order by created_at');
      const jobs = await db.query('select row_to_json(j) as row from mail_delivery_jobs j order by created_at');
      send(200, {
        mailboxes: mailboxes.rows.map((x) => x.row),
        threads: threads.rows.map((x) => x.row),
        messages: messages.rows.map((x) => x.row),
        forwarding: forwarding.rows.map((x) => x.row),
        deliveryJobs: jobs.rows.map((x) => x.row),
        queries: totalQueries,
      });
      return;
    }

    const uid = identity(req);
    if (url.pathname.startsWith('/auth/')) {
      if (!uid || uid === 'SERVICE') { send(401, { message: 'Fixture session missing' }); return; }
      send(200, { id: uid, email: uid + '@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-20T12:00:00Z' });
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
      if (key === 'order') {
        const [col, dir] = raw.split('.');
        if (spec.columns.includes(col)) orderClause = ` order by "${col}" ${dir === 'desc' ? 'desc' : 'asc'}`;
        continue;
      }
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
    const rawBody = ['POST', 'PATCH'].includes(req.method) ? await payload(req) : {};
    const rowsIn = Array.isArray(rawBody) ? rawBody : [rawBody];

    function encode(key, value) {
      if (spec.json.has(key) && value !== null && value !== undefined) return JSON.stringify(value);
      return value;
    }

    let sql;
    if (req.method === 'GET') {
      sql = `select row_to_json(w) as row from ${table} w${where}${orderClause}${limitClause || ' limit 200'}`;
    } else if (req.method === 'POST') {
      const row = rowsIn[0];
      const keys = Object.keys(row).filter((key) => spec.columns.includes(key));
      if (!keys.length) throw Error('Invalid fixture columns for ' + table);
      const vals = keys.map((key) => { values.push(encode(key, row[key])); return '$' + values.length; });
      sql = `insert into ${table}(${keys.map((key) => '"' + key + '"').join(',')}) values(${vals.join(',')})
        on conflict do nothing returning row_to_json(${table}) as row`;
      if (table === 'mail_forwarding_rules') {
        // upsert semantics: supabase-js .upsert({onConflict:'mailbox_id'}) issues POST with
        // Prefer: resolution=merge-duplicates — emulate as insert-or-update on mailbox_id.
        const patch = keys.filter((key) => key !== 'mailbox_id' && key !== 'created_by').map((key) => `"${key}"=excluded."${key}"`);
        sql = `insert into ${table}(${keys.map((key) => '"' + key + '"').join(',')}) values(${vals.join(',')})
          on conflict (mailbox_id) do update set ${patch.join(',')} returning row_to_json(${table}) as row`;
      }
    } else if (req.method === 'PATCH') {
      const row = rowsIn[0];
      const keys = Object.keys(row).filter((key) => spec.columns.includes(key));
      if (!keys.length) throw Error('Invalid fixture columns for ' + table);
      const patch = keys.map((key) => { values.push(encode(key, row[key])); return `"${key}"=$${values.length}`; });
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
await new Promise((done) => backend.listen(38451, '127.0.0.1', done));

const temp = mkdtempSync(join(tmpdir(), 'kebu-mail-config-')), config = join(temp, 'playwright.config.mjs');
writeFileSync(config, `import{defineConfig}from${JSON.stringify(join(root, 'node_modules/playwright/test.mjs'))};export default defineConfig({testDir:${JSON.stringify(join(root, 'tests/platform'))},testMatch:'mail.local.spec.ts',workers:1,retries:0,maxFailures:1,timeout:60000,reporter:[['list'],['json',{outputFile:${JSON.stringify(join(output, 'results.json'))}}]],outputDir:${JSON.stringify(join(output, 'traces'))},use:{actionTimeout:10000,baseURL:'http://127.0.0.1:38450',viewport:{width:1440,height:1000},launchOptions:{executablePath:${JSON.stringify(chromium)},args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']}}});`);
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:38451',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-local-fixture',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  SUPABASE_SECRET_KEY: '',
  SUPABASE_URL: '',
  DATABASE_URL: '',
  ANTHROPIC_API_KEY: '',
  VERCEL_ENV: '',
  RESEND_API_KEY: '',
  RESEND_WEBHOOK_SECRET: '',
  KEBU_MAIL_DOMAIN: 'kebu.africa',
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
  server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '38450'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
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
  console.log('MAIL_UI_RESULT', JSON.stringify(receipt));
  if (code !== 0 || report.stats.unexpected || report.stats.skipped) throw Error('Mail browser gate failed');
} finally {
  await stopChild(tests); await stopChild(server); await new Promise((done) => backend.close(done)); await db.close(); rmSync(temp, { recursive: true, force: true });
}
