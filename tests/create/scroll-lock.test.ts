import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  acquireScrollLock,
  releaseScrollLock,
  getScrollLockCount,
  _resetScrollLockForTesting,
} from "@/lib/create/scroll-lock";

// Simulate a minimal browser environment for the DOM-mutating parts.
const bodyStyle: Record<string, string> = {};
const bodyDataset: Record<string, string> = {};

vi.stubGlobal("document", {
  body: {
    style: new Proxy(bodyStyle, {
      set(target, key, val) {
        if (val === "" || val === undefined) {
          delete target[key as string];
        } else {
          target[key as string] = val as string;
        }
        return true;
      },
      get(target, key) {
        return target[key as string] ?? "";
      },
      deleteProperty(target, key) {
        delete target[key as string];
        return true;
      },
    }),
    dataset: new Proxy(bodyDataset, {
      set(target, key, val) {
        target[key as string] = val as string;
        return true;
      },
      get(target, key) {
        return target[key as string];
      },
      deleteProperty(target, key) {
        delete target[key as string];
        return true;
      },
    }),
  },
  // clientWidth matches innerWidth (no scrollbar in test env)
  documentElement: { clientWidth: 1024 },
});

vi.stubGlobal("window", {
  scrollY: 400,
  innerWidth: 1024,
  scrollTo: vi.fn(),
});

vi.stubGlobal("navigator", { userAgent: "jsdom" });

function resetEnv() {
  for (const key of Object.keys(bodyStyle)) delete bodyStyle[key];
  for (const key of Object.keys(bodyDataset)) delete bodyDataset[key];
  _resetScrollLockForTesting();
}

describe("scroll-lock", () => {
  beforeEach(resetEnv);
  afterEach(resetEnv);

  it("starts with count 0", () => {
    expect(getScrollLockCount()).toBe(0);
  });

  it("acquire increments count to 1 and applies styles", () => {
    acquireScrollLock();
    expect(getScrollLockCount()).toBe(1);
    expect(bodyStyle["position"]).toBe("fixed");
    expect(bodyStyle["overflow"]).toBe("hidden");
    expect(bodyStyle["top"]).toBe("-400px");
    expect(bodyDataset["kebuScrollY"]).toBe("400");
  });

  it("second acquire increments count but does not re-apply styles", () => {
    acquireScrollLock();
    // Change top to simulate some mutation
    bodyStyle["top"] = "-999px";
    acquireScrollLock();
    expect(getScrollLockCount()).toBe(2);
    // top was not reset by the second acquire
    expect(bodyStyle["top"]).toBe("-999px");
  });

  it("release decrements count; styles not cleared until count reaches 0", () => {
    acquireScrollLock();
    acquireScrollLock();
    releaseScrollLock();
    expect(getScrollLockCount()).toBe(1);
    // Styles still applied
    expect(bodyStyle["position"]).toBe("fixed");
  });

  it("final release clears all styles and restores scroll", () => {
    acquireScrollLock();
    acquireScrollLock();
    releaseScrollLock();
    releaseScrollLock();
    expect(getScrollLockCount()).toBe(0);
    expect(bodyStyle["position"]).toBeUndefined();
    expect(bodyStyle["overflow"]).toBeUndefined();
    expect(bodyStyle["top"]).toBeUndefined();
    expect(bodyDataset["kebuScrollY"]).toBeUndefined();
    expect((window as unknown as { scrollTo: ReturnType<typeof vi.fn> }).scrollTo)
      .toHaveBeenCalledWith(0, 400);
  });

  it("release below 0 clamps at 0 and does not throw", () => {
    releaseScrollLock();
    expect(getScrollLockCount()).toBe(0);
  });

  it("acquire/release cycle is idempotent for odd counts", () => {
    acquireScrollLock();
    acquireScrollLock();
    acquireScrollLock();
    releaseScrollLock();
    releaseScrollLock();
    releaseScrollLock();
    expect(getScrollLockCount()).toBe(0);
    expect(bodyStyle["position"]).toBeUndefined();
  });
});
