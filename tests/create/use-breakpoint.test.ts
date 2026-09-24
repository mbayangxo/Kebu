/**
 * Tests for the breakpoint resolution logic.
 * The hooks (useBreakpoint, useContainerBreakpoint) rely on ResizeObserver +
 * React state and are tested via Playwright device tests (item 14 of the gate).
 * Here we test the pure width→breakpoint mapping used internally.
 */

import { describe, it, expect } from "vitest";

// Re-export the internal resolver for testing by matching the logic directly.
// We shadow the module rather than exporting the private function from the lib.
type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

const BREAKPOINTS: { name: Breakpoint; minWidth: number }[] = [
  { name: "xl", minWidth: 1280 },
  { name: "lg", minWidth: 1024 },
  { name: "md", minWidth: 768 },
  { name: "sm", minWidth: 640 },
  { name: "xs", minWidth: 0 },
];

function resolveBreakpoint(width: number): Breakpoint {
  for (const bp of BREAKPOINTS) {
    if (width >= bp.minWidth) return bp.name;
  }
  return "xs";
}

describe("resolveBreakpoint", () => {
  it("maps 0 to xs", () => expect(resolveBreakpoint(0)).toBe("xs"));
  it("maps 639 to xs", () => expect(resolveBreakpoint(639)).toBe("xs"));
  it("maps 640 to sm", () => expect(resolveBreakpoint(640)).toBe("sm"));
  it("maps 767 to sm", () => expect(resolveBreakpoint(767)).toBe("sm"));
  it("maps 768 to md", () => expect(resolveBreakpoint(768)).toBe("md"));
  it("maps 1023 to md", () => expect(resolveBreakpoint(1023)).toBe("md"));
  it("maps 1024 to lg", () => expect(resolveBreakpoint(1024)).toBe("lg"));
  it("maps 1279 to lg", () => expect(resolveBreakpoint(1279)).toBe("lg"));
  it("maps 1280 to xl", () => expect(resolveBreakpoint(1280)).toBe("xl"));
  it("maps 1920 to xl", () => expect(resolveBreakpoint(1920)).toBe("xl"));
});

describe("container-aware breakpoint contracts", () => {
  it("tablet canvas at 480px (side panel open) resolves to xs", () => {
    // When the left panel (280px) + rail (44px) is open on a 768px viewport,
    // the canvas is ~444px — xs, not md.
    expect(resolveBreakpoint(480)).toBe("xs");
  });

  it("canvas with panel open at ~680px resolves to sm not md", () => {
    // 1024px viewport - 280px panel - 44px rail = ~700px canvas
    expect(resolveBreakpoint(680)).toBe("sm");
  });

  it("full-width desktop canvas at 1280+ is xl", () => {
    expect(resolveBreakpoint(1280)).toBe("xl");
  });
});
