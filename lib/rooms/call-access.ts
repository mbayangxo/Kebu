import { createHmac } from "node:crypto";

/** Calls ship on by default; set KEBU_CALLS_DISABLED=true to kill-switch them. */
export function privateCallsEnabled(env: NodeJS.ProcessEnv) {
  return env.KEBU_CALLS_DISABLED !== "true";
}

const PUBLIC_STUN_FALLBACK: RTCIceServer = { urls: "stun:stun.l.google.com:19302" };

/**
 * STUN lets a peer discover its public address; TURN relays media when a
 * direct path can't be found (symmetric NATs, locked-down networks). TURN
 * needs a deployed relay (coturn or similar) and is optional — calls degrade
 * to direct/STUN-only connectivity without it. The relay must be configured
 * with coturn's time-limited shared-secret auth.
 */
export function callIceServers(env: NodeJS.ProcessEnv, userId: string, now = Date.now()): RTCIceServer[] {
  const stun = env.KEBU_ROOM_STUN_URL;
  const turn = env.KEBU_ROOM_TURN_URL;
  const secret = env.KEBU_ROOM_TURN_SECRET;
  const servers: RTCIceServer[] = stun?.startsWith("stun:") ? [{ urls: stun }] : [PUBLIC_STUN_FALLBACK];
  if (turn && /^turns?:[^\s]+$/.test(turn) && secret) {
    const username = `${Math.floor(now / 1000) + 35 * 60}:${userId}`;
    servers.push({ urls: turn, username, credential: createHmac("sha1", secret).update(username).digest("base64") });
  }
  return servers;
}
