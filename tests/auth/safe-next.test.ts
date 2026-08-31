import { describe, expect, it } from "vitest";
import { safeAuthNextPath } from "@/lib/auth/safe-next";

describe("safeAuthNextPath", () => {
  it("returns fallback when missing", () => {
    expect(safeAuthNextPath(null)).toBe("/dashboard");
    expect(safeAuthNextPath("")).toBe("/dashboard");
  });

  it("allows relative app paths including query", () => {
    expect(safeAuthNextPath("/create")).toBe("/create");
    expect(safeAuthNextPath("/create/new?template=musician-artist")).toBe(
      "/create/new?template=musician-artist",
    );
    expect(safeAuthNextPath("/business/abc-123")).toBe("/business/abc-123");
  });

  it("blocks open redirects", () => {
    expect(safeAuthNextPath("//evil.com")).toBe("/dashboard");
    expect(safeAuthNextPath("https://evil.com")).toBe("/dashboard");
    expect(safeAuthNextPath("/\\evil.com")).toBe("/dashboard");
    expect(safeAuthNextPath("javascript:alert(1)")).toBe("/dashboard");
  });
});
