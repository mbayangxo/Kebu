import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { computeSheet, formatAddress, parseAddress, type SheetCells } from "@/lib/sheets/engine";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Neutralizes CSV/formula injection (OWASP CSV Injection): text content
 * that starts with =, +, -, or @ is re-interpreted as a formula by a
 * spreadsheet application that opens the exported file -- a shared editor
 * (lower-trust than the owner) could otherwise plant a payload that runs
 * when the owner exports and opens it. Only applied to genuine text
 * (`isText`); a real negative number like "-5" is written bare so it still
 * displays correctly.
 */
function csvField(value: string, isText: boolean): string {
  const safe = isText && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

/**
 * Real CSV of computed values, via the exact same computeSheet() the grid
 * and the GET route use -- what the user sees rendered in a cell is what
 * this export writes, never a second, possibly-divergent implementation.
 * RLS-gated the same way as GET: no body row read bypasses the user-scoped
 * client.
 */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid sheet id." }, { status: 400 });
  }

  const { data: node, error: nodeError } = await supabase
    .from("library_nodes")
    .select("id, title, kind")
    .eq("id", id)
    .eq("kind", "sheet")
    .maybeSingle();
  if (nodeError || !node) {
    return NextResponse.json({ error: "Sheet not found." }, { status: 404 });
  }

  const { data: body } = await supabase
    .from("sheet_bodies")
    .select("cells, row_count, column_count")
    .eq("id", id)
    .maybeSingle();

  const cells = (body?.cells ?? {}) as SheetCells;
  const rowCount = body?.row_count ?? 100;
  const columnCount = body?.column_count ?? 26;
  const computed = computeSheet(cells, rowCount, columnCount);

  // Export the real used range (bounding box of non-empty cells), not the
  // full advisory grid -- a sheet with a handful of cells and 10,000
  // advisory rows should not produce a mostly-empty multi-megabyte file.
  let maxRow = 0, maxCol = 0;
  for (const address of Object.keys(cells)) {
    const pos = parseAddress(address);
    if (!pos) continue;
    maxRow = Math.max(maxRow, pos.row);
    maxCol = Math.max(maxCol, pos.col);
  }

  const lines: string[] = [];
  for (let row = 0; row <= maxRow; row++) {
    const fields: string[] = [];
    for (let col = 0; col <= maxCol; col++) {
      const cell = computed[formatAddress(row, col)];
      fields.push(csvField(cell?.display ?? "", cell?.isText ?? false));
    }
    lines.push(fields.join(","));
  }
  const csv = lines.join("\r\n") + "\r\n";

  const filename = (node.title || "sheet").replace(/[^a-z0-9-_ ]/gi, "").trim().slice(0, 80) || "sheet";
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
