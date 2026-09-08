import { describe, expect, it } from "vitest";
import {
  defaultDataModeFromHints,
  labelDataMode,
  parseDataMode,
} from "@/lib/create/data-mode";
import {
  budgetKbFor,
  bytesToKb,
  evaluateKb,
  formatKb,
  KB_BUDGETS,
  maxUploadBytesForMode,
} from "@/lib/create/kb-budget";
import {
  enqueuePlaceOrder,
  enqueueSaveSection,
  listOfflineQueue,
  removeOfflineQueueItem,
} from "@/lib/create/offline-queue";

describe("data mode defaults", () => {
  it("defaults to Data Saver on mobile / Save-Data", () => {
    expect(defaultDataModeFromHints({ widthPx: 390 })).toBe("data_saver");
    expect(defaultDataModeFromHints({ connectionSaveData: true, widthPx: 1400 })).toBe("data_saver");
    expect(defaultDataModeFromHints({ widthPx: 1280 })).toBe("data_saver");
    expect(defaultDataModeFromHints()).toBe("data_saver");
  });

  it("labels modes for the UI", () => {
    expect(labelDataMode("data_saver")).toBe("Data Saver");
    expect(parseDataMode("ultra")).toBe("ultra");
    expect(parseDataMode("nope")).toBe("data_saver");
  });
});

describe("KB budgets", () => {
  it("defines budgets for Builder · Shop · Account actions", () => {
    expect(Object.keys(KB_BUDGETS).sort()).toEqual(
      [
        "event_register",
        "open_account",
        "open_builder",
        "open_shop",
        "open_site",
        "place_order",
        "save_profile",
        "save_section",
        "upload_image",
      ].sort(),
    );
  });

  it("evaluates place_order within Data Saver budget", () => {
    const ev = evaluateKb({ action: "place_order", mode: "data_saver", usedBytes: 4 * 1024 });
    expect(ev.withinBudget).toBe(true);
    expect(ev.budgetKb).toBe(budgetKbFor("place_order", "data_saver"));
    expect(formatKb(ev.usedKb)).toContain("KB");
  });

  it("flags over-budget open_site", () => {
    const ev = evaluateKb({
      action: "open_site",
      mode: "data_saver",
      usedBytes: 900 * 1024,
    });
    expect(ev.withinBudget).toBe(false);
    expect(ev.overByKb).toBeGreaterThan(0);
  });

  it("tightens upload caps in Data Saver", () => {
    expect(maxUploadBytesForMode("section", "data_saver")).toBeLessThanOrEqual(800_000);
    expect(maxUploadBytesForMode("section", "ultra")).toBeLessThanOrEqual(350_000);
    expect(maxUploadBytesForMode("section", "normal")).toBeGreaterThan(800_000);
    expect(bytesToKb(1024)).toBe(1);
  });
});

describe("offline queue honesty", () => {
  it("queues place_order without claiming server save", () => {
    const before = listOfflineQueue().length;
    const item = enqueuePlaceOrder({
      subdomain: "demo",
      productId: "11111111-1111-4111-8111-111111111111",
      productName: "Tee",
      customerName: "Awa",
      customerPhone: "221770000000",
      customerNote: "",
      quantity: 1,
      paymentPreference: "card",
    });
    expect(item.status).toBe("queued");
    expect(listOfflineQueue().length).toBe(before + 1);
    removeOfflineQueueItem(item.id);
    expect(listOfflineQueue().some((i) => i.id === item.id)).toBe(false);
  });

  it("coalesces save_section drafts per section", () => {
    const a = enqueueSaveSection({
      projectId: "p1",
      sectionId: "s1",
      props: { title: "One" },
    });
    const b = enqueueSaveSection({
      projectId: "p1",
      sectionId: "s1",
      props: { title: "Two" },
    });
    const same = listOfflineQueue().filter(
      (i) => i.kind === "save_section" && i.payload.sectionId === "s1",
    );
    expect(same.length).toBe(1);
    expect(same[0]?.payload.props).toEqual({ title: "Two" });
    removeOfflineQueueItem(b.id);
    removeOfflineQueueItem(a.id);
  });
});
