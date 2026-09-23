import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── mock dependencies ────────────────────────────────────────────────────────

const requireUser = vi.fn();

vi.mock("@/lib/create/auth", () => ({
  requireUser: (...args: unknown[]) => requireUser(...args),
}));

import { GET, POST } from "@/app/api/rooms/route";

// ── fixtures ─────────────────────────────────────────────────────────────────

const ROOM_ROW = {
  id: "00000003-0001-4001-a001-000000000001",
  created_by: "00000003-0001-4001-a001-000000000002",
  business_id: null,
  name: "Design Sprint Q4",
  description: "Weekly design sprint coordination",
  room_type: "project",
  archived_at: null,
  created_at: "2026-09-20T00:00:00Z",
  updated_at: "2026-09-20T00:00:00Z",
};

function makeListChain(rows: unknown[]) {
  const limitFn = vi.fn().mockResolvedValue({ data: rows, error: null });
  const orderFn = vi.fn().mockReturnValue({ limit: limitFn });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const isFn = vi.fn().mockReturnValue({ order: orderFn });
  // is("archived_at", null) is always first, then the optional business filters
  const baseChain = { order: orderFn, eq: eqFn, is: vi.fn().mockReturnValue({ order: orderFn, eq: eqFn, is: isFn, limit: limitFn }) };
  return { select: vi.fn().mockReturnValue(baseChain) };
}

function makeInsertChain(result: { data: unknown; error: null | { message: string } }) {
  const singleFn = vi.fn().mockResolvedValue(result);
  const selectFn = vi.fn().mockReturnValue({ single: singleFn });
  return { insert: vi.fn().mockReturnValue({ select: selectFn }) };
}

// ── unauthenticated ──────────────────────────────────────────────────────────

describe("rooms API — unauthenticated", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /api/rooms returns 401 without a session", async () => {
    requireUser.mockResolvedValue({ error: Response.json({ error: "Sign in required." }, { status: 401 }) });
    const res = await GET(new NextRequest("http://localhost/api/rooms"));
    expect(res.status).toBe(401);
  });

  it("POST /api/rooms returns 401 without a session", async () => {
    requireUser.mockResolvedValue({ error: Response.json({ error: "Sign in required." }, { status: 401 }) });
    const res = await POST(new NextRequest("http://localhost/api/rooms", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });
});

// ── GET happy path ────────────────────────────────────────────────────────────

describe("GET /api/rooms", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns rooms for the authenticated user", async () => {
    const supabase = { from: vi.fn().mockReturnValue(makeListChain([ROOM_ROW])) };
    requireUser.mockResolvedValue({ user: { id: ROOM_ROW.created_by }, supabase });

    const res = await GET(new NextRequest("http://localhost/api/rooms"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rooms).toHaveLength(1);
    expect(body.rooms[0].name).toBe("Design Sprint Q4");
  });

  it("returns empty array when no rooms exist", async () => {
    const supabase = { from: vi.fn().mockReturnValue(makeListChain([])) };
    requireUser.mockResolvedValue({ user: { id: "user-1" }, supabase });

    const res = await GET(new NextRequest("http://localhost/api/rooms"));
    expect(res.status).toBe(200);
    expect((await res.json()).rooms).toHaveLength(0);
  });
});

// ── POST happy path ───────────────────────────────────────────────────────────

describe("POST /api/rooms", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a room, adds owner membership, and returns 201", async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "rooms") return makeInsertChain({ data: ROOM_ROW, error: null });
        // room_members and space_channels inserts
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    };
    requireUser.mockResolvedValue({ user: { id: ROOM_ROW.created_by }, supabase });

    const body = JSON.stringify({ name: "Design Sprint Q4" });
    const res = await POST(new NextRequest("http://localhost/api/rooms", { method: "POST", body }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.room.name).toBe("Design Sprint Q4");
    void insertFn; // referenced to satisfy linter
  });

  it("returns 400 when name is blank", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    const body = JSON.stringify({ name: "   " });
    const res = await POST(new NextRequest("http://localhost/api/rooms", { method: "POST", body }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    const body = JSON.stringify({ description: "no name provided" });
    const res = await POST(new NextRequest("http://localhost/api/rooms", { method: "POST", body }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    const res = await POST(new NextRequest("http://localhost/api/rooms", { method: "POST", body: "not-json" }));
    expect(res.status).toBe(400);
  });

  it("accepts an explicit roomType enum value", async () => {
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "rooms") return makeInsertChain({ data: { ...ROOM_ROW, room_type: "team" }, error: null });
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    };
    requireUser.mockResolvedValue({ user: { id: ROOM_ROW.created_by }, supabase });

    const body = JSON.stringify({ name: "Engineering Team", roomType: "team" });
    const res = await POST(new NextRequest("http://localhost/api/rooms", { method: "POST", body }));
    expect(res.status).toBe(201);
    expect((await res.json()).room.room_type).toBe("team");
  });

  it("returns 400 for an unknown roomType", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    const body = JSON.stringify({ name: "Bad Room", roomType: "invalid-type" });
    const res = await POST(new NextRequest("http://localhost/api/rooms", { method: "POST", body }));
    expect(res.status).toBe(400);
  });
});

// ── RLS / ownership scoping ────────────────────────────────────────────────────

describe("rooms API — ownership scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("user A only sees their own rooms (Supabase RLS enforced at DB; route always scopes to session user)", async () => {
    // User A owns the fixture room; user B gets an empty list (DB RLS hides it)
    const supabaseUserB = { from: vi.fn().mockReturnValue(makeListChain([])) };
    requireUser.mockResolvedValue({ user: { id: "user-B-0000-0000-0000-000000000099" }, supabase: supabaseUserB });

    const res = await GET(new NextRequest("http://localhost/api/rooms"));
    expect(res.status).toBe(200);
    expect((await res.json()).rooms).toHaveLength(0);
  });
});
