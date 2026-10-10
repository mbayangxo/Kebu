import { spawn } from "node:child_process";
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, rmdirSync, rmSync, unlinkSync } from "node:fs";
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
const output = resolve(root, "evidence/3c/s5/catalog-rendering");
mkdirSync(output, { recursive: true });
const route = resolve(root, "app/s5-local-probe");
if (existsSync(route)) throw new Error("Refusing to overwrite an existing local fixture route.");
mkdirSync(route);
copyFileSync(resolve(root, "tests/creative-core/fixtures/s5-ui-page.tsx"), resolve(route, "page.tsx"));
const port = process.env.KEBU_LOCAL_UI_PORT ?? "3100";
const baseURL = `http://127.0.0.1:${port}`;
const serverLog = createWriteStream(resolve(output, "dev.log"));
const server = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", port], {
  cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.pipe(serverLog); server.stderr.pipe(serverLog);
const browser = new BrowserManager();
let tests;
let interrupted = false;
const stop = () => {
  interrupted = true;
  process.exitCode = 130;
  tests?.kill("SIGTERM");
  try { process.kill(-server.pid, "SIGTERM"); } catch { /* already exited */ }
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
    { id: "screenshot", action: "screenshot", path: resolve(output, "dev.png") },
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
  tests = spawn("npx", ["playwright", "test", "tests/creative-core/builder-operation-ui.local.spec.ts",
    "tests/creative-core/catalog-renderer-ui.local.spec.ts", "--workers=1", ...process.argv.slice(2)], {
    cwd: root, stdio: "inherit", env: { ...process.env, KEBU_E2E_BASE_URL: baseURL, KEBU_LOCAL_OPERATION_UI: "1" },
  });
  process.exitCode = (await new Promise((resolve, reject) => { tests.once("exit", resolve); tests.once("error", reject); })) ?? 1;
  if (process.exitCode === 0 && process.env.KEBU_BUILDER_BROWSER_PERF_REPORT) {
    const check = spawn(process.execPath, [resolve(root, "scripts/check-kcd-browser-perf.mjs"),
      process.env.KEBU_BUILDER_BROWSER_PERF_REPORT, resolve(output, "builder-device-budgets.json")], { cwd: root, stdio: "inherit" });
    process.exitCode = (await new Promise((resolve, reject) => { check.once("exit", resolve); check.once("error", reject); })) ?? 1;
  }
} finally {
  await browser.close();
  try { process.kill(-server.pid, "SIGTERM"); } catch { /* already exited */ }
  serverLog.end();
  const fixture = resolve(route, "page.tsx");
  if (!readFileSync(fixture).equals(readFileSync(resolve(root, "tests/creative-core/fixtures/s5-ui-page.tsx")))) {
    throw new Error("Local fixture changed; refusing to remove it.");
  }
  unlinkSync(fixture);
  rmdirSync(route);
  // Next's generated dev types otherwise retain an import of the removed test route.
  rmSync(resolve(root, ".next/dev/types"), { recursive: true, force: true });
  rmSync(resolve(root, ".next/types"), { recursive: true, force: true });
}
