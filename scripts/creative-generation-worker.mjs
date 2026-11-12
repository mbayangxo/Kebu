import { setTimeout as delay } from "node:timers/promises";

// A separate process drives the existing fenced SQL stages. It never
// reads or forwards provider/Supabase keys and never marks a request complete by itself.
function configuration(env) {
  const rawOrigin = env.CREATIVE_GENERATION_WORKER_URL?.trim() || env.CREATIVE_GENERATION_APP_URL;
  let origin;
  try {
    const url = new URL(rawOrigin);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))) throw new Error();
    origin = url.origin;
  } catch {
    throw new Error("Set CREATIVE_GENERATION_WORKER_URL to the Kebu HTTPS origin (HTTP is allowed only on loopback).");
  }
  const secret = env.CRON_SECRET?.trim();
  if (!secret || secret.length < 32 || /^(change_me|replace_|your_|example)/i.test(secret)) {
    throw new Error("Set a non-placeholder CRON_SECRET of at least 32 characters.");
  }
  const interval = Number(env.CREATIVE_GENERATION_WORKER_INTERVAL_MS ?? 5000);
  if (!Number.isInteger(interval) || interval < 1000 || interval > 60000) {
    throw new Error("CREATIVE_GENERATION_WORKER_INTERVAL_MS must be between 1000 and 60000.");
  }
  return { origin, secret, interval };
}

async function receipt(response) {
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Worker endpoint returned HTTP ${response.status}; no stage receipt confirmed.`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Worker endpoint returned no stage receipt.");
  let size = 0;
  const chunks = [];
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new Error("Worker endpoint returned an oversized receipt.");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  let result;
  try { result = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch {
    throw new Error("Worker endpoint returned an invalid receipt.");
  }
  if (result?.ok !== true || !(result.runId === null ||
    (typeof result.runId === "string" && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(result.runId)))) {
    throw new Error("Worker endpoint did not confirm a valid stage receipt.");
  }
  return result.runId;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--once") || args.length > 1) throw new Error("Usage: npm run generation:worker -- [--once]");
  const once = args.includes("--once"), config = configuration(process.env);
  const stopped = new AbortController();
  const stop = () => stopped.abort();
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  let failures = 0;
  try {
    do {
      try {
        const response = await fetch(`${config.origin}/api/cron/creative-generation`, {
          headers: { Authorization: `Bearer ${config.secret}` },
          redirect: "error", cache: "no-store",
          signal: AbortSignal.any([stopped.signal, AbortSignal.timeout(125000)]),
        });
        const runId = await receipt(response);
        failures = 0;
        console.log(JSON.stringify({ worker: "creative-generation", status: runId ? "stage_acknowledged" : "idle", runId }));
      } catch (error) {
        if (stopped.signal.aborted) break;
        failures++;
        // Fetch errors can contain URLs; provider bodies can contain private data.
        // Only our known receipt errors are safe to log.
        const message = error instanceof Error && error.message.startsWith("Worker endpoint")
          ? error.message : "Worker transport failed; no stage receipt confirmed.";
        console.error(JSON.stringify({ worker: "creative-generation", status: "unconfirmed", message }));
        if (once) { process.exitCode = 1; break; }
      }
      if (once || stopped.signal.aborted) break;
      const pause = Math.min(60000, config.interval * (2 ** Math.min(failures, 6)));
      await delay(pause, undefined, { signal: stopped.signal }).catch(error => {
        if (!stopped.signal.aborted) throw error;
      });
    } while (!stopped.signal.aborted);
  } finally {
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Creative worker could not start.");
  process.exitCode = 1;
});
