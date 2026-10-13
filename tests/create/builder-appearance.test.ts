import { afterEach, describe, expect, it, vi } from "vitest";
import { BUILDER_APPEARANCE_PALETTES, appearancePreference, createBuilderAppearanceStore, resolveBuilderAppearance } from "@/lib/create/builder-appearance";

function localTime(hour: number, minute = 0) { return new Date(2026, 9, 13, hour, minute); }
function harness(saved: string | null = null) {
  let now = localTime(12);
  let storage = saved;
  let storageEvent: ((value: string | null) => void) | undefined;
  let foreground: (() => void) | undefined;
  const read = vi.fn(() => storage);
  const write = vi.fn((value: string) => { storage = value; });
  const unlisten = vi.fn();
  const store = createBuilderAppearanceStore({
    now: () => now, read, write,
    schedule: (callback, delay) => { const timer = setTimeout(callback, delay); return () => clearTimeout(timer); },
    listen: (onStorage, onForeground) => { storageEvent = onStorage; foreground = onForeground; return unlisten; },
  });
  return { store, read, write, unlisten, setTime: (time: Date) => { now = time; }, storage: (value: string | null) => storageEvent?.(value), foreground: () => foreground?.() };
}

afterEach(() => { vi.useRealTimers(); });

describe("Builder appearance schedule and preference", () => {
  it.each([[6, 59, "dark"], [7, 0, "light"], [19, 59, "light"], [20, 0, "dark"], [0, 0, "dark"]] as const)("Auto at %s:%s uses %s", (hour, minute, result) => {
    expect(resolveBuilderAppearance("auto", localTime(hour, minute))).toBe(result);
  });
  it("manual choices override local time", () => {
    expect(resolveBuilderAppearance("light", localTime(23))).toBe("light");
    expect(resolveBuilderAppearance("dark", localTime(12))).toBe("dark");
  });
  it.each([null, undefined, "invalid", "DARK", {}, 1])("invalid stored preference %s falls back to Auto", value => {
    expect(appearancePreference(value)).toBe("auto");
  });
});

describe("Editor appearance store lifecycle", () => {
  it("does not touch browser APIs during construction or server rendering", () => {
    const h = harness("dark");
    expect(h.read).not.toHaveBeenCalled();
    expect(h.store.getServerSnapshot()).toEqual({ preference: "auto", appearance: "light", persistenceUnavailable: false });
    expect(h.store.getSnapshot()).toBe(h.store.getServerSnapshot());
  });
  it("restores a saved preference and persists manual changes", () => {
    vi.useFakeTimers(); const h = harness("dark");
    const stop = h.store.subscribe(vi.fn());
    expect(h.store.getSnapshot().appearance).toBe("dark");
    h.store.setPreference("light");
    expect(h.write).toHaveBeenCalledWith("light");
    expect(h.store.getSnapshot().appearance).toBe("light");
    stop();
  });
  it("updates across the scheduled boundary without a refresh", () => {
    vi.useFakeTimers(); const h = harness(); h.setTime(localTime(19, 59));
    const stop = h.store.subscribe(vi.fn());
    expect(h.store.getSnapshot().appearance).toBe("light");
    h.setTime(localTime(20)); vi.advanceTimersByTime(60_000);
    expect(h.store.getSnapshot().appearance).toBe("dark");
    h.setTime(localTime(7)); vi.advanceTimersByTime(60_000);
    expect(h.store.getSnapshot().appearance).toBe("light"); stop();
  });
  it("handles a sleeping tab or changed clock immediately on foreground", () => {
    vi.useFakeTimers(); const h = harness(); const stop = h.store.subscribe(vi.fn());
    h.setTime(localTime(22)); h.foreground();
    expect(h.store.getSnapshot().appearance).toBe("dark");
    expect(vi.getTimerCount()).toBe(1); stop();
  });
  it("synchronizes a second tab, storage clear and invalid values without rewriting storage", () => {
    vi.useFakeTimers(); const h = harness(); const stop = h.store.subscribe(vi.fn());
    h.storage("dark"); expect(h.store.getSnapshot().preference).toBe("dark");
    h.storage(null); expect(h.store.getSnapshot().preference).toBe("auto");
    h.storage("bad"); expect(h.store.getSnapshot().appearance).toBe("light");
    expect(h.write).not.toHaveBeenCalled(); stop();
  });
  it("keeps manual choice through clock rechecks until Auto is selected", () => {
    vi.useFakeTimers(); const h = harness("light"); h.setTime(localTime(22));
    const stop = h.store.subscribe(vi.fn()); vi.advanceTimersByTime(120_000);
    expect(h.store.getSnapshot().appearance).toBe("light");
    h.store.setPreference("auto"); expect(h.store.getSnapshot().appearance).toBe("dark"); stop();
  });
  it("supports a session choice with an honest warning when storage is denied", () => {
    vi.useFakeTimers(); const h = harness();
    h.read.mockImplementation(() => { throw new Error("Storage denied"); });
    h.write.mockImplementation(() => { throw new Error("Quota exceeded"); });
    const stop = h.store.subscribe(vi.fn());
    h.store.setPreference("dark");
    expect(h.store.getSnapshot()).toEqual({ preference: "dark", appearance: "dark", persistenceUnavailable: true });
    stop();
  });
  it("retains one timer/listener set across subscribers and cleans up the last", () => {
    vi.useFakeTimers(); const h = harness();
    const stop1 = h.store.subscribe(vi.fn()); const stop2 = h.store.subscribe(vi.fn());
    expect(h.read).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(1);
    stop1(); expect(h.unlisten).not.toHaveBeenCalled();
    stop2(); expect(h.unlisten).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
    const stop3 = h.store.subscribe(vi.fn()); expect(vi.getTimerCount()).toBe(1); stop3();
  });
  it("keeps a stable snapshot and avoids redraws on unchanged clock checks", () => {
    vi.useFakeTimers(); const h = harness(); const listener = vi.fn();
    const stop = h.store.subscribe(listener); const snapshot = h.store.getSnapshot();
    vi.advanceTimersByTime(60_000);
    expect(h.store.getSnapshot()).toBe(snapshot); expect(listener).not.toHaveBeenCalled(); stop();
  });
});

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a: string, b: string) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

describe("Chrome palette readable text", () => {
  it.each(["light", "dark"] as const)("%s toolbar meets normal-text contrast", appearance => {
    const p = BUILDER_APPEARANCE_PALETTES[appearance];
    for (const foreground of [p.ink, p.muted, p.faint, p.saved, p.pending, p.error]) for (const background of [p.surface, p.surfaceMuted]) expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.action, p.onAction)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.liveSurface, p.liveInk)).toBeGreaterThanOrEqual(4.5);
  });
});
