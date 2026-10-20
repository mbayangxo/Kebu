import { beforeEach, describe, expect, it, vi } from "vitest";
const requireAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient: requireAuth }));
const yandeChat = vi.hoisted(() => vi.fn());
const yandeConfigured = vi.hoisted(() => vi.fn());
vi.mock("@/lib/yande/gateway", () => ({ yandeChat, yandeConfigured }));
import { POST } from "@/app/api/yande/assist/route";

const userId = "11111111-1111-4111-8111-111111111111";

function request(body: unknown) {
  return new Request("https://kebu.test/api/yande/assist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) as unknown as Parameters<typeof POST>[0];
}

function countQuery(count: number) {
  const query: { select: () => typeof query; eq: () => typeof query; then: Promise<{ count: number }>["then"] } = {
    select: () => query,
    eq: () => query,
    then: (resolve) => Promise.resolve({ count }).then(resolve),
  };
  return query;
}

function setup(opts: { signedIn?: boolean } = { signedIn: true }) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const from = vi.fn((table: string) => {
    if (table === "business_members" || table === "projects") return countQuery(2);
    if (table === "opportunity_profiles") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle };
    throw new Error("unexpected table " + table);
  });
  requireAuth.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: opts.signedIn === false ? null : { id: userId } } }) },
    from,
  });
  yandeConfigured.mockReturnValue(true);
}

beforeEach(() => vi.clearAllMocks());

describe("Yande chat assistant route", () => {
  it("503s when Yande is not configured, without attempting auth or the model call", async () => {
    yandeConfigured.mockReturnValue(false);
    const res = await POST(request({ message: "Hi" }));
    expect(res.status).toBe(503);
    expect(yandeChat).not.toHaveBeenCalled();
  });

  it("401s an unauthenticated request", async () => {
    setup({ signedIn: false });
    const res = await POST(request({ message: "Hi" }));
    expect(res.status).toBe(401);
  });

  it("rejects an invalid body", async () => {
    setup();
    const res = await POST(request({ message: "" }));
    expect(res.status).toBe(400);
  });

  it("routes through the shared gateway with the real feature tag and user id", async () => {
    setup();
    yandeChat.mockResolvedValue({ reply: "Here is how to start.", model: "claude-sonnet-5-5", inputTokens: 1, outputTokens: 1 });
    const res = await POST(request({ message: "How do I start?", pathname: "/dashboard" }));
    expect(res.status).toBe(200);
    expect((await res.json()).reply).toBe("Here is how to start.");
    expect(yandeChat).toHaveBeenCalledWith(expect.objectContaining({ feature: "chat_assistant", userId }));
  });

  it("502s cleanly when the gateway itself fails, never fabricating a reply", async () => {
    setup();
    yandeChat.mockRejectedValue(new Error("Yande request failed."));
    const res = await POST(request({ message: "Hi" }));
    expect(res.status).toBe(502);
  });
});
