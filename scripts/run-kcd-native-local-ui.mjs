import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, copyFileSync, unlinkSync, rmdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Local Chromium/agent-browser tools are supplied by the execution environment.
// Running the server and clients together also works when separate shell calls
// have isolated loopback networks or cannot create the CLI's Unix daemon socket.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const toolRoot = process.env.KEBU_AGENT_BROWSER_ROOT;
const chromium = process.env.CHROMIUM_EXECUTABLE_PATH;
if (!toolRoot || !chromium) throw new Error("Set KEBU_AGENT_BROWSER_ROOT and CHROMIUM_EXECUTABLE_PATH to installed local tools.");
const { BrowserManager } = await import(pathToFileURL(resolve(toolRoot, "dist/browser.js")));
const { executeCommand } = await import(pathToFileURL(resolve(toolRoot, "dist/actions.js")));
const publishRegression = process.env.KEBU_LOCAL_UI_PUBLISH === "1";
const spatialRegression = process.env.KEBU_LOCAL_UI_SPATIAL === "1";
const output = process.env.KEBU_LOCAL_UI_EVIDENCE_DIR ? resolve(root,process.env.KEBU_LOCAL_UI_EVIDENCE_DIR) : spatialRegression ? resolve(root, "evidence/3d") : resolve(root, publishRegression ? "evidence/3c/s7" : "evidence/3c/s6");
mkdirSync(output, { recursive: true });
const legacyRegression = process.env.KEBU_LOCAL_UI_LEGACY_REGRESSION === "1";
const fixtureSource = resolve(root, "tests/creative-core/fixtures/s5-ui-page.tsx");
const fixtureRoute = resolve(root, "app/s5-local-probe");
if (legacyRegression) {
  if (existsSync(fixtureRoute)) {
    if (!readFileSync(resolve(fixtureRoute, "page.tsx")).equals(readFileSync(fixtureSource))) throw new Error("Refusing to overwrite an existing fixture.");
  } else { mkdirSync(fixtureRoute); copyFileSync(fixtureSource, resolve(fixtureRoute, "page.tsx")); }
}
const publishRoute = resolve(root, "app/s7-local-probe/[slug]");
if (publishRegression) { if (existsSync(publishRoute)) throw new Error("Existing publish fixture"); mkdirSync(publishRoute, { recursive: true }); copyFileSync(resolve(root, "tests/creative-core/fixtures/s7-ui-page.tsx"), resolve(publishRoute, "page.tsx")); writeFileSync(resolve(dirname(publishRoute),"page.tsx"), 'import LocalPublished from "./[slug]/page";\nexport default function LocalHome(){return <LocalPublished params={Promise.resolve({slug:"home"})} />;}\n'); }
const spatialRoute = resolve(root, "app/spatial-local-probe");
if (spatialRegression) { if (existsSync(spatialRoute)) throw new Error("Existing spatial fixture"); mkdirSync(spatialRoute); copyFileSync(resolve(root, "tests/creative-core/fixtures/spatial-ui-page.tsx"), resolve(spatialRoute, "page.tsx")); }
const testFiles = process.env.KEBU_LOCAL_UI_TEST_FILES ? process.env.KEBU_LOCAL_UI_TEST_FILES.split(",") : spatialRegression ? ["tests/creative-core/primitive-ui.local.spec.ts", "tests/creative-core/spatial-published-ui.local.spec.ts"] : publishRegression ? ["tests/creative-core/kcd-published-ui.local.spec.ts"] : legacyRegression ? ["tests/creative-core/builder-operation-ui.local.spec.ts", "tests/creative-core/catalog-renderer-ui.local.spec.ts"] : ["tests/creative-core/primitive-ui.local.spec.ts"];
const port = process.env.KEBU_LOCAL_UI_PORT ?? "3100";
const baseURL = `http://127.0.0.1:${port}`;
const serverLog = createWriteStream(resolve(output, "dev.log"));
// The development badge covers the phone's bottom Undo button. This does not hide build/runtime errors.
const configPath = resolve(root, "next.config.ts");
const originalConfig = readFileSync(configPath, "utf8");
const testConfig = originalConfig.replace("const nextConfig: NextConfig = {", "const nextConfig: NextConfig = {\n  devIndicators: false,");
if (testConfig === originalConfig) throw new Error("Next configuration format changed; refusing a test override.");
writeFileSync(configPath, testConfig);
const server = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", port], {
  cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, KEBU_LOCAL_OPERATION_UI: "1" },
});
server.stdout.pipe(serverLog); server.stderr.pipe(serverLog);
const browser = new BrowserManager();
let tests;
let interrupted = false;
const stop = () => {
  interrupted = true;
  process.exitCode = 130;
  tests?.kill("SIGTERM");
  server.kill("SIGTERM");
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
try {
  let ready = false;
  for (let i = 0; i < 150 && !interrupted; i++) {
    try { if ((await fetch(baseURL)).status < 500) { ready = true; break; } } catch { /* server starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error("Local dev server did not become available.");
  await browser.launch({ id: "launch", action: "launch", executablePath: chromium, headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
  for (const command of [
    { id: "navigate", action: "navigate", url: baseURL, waitUntil: "networkidle" },
    { id: "snapshot", action: "snapshot", interactive: true },
    { id: "screenshot", action: "screenshot", path: resolve(output, "dev-native.png") },
    { id: "evaluate", action: "evaluate", script: '({hasContent: document.body.innerText.trim().length > 0, errorOverlay: Boolean(document.querySelector("[data-nextjs-dialog]"))})' },
  ]) {
    const result = await executeCommand(command, browser);
    console.log(JSON.stringify(result));
    if (!result.success || (command.action === "evaluate" && (!result.data.result.hasContent || result.data.result.errorOverlay))) {
      throw new Error("Local agent-browser verification failed.");
    }
  }
  const errors = browser.getPageErrors();
  const consoleErrors = browser.getConsoleMessages().filter((message) => message.type === "error");
  console.log("PAGE_ERRORS", JSON.stringify(errors), "CONSOLE_ERRORS", JSON.stringify(consoleErrors));
  if (errors.length || consoleErrors.length) throw new Error("Local dev page has browser errors.");
  await browser.close();
  tests = spawn(process.execPath, [resolve(root, "node_modules/@playwright/test/cli.js"), "test", ...testFiles, "--workers=1", ...process.argv.slice(2)], {
    cwd: root, stdio: "inherit", env: { ...process.env, KEBU_E2E_BASE_URL: baseURL, KEBU_LOCAL_OPERATION_UI: "1" },
  });
  process.exitCode = (await new Promise((resolve, reject) => { tests.once("exit", resolve); tests.once("error", reject); })) ?? 1;
  if (process.exitCode === 0 && process.env.KEBU_BUILDER_BROWSER_PERF_REPORT) {
    const check = spawn(process.execPath, [resolve(root, "scripts/check-kcd-browser-perf.mjs"),
      process.env.KEBU_BUILDER_BROWSER_PERF_REPORT, resolve(root, "evidence/3c/s5/catalog-rendering/builder-device-budgets.json")], { cwd: root, stdio: "inherit" });
    process.exitCode = (await new Promise((resolve, reject) => { check.once("exit", resolve); check.once("error", reject); })) ?? 1;
  }
} finally {
  if (readFileSync(configPath, "utf8") === testConfig) writeFileSync(configPath, originalConfig);
  else throw new Error("Next configuration changed during verification; refusing to overwrite it.");
  if (legacyRegression && existsSync(resolve(fixtureRoute, "page.tsx"))) {
    if (!readFileSync(resolve(fixtureRoute, "page.tsx")).equals(readFileSync(fixtureSource))) throw new Error("Fixture changed; refusing to remove it.");
    unlinkSync(resolve(fixtureRoute, "page.tsx")); rmdirSync(fixtureRoute);
  }
  if (spatialRegression) { unlinkSync(resolve(spatialRoute, "page.tsx")); rmdirSync(spatialRoute); }
  if (publishRegression) { unlinkSync(resolve(publishRoute,"page.tsx")); rmdirSync(publishRoute); unlinkSync(resolve(dirname(publishRoute),"page.tsx")); rmdirSync(dirname(publishRoute)); }
  rmSync(resolve(root, ".next/dev/types"), { recursive: true, force: true });
  rmSync(resolve(root, ".next/types"), { recursive: true, force: true });
  await browser.close();
  serverLog.end();
  server.kill("SIGTERM");
}
