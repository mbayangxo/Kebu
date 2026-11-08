/**
 * Real formula evaluation for Sheets, via HyperFormula -- the same library and
 * the same code path used client-side (live editing) and server-side (export),
 * so a value a user sees in the grid is provably the same value an export
 * produces, not two different implementations that could silently disagree.
 */
import { HyperFormula, type CellValue } from "hyperformula";

export type SheetCell = { raw: string };
export type SheetCells = Record<string, SheetCell>;

export type ComputedCell = {
  raw: string;
  display: string;
  isFormula: boolean;
  isError: boolean;
};

const ADDRESS_RE = /^([A-Z]+)([1-9][0-9]*)$/;

/** "A1" -> {row: 0, col: 0}. Supports multi-letter columns ("AA1", "ZZ1"). */
export function parseAddress(address: string): { row: number; col: number } | null {
  const m = ADDRESS_RE.exec(address.trim().toUpperCase());
  if (!m) return null;
  const [, letters, digits] = m;
  let col = 0;
  for (const ch of letters!) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row: Number(digits) - 1, col: col - 1 };
}

/** {row: 0, col: 0} -> "A1". */
export function formatAddress(row: number, col: number): string {
  let n = col + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return `${letters}${row + 1}`;
}

export function columnLetters(index: number): string {
  return formatAddress(0, index).replace(/\d+$/, "");
}

function displayValue(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    // DetailedCellError
    const err = value as { value?: unknown };
    return typeof err.value === "string" ? err.value : "#ERROR!";
  }
  return String(value);
}

function isErrorValue(value: CellValue): boolean {
  return typeof value === "object" && value !== null;
}

/**
 * Builds a real HyperFormula instance from stored raw cells, computes every
 * non-empty cell, and returns the raw/display/error state for each -- the
 * single source of truth both the live grid and CSV export read from.
 */
export function computeSheet(cells: SheetCells, rowCount: number, columnCount: number): Record<string, ComputedCell> {
  const sheetData: string[][] = Array.from({ length: rowCount }, () => Array.from({ length: columnCount }, () => ""));
  for (const [address, cell] of Object.entries(cells)) {
    const pos = parseAddress(address);
    if (!pos || pos.row < 0 || pos.row >= rowCount || pos.col < 0 || pos.col >= columnCount) continue;
    sheetData[pos.row]![pos.col] = cell.raw;
  }

  const hf = HyperFormula.buildFromArray(sheetData, { licenseKey: "gpl-v3" });
  const result: Record<string, ComputedCell> = {};
  try {
    for (const [address, cell] of Object.entries(cells)) {
      const pos = parseAddress(address);
      if (!pos) continue;
      const value = hf.getCellValue({ sheet: 0, row: pos.row, col: pos.col });
      result[address] = {
        raw: cell.raw,
        display: displayValue(value),
        isFormula: cell.raw.trim().startsWith("="),
        isError: isErrorValue(value),
      };
    }
  } finally {
    hf.destroy();
  }
  return result;
}

/** Validates a cells map shape without computing -- used by the API route before persisting. */
export function isValidCellsMap(value: unknown): value is SheetCells {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  for (const [address, cell] of Object.entries(value as Record<string, unknown>)) {
    if (!parseAddress(address)) return false;
    if (typeof cell !== "object" || cell === null) return false;
    const raw = (cell as { raw?: unknown }).raw;
    if (typeof raw !== "string" || raw.length > 8000) return false;
  }
  return true;
}
