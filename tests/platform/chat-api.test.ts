import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── mock dependencies ────────────────────────────────────────────────────────

const requireUser = vi.fn();

vi.mock("@/lib/create/auth", () => ({
  requireUser: (...args: unknown[]) => requireUser(...args),
}));

import { GET, POST } from "@/app/api/chat/route";

// ── helpers ──────────────────────────────────────────────────────────────────

const CHANNEL_ROW = {
  id: "00000001-0001-4001-a001-000000000001",
  created_by: "00000001-0001-4001-a001-000000000002",
  business_id: null,
  name: "general",
  created_at: "2026-09-20T00:00:00Z",
  updated_at: "2026-09-20T00:00:00Z",
};

const MESSAGE_ROW = {
  id: "00000001-0001-4001-a001-000000000003",
  channel_id: CHANNEL_ROW.id,
  author_id: CHANNEL_ROW.created_by,
  body: "Hello Kebu",
  created_at: "2026-09-20T00:01:00Z",
};

function makeSelectChain(result: { data: unknown; error: null | { message: string } }) {
  const orderFn = vi.fn().mockReturnValue({
    limit: vi.fn().mockResolvedValue(result),
  });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn, limit: orderFn });
  const isFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ order: orderFn, eq: eqFn, is: isFn });
  return { select: selectFn };
}

function makeInsertChain(result: { data: unknown; error: null | { message: string } }) {
  const singleFn = vi.fn().mockResolvedValue(result);
  const selectFn = vi.fn().mockReturnValue({ single: singleFn });
  return { insert: vi.fn().mockReturnValue({ select: selectFn }) };
}

// ── unauthenticated ──────────────────────────────────────────────────────────

describe("GET /api/chat — unauthenticated", () => {
  it("returns 401 when no session", async () => {
    requireUser.mockResolvedValue({
      error: Response.json({ error: "Sign in required." }, { status: 401 }),
    });
    const res = await GET(new NextRequest("http://localhost/api/chat"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/chat — unauthenticated", () => {
  it("returns 401 when no session", async () => {
    requireUser.mockResolvedValue({
      error: Response.json({ error: "Sign in required." }, { status: 401 }),
    });
    const res = await POST(new NextRequest("http://localhost/api/chat", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });
});

// ── channels happy path ───────────────────────────────────────────────────────

describe("GET /api/chat — channels list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns channel list for authenticated user", async () => {
    const supabase = { from: vi.fn().mockReturnValue(makeSelectChain({ data: [CHANNEL_ROW], error: null })) };
    requireUser.mockResolvedValue({ user: { id: "user-0001-0001-0001-000000000001" }, supabase });

    const res = await GET(new NextRequest("http://localhost/api/chat"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.channels).toHaveLength(1);
    expect(body.channels[0].name).toBe("general");
  });

  it("returns messages when channelId query param is supplied", async () => {
    const profilesData: unknown[] = [];
    const messagesData = [MESSAGE_ROW];

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "space_messages") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: messagesData, error: null }),
                }),
              }),
            }),
          };
        }
        // user_profiles
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: profilesData, error: null }),
          }),
        };
      }),
    };
    requireUser.mockResolvedValue({ user: { id: MESSAGE_ROW.author_id }, supabase });

    const channelId = CHANNEL_ROW.id;
    const res = await GET(new NextRequest(`http://localhost/api/chat?channelId=${channelId}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].body).toBe("Hello Kebu");
  });

  it("returns 400 for an invalid channelId format", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    // "not-valid" is fewer than 36 chars and contains invalid chars
    const res = await GET(new NextRequest("http://localhost/api/chat?channelId=not-valid"));
    expect(res.status).toBe(400);
  });
});

// ── create channel happy path ─────────────────────────────────────────────────

describe("POST /api/chat — create_channel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a channel and returns 201", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue(makeInsertChain({ data: CHANNEL_ROW, error: null })),
    };
    requireUser.mockResolvedValue({ user: { id: "user-0001-0001-0001-000000000001" }, supabase });

    const body = JSON.stringify({ action: "create_channel", name: "general" });
    const res = await POST(new NextRequest("http://localhost/api/chat", { method: "POST", body }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.channel.name).toBe("general");
  });

  it("returns 400 when channel name is blank", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    const body = JSON.stringify({ action: "create_channel", name: "   " });
    const res = await POST(new NextRequest("http://localhost/api/chat", { method: "POST", body }));
    expect(res.status).toBe(400);
  });
});

// ── send message happy path ───────────────────────────────────────────────────

describe("POST /api/chat — send_message", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts a message and returns 201", async () => {
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "space_messages") return makeInsertChain({ data: MESSAGE_ROW, error: null });
        return { update: updateFn };
      }),
    };
    requireUser.mockResolvedValue({ user: { id: MESSAGE_ROW.author_id }, supabase });

    const body = JSON.stringify({ action: "send_message", channelId: CHANNEL_ROW.id, body: "Hello Kebu" });
    const res = await POST(new NextRequest("http://localhost/api/chat", { method: "POST", body }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.message.body).toBe("Hello Kebu");
  });

  it("returns 400 when body is too short", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    const body = JSON.stringify({ action: "send_message", channelId: CHANNEL_ROW.id, body: "" });
    const res = await POST(new NextRequest("http://localhost/api/chat", { method: "POST", body }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    requireUser.mockResolvedValue({ user: { id: "u1" }, supabase: {} });
    const res = await POST(
      new NextRequest("http://localhost/api/chat", { method: "POST", body: "not-json" }),
    );
    expect(res.status).toBe(400);
  });
});
