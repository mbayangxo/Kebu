import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ enqueuePlatformJob: vi.fn() }));
vi.mock("@/lib/platform/jobs", () => ({ enqueuePlatformJob: deps.enqueuePlatformJob }));

import { notifyRoomCallStarted } from "@/lib/rooms/call-notify";

const roomId = "22222222-2222-4222-8222-222222222222";
const callId = "33333333-3333-4333-8333-333333333333";
const starter = "11111111-1111-4111-8111-111111111111";
const memberA = "44444444-4444-4444-8444-444444444444";
const memberB = "55555555-5555-4555-8555-555555555555";

function fakeAdmin(members: { user_id: string }[], roomName = "Launch planning") {
  return {
    from: vi.fn((table: string) => {
      if (table === "rooms") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { name: roomName } }) }) }) };
      }
      if (table === "room_members") {
        return { select: () => ({ eq: () => ({ neq: async () => ({ data: members }) }) }) };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as Parameters<typeof notifyRoomCallStarted>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.enqueuePlatformJob.mockResolvedValue(undefined);
});

describe("notifyRoomCallStarted", () => {
  it("notifies every other room member, never the person who started the call", async () => {
    const admin = fakeAdmin([{ user_id: memberA }, { user_id: memberB }]);
    const count = await notifyRoomCallStarted(admin, { roomId, callId, startedBy: starter });
    expect(count).toBe(2);
    expect(deps.enqueuePlatformJob).toHaveBeenCalledTimes(2);
    const recipients = deps.enqueuePlatformJob.mock.calls.map((c) => (c[1].payload as { userId: string }).userId);
    expect(recipients.sort()).toEqual([memberA, memberB].sort());
    expect(recipients).not.toContain(starter);
  });

  it("builds a real idempotency key per call per recipient, and a title naming the room", async () => {
    const admin = fakeAdmin([{ user_id: memberA }], "Team standup");
    await notifyRoomCallStarted(admin, { roomId, callId, startedBy: starter });
    const [, job] = deps.enqueuePlatformJob.mock.calls[0]!;
    expect(job.type).toBe("notification.create");
    expect(job.idempotencyKey).toBe(`notify:room_call_started:${callId}:${memberA}`);
    expect(job.payload.title).toBe("Call started in Team standup");
    expect(job.payload.actionUrl).toBe(`/rooms/${roomId}/call`);
  });

  it("returns 0 and enqueues nothing when the caller is the only room member", async () => {
    const admin = fakeAdmin([]);
    const count = await notifyRoomCallStarted(admin, { roomId, callId, startedBy: starter });
    expect(count).toBe(0);
    expect(deps.enqueuePlatformJob).not.toHaveBeenCalled();
  });

  it("doesn't let one failed enqueue stop the others", async () => {
    deps.enqueuePlatformJob
      .mockRejectedValueOnce(new Error("insert failed"))
      .mockResolvedValueOnce(undefined);
    const admin = fakeAdmin([{ user_id: memberA }, { user_id: memberB }]);
    const count = await notifyRoomCallStarted(admin, { roomId, callId, startedBy: starter });
    expect(count).toBe(1);
    expect(deps.enqueuePlatformJob).toHaveBeenCalledTimes(2);
  });
});
