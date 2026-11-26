import { createServer, type Server, type RequestListener } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const secret = "isolated-worker-fixture-secret-123456789";
const id = "11111111-1111-4111-8111-111111111111";
let server: Server | undefined;
let child: ChildProcess | undefined;
async function serve(handler: RequestListener) {
  server = createServer(handler);
  await new Promise<void>(done => server!.listen(0, "127.0.0.1", done));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
function worker(origin?: string, extra: Record<string, string> = {}, continuous = false) {
  const processChild = spawn(process.execPath, [resolve("scripts/creative-generation-worker.mjs"), ...(continuous ? [] : ["--once"])], {
    env: { ...process.env, CREATIVE_GENERATION_APP_URL: "", CREATIVE_GENERATION_WORKER_URL: origin ?? "", CRON_SECRET: secret, CREATIVE_GENERATION_WORKER_INTERVAL_MS: "1000", ...extra },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child = processChild;
  let output = "";
  processChild.stdout!.on("data", bytes => { output += bytes; });
  processChild.stderr!.on("data", bytes => { output += bytes; });
  const done = new Promise<{ code: number | null; output: string }>((accept, reject) => {
    processChild.once("error", reject);
    processChild.once("close", code => accept({ code, output }));
  });
  return { child: processChild, done };
}
afterEach(async () => {
  if (child && child.exitCode === null && child.signalCode === null) {
    const active = child;
    await new Promise<void>(done => { active.once("close", () => done()); active.kill("SIGKILL"); });
  }
  server?.closeAllConnections();
  if (server) await new Promise<void>(done => server!.close(() => done()));
  server = undefined; child = undefined;
});

describe("unattended generation worker actual CLI and HTTP transport", () => {
  it.each([null, id])("authenticates and acknowledges a stage or idle receipt: %s", async runId => {
    let calls = 0;
    const origin = await serve((req, res) => {
      calls++;
      expect(req.method).toBe("GET");
      expect(req.url).toBe("/api/cron/creative-generation");
      expect(req.headers.authorization).toBe(`Bearer ${secret}`);
      res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ ok: true, runId }));
    });
    const result = await worker(origin).done;
    expect(result.code).toBe(0); expect(calls).toBe(1);
    expect(JSON.parse(result.output)).toMatchObject({ status: runId ? "stage_acknowledged" : "idle", runId });
    expect(result.output).not.toContain(secret);
  });
  it.each(["http://external.invalid", "https://user:password@external.invalid", "https://external.invalid/?token=private"]) ("refuses unsafe configuration without network: %s", async origin => {
    const result = await worker(origin).done;
    expect(result.code).toBe(1); expect(result.output).toContain("HTTPS origin");
    expect(result.output).not.toContain("password"); expect(result.output).not.toContain(secret);
  });
  it("refuses missing credentials before contacting the endpoint", async () => {
    const result = await worker("http://127.0.0.1:1", { CRON_SECRET: "" }).done;
    expect(result.code).toBe(1); expect(result.output).toContain("CRON_SECRET");
  });
  it("does not follow a redirect or forward its worker credential", async () => {
    let calls = 0;
    const origin = await serve((_req, res) => { calls++; res.writeHead(302, { location: "/unexpected" }); res.end(); });
    const result = await worker(origin).done;
    expect(result.code).toBe(1); expect(calls).toBe(1); expect(result.output).not.toContain(secret);
  });
  it.each([503, 200])("refuses unconfirmed status/body without exposing private responses: %i", async status => {
    const origin = await serve((_req, res) => { res.writeHead(status); res.end(JSON.stringify({ error: "PRIVATE_PROVIDER_RESPONSE", ok: false })); });
    const result = await worker(origin).done;
    expect(result.code).toBe(1); expect(result.output).toContain("unconfirmed");
    expect(result.output).not.toContain("PRIVATE_PROVIDER_RESPONSE"); expect(result.output).not.toContain(secret);
  });
  it("continues after a browser is absent, serializes calls and stops without submitting again", async () => {
    let active = 0, maximum = 0, calls = 0;
    let acknowledge!: () => void;
    const received = new Promise<void>(done => { acknowledge = done; });
    const origin = await serve((_req, res) => {
      active++; calls++; maximum = Math.max(maximum, active);
      res.on("finish", () => { active--; if (calls === 2) acknowledge(); });
      res.end(JSON.stringify({ ok: true, runId: id }));
    });
    const processWorker = worker(origin, {}, true);
    await received;
    processWorker.child.kill("SIGTERM");
    const result = await processWorker.done;
    expect(result.code).toBe(0); expect(calls).toBe(2); expect(maximum).toBe(1);
    expect(result.output).not.toContain(secret);
  });
});
