/**
 * Regression for a real CSV/formula-injection bug (OWASP CSV Injection):
 * the export route wrote a cell's display value bare, so a shared editor
 * (lower-trust than the owner) could plant text that a spreadsheet
 * application re-interprets as a formula when the owner exports and opens
 * the file. Fixed in lib/sheets/engine.ts (ComputedCell.isText) and
 * app/api/library/sheets/[id]/export/route.ts (csvField).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: deps.auth }));

import { GET } from "@/app/api/library/sheets/[id]/export/route";

const sheetId = "33333333-3333-4333-8333-333333333333";

function chain(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "maybeSingle"]) q[m] = vi.fn(() => q);
  (q.maybeSingle as ReturnType<typeof vi.fn>).mockImplementation(async () => result);
  return q;
}

function setupAuth(fromImpl: (table: string) => unknown) {
  deps.auth.mockResolvedValue({ user: { id: "owner" }, supabase: { from: (table: string) => fromImpl(table) } });
}

async function exportCsv(cells: Record<string, { raw: string }>) {
  setupAuth((table: string) => {
    if (table === "library_nodes") return chain({ data: { id: sheetId, title: "Sheet", kind: "sheet" }, error: null });
    if (table === "sheet_bodies") return chain({ data: { cells, row_count: 10, column_count: 5 }, error: null });
    throw new Error(`Unexpected table ${table}`);
  });
  const res = await GET(new Request(`https://kebu.test/api/library/sheets/${sheetId}/export`), {
    params: Promise.resolve({ id: sheetId }),
  });
  return res.text();
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/library/sheets/[id]/export — CSV injection", () => {
  it("prefixes a formula-like TEXT result with an apostrophe so a spreadsheet app treats it as literal text", async () => {
    const csv = await exportCsv({ A1: { raw: "-not-a-number" }, B1: { raw: "@SUM(cmd)" }, C1: { raw: "+evil" } });
    const [row] = csv.trim().split("\r\n");
    expect(row).toBe("'-not-a-number,'@SUM(cmd),'+evil");
  });

  it("does NOT mangle a genuine negative number — real value stays bare for correct display", async () => {
    const csv = await exportCsv({ A1: { raw: "-5" }, B1: { raw: "=1-6" } });
    const [row] = csv.trim().split("\r\n");
    expect(row).toBe("-5,-5");
  });

  it("leaves plain non-dangerous text untouched", async () => {
    const csv = await exportCsv({ A1: { raw: "hello" } });
    expect(csv.trim()).toBe("hello");
  });
});
