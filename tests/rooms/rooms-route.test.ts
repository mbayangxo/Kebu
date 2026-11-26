import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
import { GET, POST } from "@/app/api/rooms/route";

const owner = "11111111-1111-4111-8111-111111111111";
const roomId = "22222222-2222-4222-8222-222222222222";
const room = { id: roomId, created_by: owner, business_id: null, name: "Study group", description: "", room_type: "friends" };

const request = (method: string, body?: unknown, query = "") =>
  new Request("https://kebu.test/api/rooms" + query, { method, headers: { "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

function setup(opts: { roomInsertError?: unknown; memberError?: unknown; channelError?: unknown } = {}) {
  const calls: { rooms: [string, unknown][]; room_members: unknown[]; space_channels: unknown[] } = { rooms: [], room_members: [], space_channels: [] };
  const from = vi.fn((table: string) => {
    if (table === "rooms") {
      return {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [room], error: null }),
        insert: vi.fn((row: unknown) => {
          calls.rooms.push(["insert", row]);
          return {
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue(opts.roomInsertError ? { data: null, error: opts.roomInsertError } : { data: room, error: null }),
          };
        }),
        update: vi.fn((patch: unknown) => {
          calls.rooms.push(["update", patch]);
          return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }),
      };
    }
    if (table === "room_members") {
      return { insert: vi.fn((row: unknown) => { calls.room_members.push(row); return Promise.resolve({ data: null, error: opts.memberError ?? null }); }) };
    }
    if (table === "space_channels") {
      return { insert: vi.fn((row: unknown) => { calls.space_channels.push(row); return Promise.resolve({ data: null, error: opts.channelError ?? null }); }) };
    }
    throw new Error("unexpected table " + table);
  });
  auth.mockResolvedValue({ user: { id: owner }, supabase: { from } });
  return { calls };
}

beforeEach(() => vi.clearAllMocks());

describe("Rooms collection route", () => {
  it("creates a room, its owner membership and its chat channel together", async () => {
    const { calls } = setup();
    const response = await POST(request("POST", { name: "Study group" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ room });
    expect(calls.room_members[0]).toMatchObject({ room_id: roomId, user_id: owner, role: "owner" });
    expect(calls.space_channels[0]).toMatchObject({ room_id: roomId, created_by: owner });
  });

  it("rejects an invalid room payload before touching the database", async () => {
    setup();
    const response = await POST(request("POST", { name: "" }));
    expect(response.status).toBe(400);
  });

  it("does not report room creation as successful if the room row itself failed", async () => {
    setup({ roomInsertError: { message: "insert failed" } });
    const response = await POST(request("POST", { name: "Study group" }));
    expect(response.status).toBe(500);
  });

  it("archives (does not leave half-set-up) a room whose owner-membership insert failed, and reports failure rather than a partial success", async () => {
    const { calls } = setup({ memberError: { message: "infinite recursion detected in policy for relation \"room_members\"" } });
    const response = await POST(request("POST", { name: "Study group" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("Could not finish") });
    expect(calls.rooms.at(-1)).toEqual(["update", { archived_at: expect.any(String) }]);
  });

  it("archives and reports failure if the chat channel could not be created, even though the room and membership succeeded", async () => {
    const { calls } = setup({ channelError: { message: "insert failed" } });
    const response = await POST(request("POST", { name: "Study group" }));
    expect(response.status).toBe(500);
    expect(calls.rooms.at(-1)?.[0]).toBe("update");
  });

  it("lists only unarchived rooms", async () => {
    setup();
    const response = await GET(request("GET"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ rooms: [room] });
  });
});
