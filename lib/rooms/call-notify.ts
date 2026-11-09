import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueuePlatformJob } from "@/lib/platform/jobs";

/**
 * Notifies other room members that a call just started. Only call this when
 * room_call_join returned created:true — joining an already-active call
 * must never notify anyone (that's what presence inside the call UI is for).
 */
export async function notifyRoomCallStarted(
  admin: SupabaseClient,
  input: { roomId: string; callId: string; startedBy: string },
): Promise<number> {
  const { data: room } = await admin
    .from("rooms")
    .select("name")
    .eq("id", input.roomId)
    .maybeSingle();
  const roomName = typeof room?.name === "string" && room.name.trim() ? room.name.trim() : "a room";

  const { data: members } = await admin
    .from("room_members")
    .select("user_id")
    .eq("room_id", input.roomId)
    .neq("user_id", input.startedBy);

  const recipients = (members ?? []).map((m) => m.user_id as string);
  if (recipients.length === 0) return 0;

  const results = await Promise.allSettled(
    recipients.map((userId) =>
      enqueuePlatformJob(admin, {
        type: "notification.create",
        idempotencyKey: `notify:room_call_started:${input.callId}:${userId}`,
        payload: {
          userId,
          kind: "room.call_started",
          title: `Call started in ${roomName}`,
          body: "Someone started a call. Tap to join.",
          actionUrl: `/rooms/${input.roomId}/call`,
          metadata: { roomId: input.roomId, callId: input.callId },
        },
      }),
    ),
  );
  return results.filter((r) => r.status === "fulfilled").length;
}
