import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  auth: vi.fn(), rpc: vi.fn(), createAdminClient: vi.fn(), notifyRoomCallStarted: vi.fn(),
}));
vi.mock("@/lib/create/auth", () => ({ requireUser: deps.auth }));
vi.mock("@/lib/admin/assert-admin-cookie", () => ({ assertSameOriginMutation: () => null }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: deps.createAdminClient }));
vi.mock("@/lib/rooms/call-notify", () => ({ notifyRoomCallStarted: deps.notifyRoomCallStarted }));

import { GET, POST } from "@/app/api/rooms/[id]/call/route";

const userId = "11111111-1111-4111-8111-111111111111";
const roomId = "22222222-2222-4222-8222-222222222222";
const callId = "33333333-3333-4333-8333-333333333333";

function chain(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const methods = ["select", "eq", "in", "order", "limit"];
  for (const m of methods) q[m] = vi.fn(() => q);
  (q as { then: (resolve: (v: unknown) => void) => void }).then = (resolve) => resolve(result);
  return q;
}

function setupAuth(fromImpl: (table: string) => unknown = () => chain({ data: [], error: null })) {
  deps.auth.mockResolvedValue({ user: { id: userId }, supabase: { rpc: deps.rpc, from: (table: string) => fromImpl(table) } });
}

function postReq(body: unknown) {
  return new Request(`https://kebu.test/api/rooms/${roomId}/call`, {
    method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
  });
}
function getReq() {
  return new Request(`https://kebu.test/api/rooms/${roomId}/call`);
}
const params = (id: string = roomId) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  deps.createAdminClient.mockReturnValue({ fakeAdminClient: true });
  deps.notifyRoomCallStarted.mockResolvedValue(0);
});

describe("POST /api/rooms/[id]/call", () => {
  it("rejects a non-UUID room id before touching the database", async () => {
    setupAuth();
    const res = await POST(postReq({ action: "join" }), params("not-a-uuid"));
    expect(res.status).toBe(400);
    expect(deps.rpc).not.toHaveBeenCalled();
  });

  it("rejects a malformed action body", async () => {
    setupAuth();
    const res = await POST(postReq({ action: "nonsense" }), params());
    expect(res.status).toBe(400);
  });

  it("returns 404 when join is denied (not a room member, hidden by RLS)", async () => {
    setupAuth();
    deps.rpc.mockResolvedValue({ data: null, error: null });
    const res = await POST(postReq({ action: "join" }), params());
    expect(res.status).toBe(404);
  });

  it("returns 409 with a clear error when the call is full", async () => {
    setupAuth();
    deps.rpc.mockResolvedValue({ data: null, error: { message: "Call is full" } });
    const res = await POST(postReq({ action: "join" }), params());
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/full/i);
  });

  it("joins successfully and attaches ICE servers to the response", async () => {
    setupAuth();
    deps.rpc.mockResolvedValue({ data: { id: callId, roomId, startedAt: "2026-01-01T00:00:00Z", maxParticipants: 8, created: false }, error: null });
    const res = await POST(postReq({ action: "join" }), params());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(callId);
    expect(data.userId).toBe(userId);
    expect(Array.isArray(data.iceServers)).toBe(true);
    expect(data.iceServers.length).toBeGreaterThan(0);
    expect(deps.rpc).toHaveBeenCalledWith("room_call_join", { p_room: roomId });
  });

  it("notifies other room members when the join actually starts a new call", async () => {
    setupAuth();
    deps.rpc.mockResolvedValue({ data: { id: callId, roomId, startedAt: "2026-01-01T00:00:00Z", maxParticipants: 8, created: true }, error: null });
    const res = await POST(postReq({ action: "join" }), params());
    expect(res.status).toBe(200);
    expect(deps.notifyRoomCallStarted).toHaveBeenCalledTimes(1);
    expect(deps.notifyRoomCallStarted).toHaveBeenCalledWith(
      { fakeAdminClient: true },
      { roomId, callId, startedBy: userId },
    );
  });

  it("does not notify anyone when joining a call that was already in progress", async () => {
    setupAuth();
    deps.rpc.mockResolvedValue({ data: { id: callId, roomId, startedAt: "2026-01-01T00:00:00Z", maxParticipants: 8, created: false }, error: null });
    await POST(postReq({ action: "join" }), params());
    expect(deps.notifyRoomCallStarted).not.toHaveBeenCalled();
  });

  it("still returns the join result even if notifying other members throws", async () => {
    setupAuth();
    deps.rpc.mockResolvedValue({ data: { id: callId, roomId, startedAt: "2026-01-01T00:00:00Z", maxParticipants: 8, created: true }, error: null });
    deps.notifyRoomCallStarted.mockRejectedValue(new Error("platform_jobs insert failed"));
    const res = await POST(postReq({ action: "join" }), params());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(callId);
  });

  it("passes a requested group size through to the RPC", async () => {
    setupAuth();
    deps.rpc.mockResolvedValue({ data: { id: callId, roomId, startedAt: "2026-01-01T00:00:00Z", maxParticipants: 6 }, error: null });
    const res = await POST(postReq({ action: "join", maxParticipants: 6 }), params());
    expect(res.status).toBe(200);
    expect(deps.rpc).toHaveBeenCalledWith("room_call_join", { p_room: roomId, p_max_participants: 6 });
  });

  it("rejects an out-of-range group size before touching the database", async () => {
    setupAuth();
    const res = await POST(postReq({ action: "join", maxParticipants: 20 }), params());
    expect(res.status).toBe(400);
    expect(deps.rpc).not.toHaveBeenCalled();
  });

  it("rejects leave/end without a call id", async () => {
    setupAuth();
    const res = await POST(postReq({ action: "leave" }), params());
    expect(res.status).toBe(400);
  });

  it("routes leave to room_call_leave and end to room_call_end", async () => {
    setupAuth();
    deps.rpc.mockResolvedValue({ data: { left: true, ended: false }, error: null });
    await POST(postReq({ action: "leave", call: callId }), params());
    expect(deps.rpc).toHaveBeenCalledWith("room_call_leave", { p_call: callId });

    deps.rpc.mockResolvedValue({ data: { ended: true }, error: null });
    await POST(postReq({ action: "end", call: callId }), params());
    expect(deps.rpc).toHaveBeenCalledWith("room_call_end", { p_call: callId });
  });

  it("returns 404 when leave/end is denied", async () => {
    setupAuth();
    deps.rpc.mockResolvedValue({ data: null, error: null });
    const res = await POST(postReq({ action: "end", call: callId }), params());
    expect(res.status).toBe(404);
  });
});

describe("GET /api/rooms/[id]/call (history)", () => {
  it("returns calls with their participants attached", async () => {
    setupAuth((table) => {
      if (table === "room_calls") {
        return chain({ data: [{ id: callId, started_by: userId, started_at: "2026-01-01T00:00:00Z", ended_at: null, max_participants: 8 }], error: null });
      }
      if (table === "room_call_participants") {
        return chain({ data: [{ call_id: callId, user_id: userId, joined_at: "2026-01-01T00:00:00Z", left_at: null }], error: null });
      }
      throw new Error(`Unexpected table ${table}`);
    });
    const res = await GET(getReq(), params());
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.calls).toHaveLength(1);
    expect(data.calls[0].participants).toEqual([{ user_id: userId, joined_at: "2026-01-01T00:00:00Z", left_at: null }]);
  });

  it("returns an empty list without querying participants when there are no calls", async () => {
    setupAuth((table) => {
      if (table === "room_calls") return chain({ data: [], error: null });
      throw new Error(`Must not query ${table} with no calls`);
    });
    const res = await GET(getReq(), params());
    const data = await res.json();
    expect(data.calls).toEqual([]);
  });
});
