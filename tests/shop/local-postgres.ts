import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";

/** Tests only: private fresh cluster, TCP loopback, no hosted credentials. */
export async function startCartPostgres(bin: string) {
  const data = mkdtempSync(join(tmpdir(), "kebu-cart-db-"));
  const port = await new Promise<number>((resolve, reject) => {
    const server = createServer(); server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("No TCP port"));
      server.close(() => resolve(address.port));
    });
  });
  execFileSync(join(bin, "initdb"), ["-D", data, "-A", "trust", "-U", "postgres", "--no-locale", "-E", "UTF8"], { stdio: "pipe" });
  const child = spawn(join(bin, "postgres"), ["-D", data, "-h", "127.0.0.1", "-p", String(port), "-c", "unix_socket_directories="], { stdio: ["ignore", "pipe", "pipe"] });
  let logs = "";
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error(`Postgres startup timed out: ${logs}`)); }, 10000);
    child.on("error", error => { clearTimeout(timer); reject(error); });
    child.on("exit", code => { clearTimeout(timer); reject(new Error(`Postgres exited ${code}: ${logs}`)); });
    child.stderr.on("data", chunk => {
      logs += String(chunk);
      if (logs.includes("ready to accept connections")) { clearTimeout(timer); resolve(); }
    });
  });
  return {
    url: `postgres://postgres@127.0.0.1:${port}/postgres`,
    stop: async () => {
      await new Promise<void>(resolve => { child.once("exit", () => resolve()); child.kill("SIGTERM"); });
      rmSync(data, { recursive: true, force: true });
    },
  };
}
