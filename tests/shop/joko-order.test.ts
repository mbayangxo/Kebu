import { describe, expect, it } from "vitest";
import { parseXofFromLabel, xofToUsdCents } from "@/lib/shop/joko-order";

describe("shop JOKO order helpers", () => {
  it("parses XOF digits from price labels", () => {
    expect(parseXofFromLabel("8,000 XOF")).toBe(8000);
    expect(parseXofFromLabel("CFA 5 000")).toBe(5000);
    expect(parseXofFromLabel("")).toBeNull();
    expect(parseXofFromLabel("free")).toBeNull();
  });

  it("converts XOF to USD cents with configurable rate", () => {
    const prev = process.env.JOKO_XOF_PER_USD;
    process.env.JOKO_XOF_PER_USD = "600";
    expect(xofToUsdCents(6000)).toBe(1000);
    process.env.JOKO_XOF_PER_USD = prev;
  });
});
