import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processDeveloperPayout } from "@/lib/create/developer-payouts";
import {
  orangeMoneyPayoutConfigured,
  sendOrangeMoneyPayout,
  sendWavePayout,
  wavePayoutConfigured,
} from "@/lib/payments/payout-adapter";
const input = {
  reference: "payout-123",
  amountXof: 1000,
  destinationPhone: "+221700000000",
  destinationAccountName: "Test recipient",
  reason: "Test fixture",
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("uncertified outbound money safety", () => {
  it("credentials alone never enable unverified outbound adapters", async () => {
    vi.stubEnv("WAVE_PAYOUT_API_KEY", "fixture-not-a-real-key");
    vi.stubEnv("ORANGE_MONEY_PAYOUT_API_KEY", "fixture-not-a-real-key");
    const network = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "fixture",
            transaction_id: "fixture",
            status: "paid",
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", network);
    expect(wavePayoutConfigured()).toBe(false);
    expect(orangeMoneyPayoutConfigured()).toBe(false);
    expect(await sendWavePayout(input)).toMatchObject({
      ok: false,
      configured: false,
    });
    expect(await sendOrangeMoneyPayout(input)).toMatchObject({
      ok: false,
      configured: false,
    });
    expect(network).not.toHaveBeenCalled();
  });
  it("never interprets USD cents as XOF or mutates the request when conversion is missing", async () => {
    const update = vi.fn();
    const api = {
      select: () => api,
      eq: () => api,
      maybeSingle: async () => ({
        data: {
          id: "payout-123",
          status: "requested",
          method: "wave",
          currency: "USD",
          amount_cents: 2500,
        },
        error: null,
      }),
      update,
    };
    const db = { from: () => api } as unknown as SupabaseClient;
    expect(
      await processDeveloperPayout(db, "payout-123", "admin"),
    ).toMatchObject({ ok: false, status: 409 });
    expect(update).not.toHaveBeenCalled();
  });
});
