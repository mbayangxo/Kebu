/** Actual Studio editors + IndexedDB + downloaded files, with isolated loopback transport fixtures. */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, createWriteStream, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const chromium = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH;
if (!chromium) throw Error("Set the local Chromium executable; no hosted fallback.");
const output = process.env.KEBU_STUDIO_UI_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), "kebu-studio-ui-")); mkdirSync(output, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), "kebu-studio-config-"));
const config = join(temporary, "playwright.config.mjs");
writeFileSync(config, `import {defineConfig} from ${JSON.stringify(join(root,"node_modules/playwright/test.mjs"))}; export default defineConfig({testDir:${JSON.stringify(join(root,"tests/studio"))},testMatch:"save-export.local.spec.ts",workers:1,retries:0,maxFailures:1,timeout:60000,reporter:[["list"],["json",{outputFile:${JSON.stringify(join(output,"results.json"))}}]],outputDir:${JSON.stringify(join(output,"traces"))},use:{trace:"retain-on-failure",screenshot:"only-on-failure",actionTimeout:10000,baseURL:"http://127.0.0.1:38416",viewport:{width:1440,height:1000},launchOptions:{executablePath:${JSON.stringify(chromium)},args:["--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--no-zygote"]}}});`);
const filter = process.env.KEBU_STUDIO_UI_GREP;
const owner = "33333333-3333-4333-8333-333333333333";
const auth = createServer((req, res) => { res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:38416"); res.setHeader("Access-Control-Allow-Headers", "authorization,apikey,x-client-info,content-type"); if(req.method === "OPTIONS"){res.statusCode=204;res.end();return;} res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ id: owner, email: "qa@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-10-13T12:00:00Z" })); });
await new Promise(done => auth.listen(38417, "127.0.0.1", done));
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:38417", NEXT_PUBLIC_SUPABASE_ANON_KEY: "isolated-local-fixture", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", SUPABASE_SERVICE_ROLE_KEY: "", SUPABASE_SECRET_KEY: "", SUPABASE_URL: "", DATABASE_URL: "", ANTHROPIC_API_KEY: "", VERCEL_ENV: "" };
// Exercise the real app with Next's supported Webpack compiler. Turbopack's
// external Google-font query resolver can fail before an editor is rendered.
// Production compilation remains a separate, unmodified CI gate.
rmSync(join(root,".next/dev"),{recursive:true,force:true});
async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(done => {
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    child.once("close", () => { clearTimeout(timer); done(); }); child.kill();
  });
}
let server, tests;
try {
  const log = createWriteStream(join(output, "server.log"));
  server = spawn(process.execPath, [join(root,"node_modules/next/dist/bin/next"),"dev","--webpack","--hostname","127.0.0.1","--port","38416"], {cwd:root,env,stdio:["ignore","pipe","pipe"]}); server.stdout.pipe(log); server.stderr.pipe(log);
  await new Promise((done, fail) => { const timer = setTimeout(() => fail(Error("Local Studio startup timeout")),30000); server.stdout.on("data", bytes => {if(bytes.toString().includes("Ready")){clearTimeout(timer);done();}}); server.on("exit",code=>fail(Error("Server exited "+code))); });
  tests = spawn(process.execPath,[join(root,"node_modules/playwright/cli.js"),"test","--config",config,...(filter ? ["--grep",filter] : [])],{cwd:root,env,stdio:"inherit"});
  const code = await new Promise(done => tests.on("exit",done));
  const report = JSON.parse(readFileSync(join(output,"results.json"),"utf8"));
  console.log("STUDIO_UI_RESULT",JSON.stringify({ ...report.stats, scope: filter ?? "full" }));
  if(code!==0 || report.stats.unexpected || report.stats.skipped || report.stats.flaky || report.stats.expected < (filter ? 1 : 78)) throw Error("Studio browser gate failed");
} finally {
  await stopChild(tests);
  await stopChild(server);
  await new Promise(done => auth.close(done));
  rmSync(temporary,{recursive:true,force:true});
  console.log("STUDIO_UI_CLEANUP", JSON.stringify({
    testsStopped: !tests || tests.exitCode !== null || tests.signalCode !== null,
    serverStopped: !server || server.exitCode !== null || server.signalCode !== null,
    authStopped: !auth.listening,
    temporaryConfigRemoved: !existsSync(temporary),
  }));
}
