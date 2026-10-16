import { describe, expect, it, vi, beforeEach } from "vitest";

const sendCampaignEmail = vi.fn();
const enqueuePlatformJob = vi.fn();

vi.mock("@/lib/email/send-campaign", () => ({
  sendCampaignEmail: (...args: unknown[]) => sendCampaignEmail(...args),
}));
vi.mock("@/lib/platform/jobs", () => ({
  enqueuePlatformJob: (...args: unknown[]) => enqueuePlatformJob(...args),
}));

import { fulfillPaidDigitalOrder, fulfillPaidDigitalOrderDurable, reconcileOrphanedDigitalFulfillments } from "@/lib/shop/digital-downloads";

const order = {
  id: "order-1", project_id: "proj-1", product_id: "prod-1",
  product_name: "E-book", customer_email: "buyer@example.test", payment_status: "paid",
};
const product = {
  id: "prod-1", is_digital: true, digital_file_path: "files/book.pdf",
  digital_file_name: "book.pdf", digital_dl_limit: 3, digital_expires_hours: 48,
};

function admin(opts: { existingDownload?: { token: string } | null; insertError?: string } = {}) {
  return {
    from: (table: string) => {
      if (table === "shop_orders") return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: order }) }), maybeSingle: async () => ({ data: order }) }) }) };
      if (table === "project_products") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: product }) }) }) };
      if (table === "shop_digital_downloads") {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.existingDownload ?? null }) }) }) }),
          insert: async () => ({ error: opts.insertError ? { message: opts.insertError } : null }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  } as never;
}

describe("fulfillPaidDigitalOrder (raw core, used by the platform worker)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_FROM_EMAIL = "shop@kebu.app";
    sendCampaignEmail.mockResolvedValue(true);
  });

  it("creates a download and emails it on a clean run", async () => {
    await fulfillPaidDigitalOrder(admin(), "order-1");
    expect(sendCampaignEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "buyer@example.test" }));
  });

  it("is idempotent — an existing download for this order/product is reused, no duplicate insert", async () => {
    await fulfillPaidDigitalOrder(admin({ existingDownload: { token: "a".repeat(64) } }), "order-1");
    expect(sendCampaignEmail).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining("a".repeat(64)) }));
  });

  it("throws when the download row cannot be created — so a caller (the worker) can retry/back off", async () => {
    await expect(fulfillPaidDigitalOrder(admin({ insertError: "db unavailable" }), "order-1")).rejects.toThrow("db unavailable");
  });

  it("throws when the mail provider rejects the send", async () => {
    sendCampaignEmail.mockResolvedValue(false);
    await expect(fulfillPaidDigitalOrder(admin(), "order-1")).rejects.toThrow(/mail provider/);
  });
});

describe("fulfillPaidDigitalOrderDurable (webhook-facing wrapper)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_FROM_EMAIL = "shop@kebu.app";
  });

  it("never throws, and does not enqueue a retry, on success", async () => {
    sendCampaignEmail.mockResolvedValue(true);
    await expect(fulfillPaidDigitalOrderDurable(admin(), "order-1")).resolves.toBeUndefined();
    expect(enqueuePlatformJob).not.toHaveBeenCalled();
  });

  it("swallows a failure and enqueues a digital.fulfill retry with a stable idempotency key", async () => {
    await expect(fulfillPaidDigitalOrderDurable(admin({ insertError: "db unavailable" }), "order-1")).resolves.toBeUndefined();
    expect(enqueuePlatformJob).toHaveBeenCalledWith(expect.anything(), {
      type: "digital.fulfill",
      payload: { orderId: "order-1" },
      idempotencyKey: "digital.fulfill:order-1",
    });
  });

  it("rethrows when fulfillment AND enqueueing both fail, instead of falsely resolving as durably queued", async () => {
    enqueuePlatformJob.mockRejectedValue(new Error("platform_jobs insert failed"));
    await expect(fulfillPaidDigitalOrderDurable(admin({ insertError: "db unavailable" }), "order-1"))
      .rejects.toThrow("platform_jobs insert failed");
  });
});

describe("reconcileOrphanedDigitalFulfillments (crash-before-any-attempt backstop)", () => {
  beforeEach(() => {
    // resetAllMocks (not clearAllMocks) — the previous describe block leaves
    // enqueuePlatformJob with a lingering mockRejectedValue implementation.
    vi.resetAllMocks();
    enqueuePlatformJob.mockResolvedValue(undefined);
  });

  function reconcileAdmin(opts: {
    paidOrders: { id: string; product_id: string }[];
    digitalProductIds: string[];
    fulfilledOrderIds: string[];
  }) {
    return {
      from: (table: string) => {
        if (table === "shop_orders") return { select: () => ({ eq: () => ({ not: () => ({ gte: () => ({ limit: async () => ({ data: opts.paidOrders }) }) }) }) }) };
        if (table === "project_products") return { select: () => ({ in: () => ({ eq: async () => ({ data: opts.digitalProductIds.map((id) => ({ id })) }) }) }) };
        if (table === "shop_digital_downloads") return { select: () => ({ in: async () => ({ data: opts.fulfilledOrderIds.map((order_id) => ({ order_id })) }) }) };
        throw new Error(`Unexpected table ${table}`);
      },
    } as never;
  }

  it("enqueues a digital.fulfill job for a paid digital order with no download row yet", async () => {
    const result = await reconcileOrphanedDigitalFulfillments(
      reconcileAdmin({ paidOrders: [{ id: "order-5", product_id: "prod-1" }], digitalProductIds: ["prod-1"], fulfilledOrderIds: [] }),
    );
    expect(result).toEqual({ scanned: 1, enqueued: 1 });
    expect(enqueuePlatformJob).toHaveBeenCalledWith(expect.anything(), {
      type: "digital.fulfill",
      payload: { orderId: "order-5" },
      idempotencyKey: "digital.fulfill:order-5",
    });
  });

  it("does not enqueue an order that already has a download row", async () => {
    const result = await reconcileOrphanedDigitalFulfillments(
      reconcileAdmin({ paidOrders: [{ id: "order-6", product_id: "prod-1" }], digitalProductIds: ["prod-1"], fulfilledOrderIds: ["order-6"] }),
    );
    expect(result).toEqual({ scanned: 1, enqueued: 0 });
    expect(enqueuePlatformJob).not.toHaveBeenCalled();
  });

  it("does not enqueue a paid order for a non-digital product", async () => {
    const result = await reconcileOrphanedDigitalFulfillments(
      reconcileAdmin({ paidOrders: [{ id: "order-7", product_id: "prod-physical" }], digitalProductIds: [], fulfilledOrderIds: [] }),
    );
    expect(result).toEqual({ scanned: 1, enqueued: 0 });
    expect(enqueuePlatformJob).not.toHaveBeenCalled();
  });

  it("keeps sweeping the rest when one order's enqueue fails, rather than aborting the whole backfill", async () => {
    enqueuePlatformJob.mockRejectedValueOnce(new Error("transient")).mockResolvedValueOnce(undefined);
    const result = await reconcileOrphanedDigitalFulfillments(
      reconcileAdmin({
        paidOrders: [{ id: "order-8", product_id: "prod-1" }, { id: "order-9", product_id: "prod-1" }],
        digitalProductIds: ["prod-1"], fulfilledOrderIds: [],
      }),
    );
    expect(result).toEqual({ scanned: 2, enqueued: 1 });
    expect(enqueuePlatformJob).toHaveBeenCalledTimes(2);
  });
});
