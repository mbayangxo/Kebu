/**
 * Real formula evaluation, via the actual HyperFormula integration in
 * lib/sheets/engine.ts -- not a reimplementation or a stub. A bug in the
 * real wiring (address parsing, dependency graph, error surfacing) would
 * actually fail here.
 */
import { describe, expect, it } from "vitest";
import { computeSheet, formatAddress, parseAddress, columnLetters, isValidCellsMap, type SheetCells } from "@/lib/sheets/engine";

describe("address parsing", () => {
  it("parses and formats single- and multi-letter columns", () => {
    expect(parseAddress("A1")).toEqual({ row: 0, col: 0 });
    expect(parseAddress("B2")).toEqual({ row: 1, col: 1 });
    expect(parseAddress("AA1")).toEqual({ row: 0, col: 26 });
    expect(parseAddress("ZZ1")).toEqual({ row: 0, col: 701 });
    expect(formatAddress(0, 0)).toBe("A1");
    expect(formatAddress(1, 1)).toBe("B2");
    expect(formatAddress(0, 26)).toBe("AA1");
    expect(formatAddress(0, 701)).toBe("ZZ1");
  });

  it("rejects malformed addresses", () => {
    expect(parseAddress("1A")).toBeNull();
    expect(parseAddress("A0")).toBeNull();
    expect(parseAddress("")).toBeNull();
    expect(parseAddress("A1B")).toBeNull();
  });

  it("derives column letters from an index", () => {
    expect(columnLetters(0)).toBe("A");
    expect(columnLetters(25)).toBe("Z");
    expect(columnLetters(26)).toBe("AA");
  });
});

describe("isValidCellsMap", () => {
  it("accepts a well-formed sparse cells map", () => {
    expect(isValidCellsMap({ A1: { raw: "12" }, B2: { raw: "=A1+1" } })).toBe(true);
  });
  it("rejects a bad address, a non-string raw, or an oversized raw", () => {
    expect(isValidCellsMap({ "1A": { raw: "12" } })).toBe(false);
    expect(isValidCellsMap({ A1: { raw: 12 } })).toBe(false);
    expect(isValidCellsMap({ A1: { raw: "x".repeat(8001) } })).toBe(false);
    expect(isValidCellsMap(null)).toBe(false);
    expect(isValidCellsMap([])).toBe(false);
  });
});

describe("computeSheet — real HyperFormula evaluation", () => {
  it("evaluates a literal and a SUM formula referencing a range", () => {
    const cells: SheetCells = { A1: { raw: "1" }, A2: { raw: "2" }, A3: { raw: "3" }, A4: { raw: "=SUM(A1:A3)" } };
    const result = computeSheet(cells, 10, 5);
    expect(result.A4).toMatchObject({ raw: "=SUM(A1:A3)", display: "6", isFormula: true, isError: false });
  });

  it("evaluates a cross-cell reference", () => {
    const cells: SheetCells = { A1: { raw: "10" }, B1: { raw: "=A1+1" }, C1: { raw: "=SUM(A1:B1)" } };
    const result = computeSheet(cells, 10, 5);
    expect(result.B1.display).toBe("11");
    expect(result.C1.display).toBe("21");
  });

  it("recalculates every dependent in the chain when the source cell changes", () => {
    const base: SheetCells = { A1: { raw: "1" }, B1: { raw: "=A1+1" }, C1: { raw: "=SUM(A1:B1)" } };
    const before = computeSheet(base, 10, 5);
    expect(before.B1.display).toBe("2");
    expect(before.C1.display).toBe("3");

    const updated: SheetCells = { ...base, A1: { raw: "10" } };
    const after = computeSheet(updated, 10, 5);
    expect(after.B1.display).toBe("11");
    expect(after.C1.display).toBe("21");
  });

  it("detects a genuine circular reference and surfaces it as a real per-cell error", () => {
    const cells: SheetCells = { A2: { raw: "=B2" }, B2: { raw: "=A2" } };
    const result = computeSheet(cells, 10, 5);
    expect(result.A2.isError).toBe(true);
    expect(result.A2.display).toContain("CYCLE");
    expect(result.B2.isError).toBe(true);
  });

  it("keeps the raw formula string intact across computation, distinct from the display value", () => {
    const cells: SheetCells = { A1: { raw: "=1+1" } };
    const result = computeSheet(cells, 10, 5);
    expect(result.A1.raw).toBe("=1+1");
    expect(result.A1.display).toBe("2");
    expect(result.A1.isFormula).toBe(true);
  });

  it("treats a plain literal as non-formula with isFormula false", () => {
    const cells: SheetCells = { A1: { raw: "hello" } };
    const result = computeSheet(cells, 10, 5);
    expect(result.A1).toMatchObject({ raw: "hello", display: "hello", isFormula: false, isError: false });
  });

  it("ignores a stored address outside the sheet's declared dimensions rather than throwing", () => {
    const cells: SheetCells = { Z99: { raw: "1" } };
    expect(() => computeSheet(cells, 5, 5)).not.toThrow();
  });

  it("marks a genuine number's display as not text, so CSV export can write it bare", () => {
    const cells: SheetCells = { A1: { raw: "-5" }, A2: { raw: "=1-6" } };
    const result = computeSheet(cells, 10, 5);
    expect(result.A1).toMatchObject({ display: "-5", isText: false });
    expect(result.A2).toMatchObject({ display: "-5", isText: false });
  });

  it("marks plain text content as text — including content that merely starts with a formula-like character", () => {
    const cells: SheetCells = { A1: { raw: "hello" }, A2: { raw: "-not-a-number" } };
    const result = computeSheet(cells, 10, 5);
    expect(result.A1).toMatchObject({ display: "hello", isText: true });
    expect(result.A2).toMatchObject({ display: "-not-a-number", isText: true });
  });
});
