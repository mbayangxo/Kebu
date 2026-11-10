import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sandboxGift } from "@/lib/live/gifts";

const order = {
  sender: "sender", recipient: "host", requestId: "gift-attempt", roomId: "live-room",
  gift: "spark", verifyOnly: false,
};
beforeEach(() => {
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("JOKKO_GIFT_SANDBOX_URL", "http://127.0.0.1:4783");
  vi.stubEnv("JOKKO_GIFT_SANDBOX_KEY", "test".repeat(8));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("never sends a sandbox debit from Vercel", async () => {
  vi.stubEnv("VERCEL", "1");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(await sandboxGift(order)).toEqual({ status: "disabled" });
  expect(fetch).not.toHaveBeenCalled();
});

it("leaves transport failure and mismatched confirmation pending, then accepts the same confirmed request", async () => {
  const confirmation = {
    status: "completed", mode: "sandbox", currency: "CAURIS", amount: 100, gift: "spark",
    roomId: order.roomId, requestId: order.requestId, receiptId: "sandbox-receipt",
  };
  const fetch = vi.fn().mockRejectedValueOnce(new Error("timeout"))
    .mockResolvedValueOnce(Response.json({ ...confirmation, amount: 999 }))
    .mockResolvedValueOnce(Response.json(confirmation));
  vi.stubGlobal("fetch", fetch);
  expect(await sandboxGift(order)).toEqual({ status: "pending" });
  expect(await sandboxGift(order)).toEqual({ status: "pending" });
  expect(await sandboxGift(order)).toEqual({ status: "completed", amount: 100, receiptId: "sandbox-receipt" });
  expect(fetch.mock.calls.map(([, init]) => JSON.parse(init.body).requestId)).toEqual(Array(3).fill(order.requestId));
});
