import { spawn } from "node:child_process";
import { mkdtempSync, chmodSync, rmSync, existsSync, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createServer } from "node:net";
import pg from "pg";

// Disposable native PostgreSQL only. Binaries come from a separately pinned local tool install.
const nativeRoot = process.env.KEBU_POSTGRES_NATIVE_ROOT;
if (!nativeRoot || !existsSync(join(nativeRoot, "bin/postgres")) || !existsSync(join(nativeRoot, "bin/initdb"))) throw Error("Set KEBU_POSTGRES_NATIVE_ROOT to installed native PostgreSQL binaries");
const directory = mkdtempSync(join(tmpdir(), "kebu-native-3j-")); chmodSync(directory, 0o777);
const data = join(directory, "data"), log = createWriteStream(resolve("evidence/3j/native-postgres.log"));
const env = { ...process.env, LD_LIBRARY_PATH: `${join(nativeRoot, "lib")}${process.env.LD_LIBRARY_PATH ? `:${process.env.LD_LIBRARY_PATH}` : ""}`, TZ: "UTC" };
const identity = process.getuid?.() === 0 ? { uid: 65534, gid: 65534 } : {};
const childOptions = { cwd: tmpdir(), env, ...identity };
const finished = child => new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", code => resolve(code)); });
let server, tests;
try {
  const init = spawn(join(nativeRoot, "bin/initdb"), ["-D", data, "-U", "postgres", "--auth=trust", "--encoding=UTF8", "--locale=C"], childOptions);
  init.stdout.pipe(log, { end: false }); init.stderr.pipe(log, { end: false });
  if (await finished(init) !== 0) throw Error("Disposable PostgreSQL initialization failed; see native-postgres.log");
  const socket = createServer(); await new Promise((resolve, reject) => { socket.once("error", reject); socket.listen(0, "127.0.0.1", resolve); });
  const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
  server = spawn(join(nativeRoot, "bin/postgres"), ["-D", data, "-h", "127.0.0.1", "-p", String(port), "-k", directory], childOptions);
  server.stdout.pipe(log, { end: false }); server.stderr.pipe(log, { end: false });
  const url = `postgresql://postgres@127.0.0.1:${port}/postgres`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 300 });
    try { await client.connect(); console.log("Native PostgreSQL", (await client.query("select version() as version")).rows[0].version); ready = true; break; }
    catch { if (server.exitCode !== null) throw Error("Native PostgreSQL stopped before becoming ready"); }
    finally { await client.end().catch(() => {}); }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw Error("Native PostgreSQL did not become ready");
  const args = process.argv.slice(2), ci = args[0] === "--ci";
  const command = ci ? "npm" : process.execPath;
  const testArgs = ci ? ["run", "ci"] : [resolve("node_modules/vitest/vitest.mjs"), "run", ...(args.length ? args : ["tests/creative-core/experience-concurrency.local.test.ts", "tests/creative-core/kcd-publish-concurrency.local.test.ts"])];
  tests = spawn(command, testArgs, { cwd: process.cwd(), stdio: "inherit", env: { ...process.env, KEBU_PUBLISH_CONCURRENCY_DATABASE_URL: url } });
  const interrupt = () => { tests.kill("SIGTERM"); server.kill("SIGTERM"); };
  process.once("SIGINT", interrupt); process.once("SIGTERM", interrupt);
  process.exitCode = (await finished(tests)) ?? 1;
} finally {
  if (server?.exitCode === null) { const stopped = finished(server); server.kill("SIGTERM"); await stopped; }
  log.end(); rmSync(directory, { recursive: true, force: true });
}
