import { createHmac } from "node:crypto";

const qaOrigin = "https://skqnxyaeimvbyrmdfzvk.supabase.co";

export function privateCallsEnabled(env: NodeJS.ProcessEnv) {
  if (env.NEXT_PUBLIC_KEBU_PRIVATE_CALLS !== "true" || env.VERCEL_ENV === "production") return false;
  if (env.VERCEL_ENV === "preview") {
    return env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") === qaOrigin;
  }
  if (env.NODE_ENV !== "development" && env.NODE_ENV !== "test") return false;
  try {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return url.origin === qaOrigin || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch { return false; }
}

// The relay must be configured with coturn's time-limited shared-secret auth.
export function callIceServers(env: NodeJS.ProcessEnv, userId: string, now = Date.now()): RTCIceServer[] {
  const stun = env.KEBU_ROOM_STUN_URL;
  const turn = env.KEBU_ROOM_TURN_URL;
  const secret = env.KEBU_ROOM_TURN_SECRET;
  const servers: RTCIceServer[] = stun?.startsWith("stun:") ? [{ urls: stun }] : [];
  if (turn && /^turns?:[^\s]+$/.test(turn) && secret) {
    const username = `${Math.floor(now / 1000) + 35 * 60}:${userId}`;
    servers.push({ urls: turn, username, credential: createHmac("sha1", secret).update(username).digest("base64") });
  }
  return servers;
}
