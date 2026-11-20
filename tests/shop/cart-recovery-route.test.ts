import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: mocks.admin }));
vi.mock("@/lib/api-guard", () => ({ shopOrderRateLimit: mocks.limit }));
import { POST } from "@/app/api/public/sites/[subdomain]/cart/recover/route";

const attemptId = "00000000-0000-4000-8000-000000000004";
const params = { params: Promise.resolve({ subdomain: "store" }) };
function request(body: unknown = { attemptId }, origin = "https://kebu.test") {
  return new Request("https://kebu.test/api/public/sites/store/cart/recover", {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
  });
}
function database(data: unknown = { state: "saved", order_number: "ORDER-1", customer_email: "private@example.test", payment_url: "https://secret.test" }, error: unknown = null) {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { project_id: "own-store" }, error: null }) };
  const rpc = vi.fn().mockResolvedValue({ data, error });
  mocks.admin.mockReturnValue({ from: () => query, rpc });
  return { query, rpc };
}
beforeEach(() => { vi.resetAllMocks(); mocks.limit.mockReturnValue(null); });

it("only reveals a minimal uncached receipt for the live store", async () => {
  const { query, rpc } = database();
  const res = await POST(request(), params);
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("no-store");
  const body = await res.json();
  expect(Object.keys(body).sort()).toEqual(["message", "orderNumber", "state"]);
  expect(body.message).toContain("does not confirm payment");
  expect(query.eq).toHaveBeenCalledWith("subdomain", "store");
  expect(query.eq).toHaveBeenCalledWith("status", "live");
  expect(rpc).toHaveBeenCalledWith("recover_shop_cart_attempt", { p_project: "own-store", p_attempt: attemptId });
});

it("fails closed on malformed, oversized and cross-origin requests", async () => {
  database();
  expect((await POST(request({}, "https://attacker.test"), params)).status).toBe(403);
  expect((await POST(request({ attemptId: "ORDER-1" }), params)).status).toBe(400);
  expect((await POST(request({ attemptId, projectId: "foreign" }), params)).status).toBe(400);
  expect((await POST(request({ attemptId, padding: "x".repeat(300) }), params)).status).toBe(413);
  expect(mocks.admin).not.toHaveBeenCalled();
});

it("only clears uncertainty after a database fence; provider outages remain uncertain", async () => {
  database({ state: "closed" });
  expect(await (await POST(request(), params)).json()).toMatchObject({ state: "closed" });
  database(null, { code: "57014" });
  const res = await POST(request(), params);
  expect(res.status).toBe(503);
  expect(await res.json()).not.toHaveProperty("state");
  const { query, rpc } = database();
  query.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect((await POST(request(), params)).status).toBe(404);
  expect(rpc).not.toHaveBeenCalled();
});
