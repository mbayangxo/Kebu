import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requireUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser }));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: () => null }));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: () => null }));
import { DELETE, GET, POST } from "@/app/api/mail/attachments/route";

beforeEach(() => { requireUser.mockReset(); requireUser.mockResolvedValue({ error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) }); });
describe("Mail attachment origin protection", () => {
  for (const [method, handler] of [["POST", POST], ["DELETE", DELETE]] as const) {
    it(`${method} rejects a cross-origin request before authentication or storage`, async () => {
      const response = await handler(new Request("https://kebu.example/api/mail/attachments", { method, headers: { host: "kebu.example", origin: "https://attacker.example" } }));
      expect(response.status).toBe(403);
      expect(requireUser).not.toHaveBeenCalled();
    });
    it(`${method} retains normal authentication for same-origin requests`, async () => {
      const response = await handler(new Request("https://kebu.example/api/mail/attachments", { method, headers: { host: "kebu.example", origin: "https://kebu.example" } }));
      expect(response.status).toBe(401);
      expect(requireUser).toHaveBeenCalledOnce();
    });
  }
  it("GET retains authentication without treating reads as mutations", async () => {
    const response = await GET(new Request("https://kebu.example/api/mail/attachments", { headers: { host: "kebu.example", origin: "https://attacker.example" } }));
    expect(response.status).toBe(401);
  });
});
