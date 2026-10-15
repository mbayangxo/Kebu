/** Actual local component/SQL journeys. No remote credentials or hosted writes. */
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, cpSync, constants, readdirSync, copyFileSync, existsSync, readFileSync, writeFileSync, rmSync, createWriteStream } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const executablePath = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH;
const pglite = process.env.KEBU_LOCAL_PGLITE_ROOT;
if (!executablePath || !pglite) throw Error("Set local Chromium and PGlite paths; no provider fallback.");
const output = process.env.KEBU_UI_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), "kebu-native-ui-"));
mkdirSync(output, { recursive: true });
// Next writes routes, types and caches only inside this disposable source copy.
// Never mutate the working checkout, even when a browser/runner is interrupted.
for (const path of ["app/s5-local-probe", "app/s7-local-probe", "app/spatial-local-probe", "scripts/native-ui-temporary.config.mjs"]) {
  if (existsSync(join(sourceRoot, path))) throw Error("Remove stale local QA fixture before running: " + path);
}
const root = mkdtempSync(join(tmpdir(), "kebu-native-source-"));
for (const directory of ["app", "lib", "public", "scripts", "supabase", "tests", "node_modules"]) {
  cpSync(join(sourceRoot, directory), join(root, directory), { recursive: true, mode: constants.COPYFILE_FICLONE });
}
for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
  if (entry.isFile() && !entry.name.startsWith(".") && /\.(?:[cm]?[jt]sx?|json)$/.test(entry.name)) copyFileSync(join(sourceRoot, entry.name), join(root, entry.name));
}
mkdirSync(join(root, "evidence/3c/s5"), { recursive: true });

const routes = ["app/s5-local-probe", "app/s7-local-probe", "app/spatial-local-probe"];
for (const route of routes) if (existsSync(join(root, route))) throw Error("Refusing to overwrite an existing fixture route: " + route);
const temporaryConfig = join(root, "scripts/native-ui-temporary.config.mjs");
if (existsSync(temporaryConfig)) throw Error("Existing temporary browser config");
const nextConfigPath = join(root, "next.config.ts"), originalConfig = readFileSync(nextConfigPath, "utf8");
let server, tests, log;
let interrupted = false;
async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(done => {
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    child.once("close", () => { clearTimeout(timer); done(); });
    child.kill("SIGTERM");
  });
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { tests?.kill("SIGTERM"); server?.kill("SIGTERM"); interrupted = true; process.exitCode = 130; });
const env = { ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "", SUPABASE_SECRET_KEY: "", SUPABASE_URL: "", DATABASE_URL: "",
  ANTHROPIC_API_KEY: "", KEBU_REAL_PROVIDER_TEST: "", VERCEL_ENV: "",
  KEBU_LOCAL_OPERATION_UI: "1", KEBU_KCD_RENDER: "all", KEBU_KCD_OPERATIONS: "all",
  KEBU_LOCAL_S7_SNAPSHOT_FILE: join(output, "published-snapshot.json"),
};
const selected = process.env.KEBU_NATIVE_UI_SUITES?.split(",") ?? [
  "tests/creative-core/3j-editor-ui.local.spec.ts", "tests/creative-core/3j-published-ui.local.spec.ts",
  "tests/creative-core/builder-operation-ui.local.spec.ts", "tests/creative-core/builder-pages-ui.local.spec.ts",
];
try {
  rmSync(join(root, ".next/dev"), { recursive: true, force: true });
  mkdirSync(join(root, routes[0])); copyFileSync(join(root, "tests/creative-core/fixtures/s5-ui-page.tsx"), join(root, routes[0], "page.tsx"));
  mkdirSync(join(root, routes[1], "[slug]"), { recursive: true });
  copyFileSync(join(root, "tests/creative-core/fixtures/s7-ui-page.tsx"), join(root, routes[1], "[slug]/page.tsx"));
  writeFileSync(join(root, routes[1], "page.tsx"), 'import LocalPublished from "./[slug]/page"; export default function Home(){return <LocalPublished params={Promise.resolve({slug:"home"})} />;}');
  mkdirSync(join(root, routes[2])); copyFileSync(join(root, "tests/creative-core/fixtures/spatial-ui-page.tsx"), join(root, routes[2], "page.tsx"));
  writeFileSync(nextConfigPath, originalConfig.replace("const nextConfig: NextConfig = {", "const nextConfig: NextConfig = {\n  devIndicators: false,"));
  writeFileSync(temporaryConfig, `import {defineConfig} from "playwright/test"; export default defineConfig({testDir:${JSON.stringify(join(root,"tests"))},testMatch:"**/*.spec.ts",timeout:60000,maxFailures:1,workers:1,retries:0,reporter:[["list"],["json",{outputFile:${JSON.stringify(join(output,"results.json"))}}]],outputDir:${JSON.stringify(join(output,"traces"))},use:{actionTimeout:10000,baseURL:"http://127.0.0.1:38415",launchOptions:{executablePath:${JSON.stringify(executablePath)},args:["--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--no-zygote","--disable-software-rasterizer"]}}});`);
  log = createWriteStream(join(output, "server.log"));
  server = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "38415"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.pipe(log); server.stderr.pipe(log);
  await new Promise((done, fail) => { const timer = setTimeout(() => fail(Error("Local server startup timeout")), 30000); server.stdout.on("data", bytes => { if (bytes.toString().includes("Ready")) { clearTimeout(timer); done(); } }); server.on("exit", code => fail(Error("Server exited " + code))); });
  tests = spawn(process.execPath, [join(root, "node_modules/playwright/cli.js"), "test", ...selected, "--config", temporaryConfig], { cwd: root, env, stdio: "inherit" });
  const code = await new Promise((done, fail) => { tests.on("exit", done); tests.on("error", fail); });
  const report = JSON.parse(readFileSync(join(output, "results.json"), "utf8"));
  console.log("NATIVE_UI_RESULT", JSON.stringify(report.stats));
  if (code !== 0 || report.stats.unexpected > 0 || report.stats.expected < 1) throw Error("Native browser gate did not pass");
  if (interrupted) throw Error("Native browser gate interrupted");
  process.exitCode = 0;
} finally {
  // Next must release file watchers and child processes before fixtures/types are removed.
  await stopChild(tests);
  await stopChild(server);
  if (log && !log.writableFinished) await new Promise(done => log.end(done));
  writeFileSync(nextConfigPath, originalConfig);
  for (const route of routes) rmSync(join(root, route), { recursive: true, force: true });
  rmSync(temporaryConfig, { force: true });
  rmSync(join(root, ".next/dev/types"), { recursive: true, force: true });
  const validator = join(root, ".next/types/validator.ts");
  if (existsSync(validator) && /s5-local-probe|s7-local-probe|spatial-local-probe/.test(readFileSync(validator, "utf8"))) rmSync(join(root, ".next/types"), { recursive: true, force: true });
  const sandboxConfigRestored = readFileSync(nextConfigPath, "utf8") === originalConfig;
  if (existsSync(join(root, "evidence"))) cpSync(join(root, "evidence"), join(output, "screenshots"), { recursive: true });
  rmSync(root, { recursive: true, force: true });
  const remaining = [...routes, "scripts/native-ui-temporary.config.mjs"].filter(path => existsSync(join(sourceRoot, path)));
  const restoredConfig = sandboxConfigRestored && readFileSync(join(sourceRoot, "next.config.ts"), "utf8") === originalConfig;
  const cleanup = { testsStopped: !tests || tests.exitCode !== null || tests.signalCode !== null,
    serverStopped: !server || server.exitCode !== null || server.signalCode !== null,
    restoredConfig, remainingFixtures: remaining, sourceSandboxRemoved: !existsSync(root), generatedFixtureTypesRemoved: !existsSync(join(root, ".next/dev/types")) };
  writeFileSync(join(output, "cleanup.json"), JSON.stringify(cleanup, null, 2));
  console.log("NATIVE_UI_CLEANUP", JSON.stringify(cleanup));
  if (remaining.length || !restoredConfig || !cleanup.sourceSandboxRemoved || !cleanup.serverStopped || !cleanup.testsStopped || !cleanup.generatedFixtureTypesRemoved) throw Error("Native browser fixture cleanup failed");
}
