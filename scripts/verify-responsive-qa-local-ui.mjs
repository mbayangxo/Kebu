/** Runs tests/platform/responsive-qa-live.local.spec.ts against a real `next dev` on public pages — no DB/auth fixture needed. */
import { spawn } from "node:child_process";
import { mkdtempSync, cpSync, existsSync, constants, readdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, createWriteStream } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// This repo checkout may be a git worktree without its own node_modules — build
// a throwaway copy (source from here, node_modules from wherever a real
// install exists) so `next dev` can actually start, same pattern as
// scripts/verify-site-contact-local-ui.mjs.
const nodeModulesSource = existsSync(join(source, "node_modules", "next"))
  ? join(source, "node_modules")
  : join(process.env.KEBU_NODE_MODULES_PATH ?? "/home/user/Kebu/node_modules");
if (!existsSync(join(nodeModulesSource, "next"))) {
  throw new Error(`No real node_modules found at ${nodeModulesSource} or in this checkout.`);
}
const chromium = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH ?? "/opt/pw-browsers/chromium";
const output = mkdtempSync(join(tmpdir(), "kebu-responsive-qa-output-"));
const port = process.env.KEBU_RESPONSIVE_QA_PORT ?? "38442";
const root = mkdtempSync(join(tmpdir(), "kebu-responsive-qa-source-"));
for (const directory of ["app", "lib", "public", "scripts", "tests"]) {
  if (existsSync(join(source, directory))) cpSync(join(source, directory), join(root, directory), { recursive: true, mode: constants.COPYFILE_FICLONE });
}
cpSync(nodeModulesSource, join(root, "node_modules"), { recursive: true, mode: constants.COPYFILE_FICLONE });
for (const entry of readdirSync(source, { withFileTypes: true })) {
  if (entry.isFile() && !entry.name.startsWith(".") && /\.(?:[cm]?[jt]sx?|json)$/.test(entry.name)) {
    copyFileSync(join(source, entry.name), join(root, entry.name));
  }
}

const configPath = join(root, "scripts", "responsive-qa-temporary.config.mjs");
writeFileSync(
  configPath,
  `import{defineConfig}from"playwright/test";export default defineConfig({testDir:${JSON.stringify(join(root, "tests/platform"))},testMatch:"responsive-qa-live.local.spec.ts",workers:1,retries:0,maxFailures:3,timeout:60000,reporter:[["list"],["json",{outputFile:${JSON.stringify(join(output, "results.json"))}}]],outputDir:${JSON.stringify(join(output, "traces"))},use:{baseURL:${JSON.stringify(`http://127.0.0.1:${port}`)},actionTimeout:10000${chromium ? `,launchOptions:{executablePath:${JSON.stringify(chromium)},args:["--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--no-zygote"]}` : ""}}});`,
);

const log = createWriteStream(join(output, "server.log"));

async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((done) => {
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    child.once("close", () => {
      clearTimeout(timer);
      done();
    });
    child.kill("SIGTERM");
  });
}

let server, tests;
try {
  server = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", port], {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.pipe(log);
  server.stderr.pipe(log);
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error("Startup timeout")), 60000);
    server.stdout.on("data", (bytes) => {
      if (bytes.toString().includes("Ready")) {
        clearTimeout(timer);
        done();
      }
    });
    server.once("exit", (code) => fail(new Error("Server exit " + code)));
  });
  // "Ready" in stdout can print slightly before the listener actually accepts
  // connections — poll until a real request succeeds instead of racing it.
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await fetch(`http://127.0.0.1:${port}/opportunities`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
      if (attempt === 29) throw new Error("Server never became reachable after Ready.");
    }
  }

  tests = spawn(process.execPath, [join(root, "node_modules/playwright/cli.js"), "test", "--config", configPath], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  const code = await new Promise((done) => tests.once("exit", done));
  const stats = JSON.parse(readFileSync(join(output, "results.json"), "utf8")).stats;
  console.log("RESPONSIVE_QA_RESULT", JSON.stringify(stats));
  if (code || stats.unexpected) throw new Error("Responsive QA live gate failed");
} finally {
  await stop(tests);
  await stop(server);
  log.end();
  rmSync(root, { recursive: true, force: true });
  console.log("RESPONSIVE_QA_CLEANUP", JSON.stringify({ serverStopped: true, sourceCopyRemoved: true, noProductionWrites: true }));
}
