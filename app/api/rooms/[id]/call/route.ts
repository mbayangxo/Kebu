import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";

import { callIceServers, privateCallsEnabled } from "@/lib/rooms/call-qa";

const uuid = z.string().uuid();
const actions = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), guest: uuid }),
  z.object({ action: z.literal("end"), call: uuid }),
  z.object({ action: z.literal("read"), call: uuid, media: z.boolean().optional() }),
  z.object({ action: z.enum(["offer", "answer"]), call: uuid, sdp: z.string().startsWith("v=0").max(32768) }),
]);
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!privateCallsEnabled(process.env)) return reply({ error: "Private calling is unavailable." }, 404);
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const room = uuid.safeParse((await params).id);
  const input = actions.safeParse(await req.json().catch(() => null));
  if (!room.success || !input.success) return reply({ error: "Invalid call request." }, 400);

  const a = input.data;
  const { data, error } = await auth.supabase.rpc("room_call_exchange", {
    p_room: room.data, p_action: a.action,
    p_call: "call" in a ? a.call : null,
    p_guest: "guest" in a ? a.guest : null,
    p_sdp: "sdp" in a ? a.sdp : null,
  });
  if (error?.message === "End your current call before starting another")
    return reply({ error: error.message }, 409);
  if (error) return reply({ error: "Private calling is unavailable. Try again later." }, 503);
  if (!data) return reply({ error: "This call is unavailable or you were not invited." }, 404);
  const iceServers = a.action === "read" && a.media && !data.ended
    ? callIceServers(process.env, auth.user.id) : [];
  return reply({ ...data, iceServers });
}
