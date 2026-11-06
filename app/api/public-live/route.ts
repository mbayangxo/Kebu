import { createAdminClient } from "@/lib/supabase/admin";
import { joinGrant, signMediaToken } from "@/lib/live/media";

import { sandboxGift } from "@/lib/live/gifts";

export const runtime = "nodejs";
const qaOrigin = "https://skqnxyaeimvbyrmdfzvk.supabase.co";
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const reasons = ["harassment", "sexual_content", "violence", "spam", "other"];
const select = "id,title,created_at,expires_at";
const json = (data: object, status = 200) => Response.json(data, {
  status, headers: { "Cache-Control": "private, no-store" },
});
function media() {
  const { KEBU_LIVE_MEDIA_URL: url, KEBU_LIVE_MEDIA_KEY: key, KEBU_LIVE_MEDIA_SECRET: secret } = process.env;
  return url && /^wss:\/\/[^/?#]+\/?$/.test(url) && key && secret ? { url, key, secret } : null;
}
function enabled() {
  return process.env.KEBU_PUBLIC_LIVE_QA === "true" && process.env.VERCEL_ENV !== "production"
    && process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") === qaOrigin && media();
}

export async function GET() {
  if (!enabled()) return json({ error: "Live Rooms is not available in this environment." }, 503);
  const db = createAdminClient();
  const { data, error } = await db.from("kebu_live_broadcasts").select(select).is("ended_at", null)
    .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(40);
  return error ? json({ error: "Could not load rooms." }, 503) : json({ rooms: data });
}

export async function POST(request: Request) {
  const config = enabled();
  if (!config) return json({ error: "Live Rooms is not available in this environment." }, 503);
  const db = createAdminClient();
  const bearer = request.headers.get("authorization")?.match(/^Bearer ([^\s]{1,4096})$/i)?.[1];
  if (!bearer) return json({ error: "Sign in with KEBU to continue." }, 401);
  const { data: { user } } = await db.auth.getUser(bearer);
  if (!user || user.is_anonymous) return json({ error: "Sign in with KEBU to continue." }, 401);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "Invalid request." }, 400);
  const parts: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.length;
    if (bytes > 2048) { await reader.cancel(); return json({ error: "Request too large." }, 413); }
    parts.push(chunk.value);
  }
  const text = Buffer.concat(parts).toString("utf8");
  if (text.length > 2048) return json({ error: "Request too large." }, 413);
  const body = await Promise.resolve().then(() => JSON.parse(text)).catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid request." }, 400);
  const now = new Date().toISOString();

  if (body.action === "start") {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length < 3 || title.length > 80 || /[\u0000-\u001f\u007f]/.test(title)) {
      return json({ error: "Enter a title between 3 and 80 characters." }, 400);
    }
    const prior = await db.from("kebu_live_broadcasts").update({ ended_at: now })
      .eq("host_id", user.id).is("ended_at", null).lte("expires_at", now);
    if (prior.error) return json({ error: "Could not start a room." }, 503);
    const { data, error } = await db.from("kebu_live_broadcasts").insert({ title, host_id: user.id })
      .select(select).single();
    return error ? json({ error: error.code === "23505" ? "You already have an open room." : "Could not start a room." },
      error.code === "23505" ? 409 : 503) : json({ room: data }, 201);
  }

  if (typeof body.id !== "string" || !uuid.test(body.id)) return json({ error: "Invalid room." }, 400);
  const { data: room, error } = await db.from("kebu_live_broadcasts").select(`${select},host_id,ended_at`)
    .eq("id", body.id).maybeSingle();
  if (error) return json({ error: "Could not load room." }, 503);
  if (!room) return json({ error: "Room not found." }, 404);
  const host = room.host_id === user.id;

  if (body.action === "gift") {
    if (host || typeof body.requestId !== "string" || !uuid.test(body.requestId)) {
      return json({ status: "invalid" }, 400);
    }
    const result = await sandboxGift({
      sender: user.id, recipient: room.host_id, requestId: body.requestId, roomId: room.id,
      gift: body.gift, verifyOnly: Boolean(room.ended_at || room.expires_at <= now),
    });
    return json(result, result.status === "completed" ? 200 : result.status === "pending" ? 202
      : result.status === "disabled" ? 503 : 422);
  }

  if (body.action === "end") {
    if (!host) return json({ error: "Only the host can end this room." }, 403);
    const result = await db.from("kebu_live_broadcasts").update({ ended_at: now }).eq("id", room.id)
      .eq("host_id", user.id).is("ended_at", null);
    if (result.error) return json({ error: "Could not close room." }, 503);
    const token = signMediaToken(config.key, config.secret, user.id, { roomCreate: true });
    const deleted = await fetch(`${config.url.replace(/^wss:/, "https:").replace(/\/$/, "")}/twirp/livekit.RoomService/DeleteRoom`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ room: `kebu-live-${room.id}` }), signal: AbortSignal.timeout(6000),
    }).catch(() => null);
    if (!deleted || (!deleted.ok && deleted.status !== 404)) {
      return json({ error: "Room hidden. Live connection could not be closed; retry End room." }, 503);
    }
    return json({ ended: true });
  }
  if (body.action === "report") {
    if (host || !reasons.includes(body.reason)) return json({ error: "Choose a report reason." }, 400);
    const report = await db.from("kebu_live_reports").insert({
      broadcast_id: room.id, reporter_id: user.id, reason: body.reason,
    });
    return report.error && report.error.code !== "23505"
      ? json({ error: "Could not submit report." }, 503) : json({ reported: true });
  }
  if (body.action !== "join") return json({ error: "Unknown action." }, 400);
  if (room.ended_at || room.expires_at <= now) return json({ error: "This room has ended." }, 410);
  return json({ url: config.url, token: signMediaToken(config.key, config.secret, user.id, joinGrant(room.id, host)), host });
}
