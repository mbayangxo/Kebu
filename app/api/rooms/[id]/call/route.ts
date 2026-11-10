import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { callIceServers, privateCallsEnabled } from "@/lib/rooms/call-access";
import { notifyRoomCallStarted } from "@/lib/rooms/call-notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { platformLog } from "@/lib/platform/observability";

const uuid = z.string().uuid();
const actions = z.discriminatedUnion("action", [
  // Only meaningful when this join actually starts a new call - the RPC
  // ignores it when joining one already in progress, since that call's cap
  // was fixed at creation. Range matches room_calls.max_participants' check
  // constraint; the RPC also clamps, this just gives a clean 400 for the UI.
  z.object({ action: z.literal("join"), maxParticipants: z.number().int().min(2).max(8).optional() }),
  z.object({ action: z.literal("leave"), call: uuid }),
  z.object({ action: z.literal("end"), call: uuid }),
]);
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!privateCallsEnabled(process.env)) return reply({ error: "Calls are unavailable." }, 404);
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const room = uuid.safeParse((await params).id);
  const input = actions.safeParse(await req.json().catch(() => null));
  if (!room.success || !input.success) return reply({ error: "Invalid call request." }, 400);

  const a = input.data;
  if (a.action === "join") {
    const { data, error } = await auth.supabase.rpc("room_call_join", {
      p_room: room.data,
      ...(a.maxParticipants !== undefined ? { p_max_participants: a.maxParticipants } : {}),
    });
    if (error?.message === "Call is full") return reply({ error: error.message }, 409);
    if (error) return reply({ error: "Calls are unavailable. Try again later." }, 503);
    if (!data) return reply({ error: "You don't have access to this room." }, 404);
    if (data.created === true) {
      try {
        const admin = createAdminClient();
        await notifyRoomCallStarted(admin, { roomId: room.data, callId: data.id, startedBy: auth.user.id });
      } catch (cause) {
        platformLog.error("room_call.notify_failed", {
          roomId: room.data, callId: data.id,
          error: cause instanceof Error ? cause.message : String(cause),
        });
      }
    }
    return reply({ ...data, userId: auth.user.id, iceServers: callIceServers(process.env, auth.user.id) });
  }

  const { data, error } = await auth.supabase.rpc(
    a.action === "leave" ? "room_call_leave" : "room_call_end",
    { p_call: a.call },
  );
  if (error) return reply({ error: "Calls are unavailable. Try again later." }, 503);
  if (!data) return reply({ error: "This call is unavailable or you can't manage it." }, 404);
  return reply(data);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!privateCallsEnabled(process.env)) return reply({ error: "Calls are unavailable." }, 404);
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const room = uuid.safeParse((await params).id);
  if (!room.success) return reply({ error: "Invalid room id." }, 400);

  const { data: calls, error } = await auth.supabase
    .from("room_calls")
    .select("id, started_by, started_at, ended_at, max_participants")
    .eq("room_id", room.data)
    .order("started_at", { ascending: false })
    .limit(25);
  if (error) return reply({ error: "Could not load call history." }, 503);

  const callIds = (calls ?? []).map((c) => c.id);
  const participantsByCall: Record<string, { user_id: string; joined_at: string; left_at: string | null }[]> = {};
  if (callIds.length) {
    const { data: participants } = await auth.supabase
      .from("room_call_participants")
      .select("call_id, user_id, joined_at, left_at")
      .in("call_id", callIds);
    for (const p of participants ?? []) {
      (participantsByCall[p.call_id] ??= []).push({ user_id: p.user_id, joined_at: p.joined_at, left_at: p.left_at });
    }
  }

  return reply({
    calls: (calls ?? []).map((c) => ({ ...c, participants: participantsByCall[c.id] ?? [] })),
  });
}
