/** Real form UI → Next API → supabase-js → isolated SQL/RLS; no hosted keys or writes. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, cpSync, constants, readdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, createWriteStream } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
const source = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const chromium = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH;
const modulePath = process.env.KEBU_PGLITE_MODULE_PATH;
if (!chromium || !modulePath) throw Error("Set isolated Chromium and PGlite module paths. No hosted fallback.");
const output = process.env.KEBU_CONTACT_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), "kebu-contact-output-"));
mkdirSync(output, { recursive: true });
const root = mkdtempSync(join(tmpdir(), "kebu-contact-source-"));
for (const directory of ["app", "lib", "public", "scripts", "supabase", "tests", "node_modules"]) cpSync(join(source, directory), join(root, directory), { recursive: true, mode: constants.COPYFILE_FICLONE });
for (const entry of readdirSync(source, { withFileTypes: true })) if (entry.isFile() && !entry.name.startsWith(".") && /\.(?:[cm]?[jt]sx?|json)$/.test(entry.name)) copyFileSync(join(source, entry.name), join(root, entry.name));
const { PGlite } = await import(pathToFileURL(modulePath).href), db = new PGlite();
const owner = "33333333-3333-4333-8333-333333333333", other = "44444444-4444-4444-8444-444444444444";
const project = "11111111-1111-4111-8111-111111111111", form = "77777777-7777-4777-8777-777777777777";
await db.exec(`create role authenticated; create schema auth; create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table projects(id uuid primary key,owner_id uuid,title text); create table project_sections(id uuid primary key,project_id uuid references projects(id));
create table deployments(id uuid primary key default gen_random_uuid(),project_id uuid references projects(id),subdomain text,status text,snapshot jsonb);
grant usage on schema public,auth to authenticated; grant execute on function auth.uid() to authenticated;
alter table projects enable row level security; create policy owner_read on projects for select to authenticated using(owner_id=(select auth.uid())); grant select on projects to authenticated;`);
const archived = readFileSync(join(root, "supabase/migrations_archive/legacy/064_creation_stack_slices.sql"), "utf8");
await db.exec(archived.slice(archived.indexOf("create table if not exists public.project_form_submissions"), archived.indexOf("-- ── Studio design types")));
await db.exec("grant select on project_form_submissions to authenticated");
await db.query("insert into projects values($1,$2,'May contact QA')", [project, owner]);
await db.query("insert into project_sections values($1,$2)", [form, project]);
const formProps = { heading: "May contact QA", fields: [{ id: "name", label: "Your name", type: "text", required: true }, { id: "email", label: "Email", type: "email", required: true }, { id: "message", label: "Message", type: "textarea", required: true }] };
await db.query("insert into deployments(project_id,subdomain,status,snapshot) values($1,'may-local','live',$2)", [project, JSON.stringify({ schemaVersion: "website-v1", pages: [{ slug: "home", sections: [{ id: form, type: "form", props: formProps }] }] })]);
async function asUser(uid, sql, values = []) { return db.transaction(async tx => { await tx.exec("set local role authenticated"); await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]); return tx.query(sql, values); }); }
let queries = 0, assertions = 0;
const sample = await db.query("insert into project_form_submissions(project_id,section_id,payload) values($1,$2,'{}') returning id", [project, form]);
assert.equal((await asUser(owner, "select id from project_form_submissions")).rows.length, 1); assertions++;
assert.equal((await asUser(other, "select id from project_form_submissions")).rows.length, 0); assertions++;
await assert.rejects(asUser(other, "insert into project_form_submissions(project_id,section_id) values($1,$2)", [project, form]), error => error.code === "42501"); assertions++;
assert.ok(sample.rows[0].id); await db.exec("truncate project_form_submissions");
function identity(req) { const token = (req.headers.authorization ?? "").replace(/^Bearer /, ""); if (token === "isolated-contact-service") return "service"; try { const id = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub; return [owner, other].includes(id) ? id : null; } catch { return null; } }
async function payload(req) { let body = ""; for await (const bytes of req) body += bytes; return body ? JSON.parse(body) : {}; }
const allowed = { projects: ["id", "owner_id", "title"], deployments: ["id", "project_id", "subdomain", "status", "snapshot"], project_form_submissions: ["id", "project_id", "section_id", "form_name", "payload", "submitter_email", "submitter_name", "submitter_phone", "ip_hash", "created_at"] };
const backend = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:38436");
  res.setHeader("Access-Control-Allow-Headers", "authorization,apikey,x-client-info,content-type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const send = (status, value) => { res.statusCode = status; res.end(JSON.stringify(value)); };
  try {
    const url = new URL(req.url, "http://fixture"), uid = identity(req);
    if (url.pathname === "/__reset") { await db.exec("truncate project_form_submissions"); send(200, { ok: true }); return; }
    if (url.pathname === "/__state") { send(200, { rows: (await db.query("select * from project_form_submissions order by created_at,id")).rows, queries }); return; }
    if (url.pathname.startsWith("/auth/v1/")) { if (uid && uid !== "service") send(200, { id: uid, aud: "authenticated", role: "authenticated", email: uid === owner ? "owner@example.test" : "other@example.test", app_metadata: {}, user_metadata: {} }); else send(401, { message: "Not signed in" }); return; }
    const table = url.pathname.replace("/rest/v1/", ""), columns = allowed[table];
    if (!columns) { send(200, []); return; }
    if (!uid) { send(401, { message: "No local identity" }); return; }
    const values = [], filters = [];
    for (const [key, value] of url.searchParams) if (columns.includes(key)) { if (!value.startsWith("eq.")) throw Error("Unsupported local filter"); values.push(value.slice(3)); filters.push(`"${key}"=$${values.length}`); }
    const selection = (url.searchParams.get("select") ?? "*").split(",");
    if (selection.some(column => column !== "*" && !columns.includes(column))) throw Error("Unknown selected column");
    const fields = selection.includes("*") ? "*" : selection.map(column => `"${column}"`).join(",");
    const where = filters.length ? " where " + filters.join(" and ") : "";
    let sql;
    if (req.method === "POST" && table === "project_form_submissions" && uid === "service") {
      const row = await payload(req), keys = Object.keys(row);
      if (keys.some(key => !columns.includes(key))) throw Error("Unknown write column");
      const args = keys.map(key => { values.push(key === "payload" ? JSON.stringify(row[key]) : row[key]); return "$" + values.length; });
      sql = `insert into ${table}(${keys.map(key => `"${key}"`).join(",")}) values(${args.join(",")}) returning ${fields}`;
    } else if (req.method === "GET") {
      const limit = Number(url.searchParams.get("limit") ?? 100), offset = Number(url.searchParams.get("offset") ?? 0);
      if (![limit,offset].every(Number.isInteger) || limit < 0 || offset < 0) throw Error("Invalid local paging");
      sql = `select ${fields} from ${table}${where}${table === "project_form_submissions" ? " order by created_at desc,id desc" : ""} limit ${limit} offset ${offset}`;
    } else { send(405, { message: "Unsupported local method" }); return; }
    const result = uid === "service" ? await db.query(sql, values) : await asUser(uid, sql, values); queries++;
    if ((req.headers.accept ?? "").includes("object+json")) { if (result.rows.length !== 1) { send(406, { code: "PGRST116", message: "No row", details: "The result contains 0 rows" }); return; } send(200, result.rows[0]); }
    else send(200, result.rows);
  } catch (error) { send(400, { message: error.message, code: error.code }); }
});
await new Promise(done => backend.listen(38437, "127.0.0.1", done));
const route = join(root, "app/contact-local-probe"); mkdirSync(route); copyFileSync(join(root, "tests/create/fixtures/contact-ui-page.tsx"), join(route, "page.tsx"));
const config = join(root, "scripts/contact-temporary.config.mjs");
writeFileSync(config, `import{defineConfig}from"playwright/test";export default defineConfig({testDir:${JSON.stringify(join(root,"tests/create"))},testMatch:"site-contact.local.spec.ts",workers:1,retries:0,maxFailures:1,timeout:60000,reporter:[["list"],["json",{outputFile:${JSON.stringify(join(output,"results.json"))}}]],outputDir:${JSON.stringify(join(output,"traces"))},use:{baseURL:"http://127.0.0.1:38436",actionTimeout:10000,launchOptions:{executablePath:${JSON.stringify(chromium)},args:["--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--no-zygote"]}}});`);
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:38437", NEXT_PUBLIC_SUPABASE_ANON_KEY: "isolated-contact-anon", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", SUPABASE_SERVICE_ROLE_KEY: "isolated-contact-service", SUPABASE_SECRET_KEY: "", SUPABASE_URL: "", DATABASE_URL: "", ANTHROPIC_API_KEY: "", RESEND_API_KEY: "", VERCEL_ENV: "", KEBU_CONTACT_LOCAL: "1" };
let server, tests; const log = createWriteStream(join(output,"server.log"));
async function stop(child) { if (!child || child.exitCode !== null || child.signalCode !== null) return; await new Promise(done => { const timer = setTimeout(() => child.kill("SIGKILL"), 5000); child.once("close", () => { clearTimeout(timer); done(); }); child.kill("SIGTERM"); }); }
try {
  server = spawn(process.execPath, [join(root,"node_modules/next/dist/bin/next"),"dev","--hostname","127.0.0.1","--port","38436"], { cwd: root, env, stdio:["ignore","pipe","pipe"] }); server.stdout.pipe(log); server.stderr.pipe(log);
  await new Promise((done, fail) => { const timer = setTimeout(() => fail(Error("Startup timeout")), 30000); server.stdout.on("data", bytes => { if (bytes.toString().includes("Ready")) { clearTimeout(timer); done(); } }); server.once("exit",code => fail(Error("Server exit " + code))); });
  tests = spawn(process.execPath, [join(root,"node_modules/playwright/cli.js"),"test","--config",config], { cwd:root,env,stdio:"inherit" });
  const code = await new Promise(done => tests.once("exit", done)); const stats = JSON.parse(readFileSync(join(output,"results.json"),"utf8")).stats;
  writeFileSync(join(output,"verification.json"), JSON.stringify({ ...stats, sqlQueries:queries, sqlAssertions:assertions, schema:"Reconstructed minimal prerequisites plus exact archived form table/RLS SQL; not hosted schema verification", outboundEmail:"No provider keys; no external email sent" },null,2));
  console.log("CONTACT_UI_RESULT", JSON.stringify({ ...stats,sqlQueries:queries,sqlAssertions:assertions }));
  if (code || stats.unexpected || stats.skipped || stats.expected < 4) throw Error("Contact gate failed");
} finally { await stop(tests); await stop(server); log.end(); await new Promise(done => backend.close(done)); await db.close(); rmSync(root,{recursive:true,force:true}); console.log("CONTACT_CLEANUP", JSON.stringify({sourceSandboxRemoved:true,serverStopped:true,noProductionWrites:true})); }
