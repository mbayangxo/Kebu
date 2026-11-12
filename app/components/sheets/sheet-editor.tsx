"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { computeSheet, type ComputedCell, type SheetCells } from "@/lib/sheets/engine";
import { SheetGrid, type EditDirection } from "@/app/components/sheets/sheet-grid";
import { KEBU } from "@/lib/kebu-brand";

type SaveStatus = "loading" | "saved" | "pending" | "saving" | "error" | "not-found" | "conflict";

const AUTOSAVE_DELAY_MS = 700;
const DEFAULT_ROWS = 100;
const DEFAULT_COLS = 26;

export function SheetEditor({ id }: { id: string }) {
  const [title, setTitle] = useState<string>("Untitled sheet");
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(DEFAULT_ROWS);
  const [columnCount, setColumnCount] = useState(DEFAULT_COLS);
  const [computed, setComputed] = useState<Record<string, ComputedCell>>({});
  const [selected, setSelected] = useState({ row: 0, col: 0 });
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const rawCellsRef = useRef<SheetCells>({});
  const dimsRef = useRef({ rowCount: DEFAULT_ROWS, columnCount: DEFAULT_COLS });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const revisionRef = useRef<string | null>(null);
  const conflictRef = useRef(false);
  const loadedRef = useRef(false);
  const savedTitleRef = useRef("");
  const titleRevisionRef = useRef<string | null>(null);
  const dirtySinceSaveRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    void (async () => {
      try {
        const response = await fetch(`/api/library/sheets/${id}`, { credentials: "include", cache: "no-store" });
        if (response.status === 404) { if (mountedRef.current) setStatus("not-found"); return; }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not load sheet.");
        if (!mountedRef.current) return;
        const nextCells: SheetCells = {};
        for (const [addr, cell] of Object.entries(data.cells as Record<string, ComputedCell>)) {
          nextCells[addr] = { raw: cell.raw };
        }
        rawCellsRef.current = nextCells;
        dimsRef.current = { rowCount: data.rowCount, columnCount: data.columnCount };
        revisionRef.current = data.updatedAt ?? null;
        loadedRef.current = true;
        titleRevisionRef.current = data.nodeUpdatedAt ?? null;
        savedTitleRef.current = data.title ?? "";
        setTitle(data.title ?? "Untitled sheet");
        setRowCount(data.rowCount);
        setColumnCount(data.columnCount);
        setComputed(data.cells);
        setStatus("saved");
      } catch (cause) {
        if (mountedRef.current) { setStatus("error"); setErrorMessage(cause instanceof Error ? cause.message : "Could not load sheet."); }
      }
    })();
    return () => { mountedRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [id]);

  const persist = useCallback(() => {
    if (conflictRef.current || !loadedRef.current) return;
    if (savingRef.current) { dirtySinceSaveRef.current = true; return; }
    savingRef.current = true;
    dirtySinceSaveRef.current = false;
    setStatus("saving");
    void (async () => {
      try {
        const response = await fetch(`/api/library/sheets/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedUpdatedAt: revisionRef.current, cells: rawCellsRef.current, rowCount: dimsRef.current.rowCount, columnCount: dimsRef.current.columnCount }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 409 || response.status === 428) {
          conflictRef.current = true;
          setStatus("conflict");
          setErrorMessage(data.error);
          return;
        }
        if (!response.ok) throw new Error(data.error || "Could not save sheet.");
        revisionRef.current = data.updatedAt;
        if (mountedRef.current) { if (!dirtySinceSaveRef.current) setComputed(data.cells); setStatus(dirtySinceSaveRef.current ? "pending" : "saved"); }
      } catch (cause) {
        if (mountedRef.current) { setStatus("error"); setErrorMessage(cause instanceof Error ? cause.message : "Could not save sheet."); }
      } finally {
        savingRef.current = false;
        if (dirtySinceSaveRef.current) persist();
      }
    })();
  }, [id]);

  const scheduleSave = useCallback(() => {
    if (conflictRef.current || !loadedRef.current) return;
    setStatus("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(persist, AUTOSAVE_DELAY_MS);
  }, [persist]);

  const recomputeLocally = useCallback(() => {
    setComputed(computeSheet(rawCellsRef.current, dimsRef.current.rowCount, dimsRef.current.columnCount));
  }, []);

  const addressOf = useCallback((row: number, col: number) => {
    let n = col + 1, letters = "";
    while (n > 0) { const rem = (n - 1) % 26; letters = String.fromCharCode(65 + rem) + letters; n = Math.floor((n - 1) / 26); }
    return `${letters}${row + 1}`;
  }, []);

  const commitValue = useCallback((row: number, col: number, raw: string) => {
    const address = addressOf(row, col);
    const trimmed = raw;
    if (trimmed === "") delete rawCellsRef.current[address];
    else rawCellsRef.current[address] = { raw: trimmed };
    recomputeLocally();
    scheduleSave();
  }, [addressOf, recomputeLocally, scheduleSave]);

  const onStartEdit = useCallback((initialText: string) => { setEditValue(initialText); setEditing(true); }, []);
  const onChangeEditValue = useCallback((text: string) => setEditValue(text), []);
  const onCancelEdit = useCallback(() => setEditing(false), []);

  const onCommitEdit = useCallback((direction: EditDirection) => {
    if (!editing) return;
    commitValue(selected.row, selected.col, editValue);
    setEditing(false);
    if (direction === "down") setSelected(s => ({ row: Math.min(rowCount - 1, s.row + 1), col: s.col }));
    else if (direction === "up") setSelected(s => ({ row: Math.max(0, s.row - 1), col: s.col }));
    else if (direction === "right") setSelected(s => ({ row: s.row, col: Math.min(columnCount - 1, s.col + 1) }));
    else if (direction === "left") setSelected(s => ({ row: s.row, col: Math.max(0, s.col - 1) }));
  }, [editing, selected, editValue, commitValue, rowCount, columnCount]);

  const onClearSelected = useCallback(() => commitValue(selected.row, selected.col, ""), [commitValue, selected]);

  const addRows = useCallback(() => {
    const next = Math.min(10000, dimsRef.current.rowCount + 50);
    dimsRef.current = { ...dimsRef.current, rowCount: next };
    setRowCount(next);
    scheduleSave();
  }, [scheduleSave]);

  const addColumns = useCallback(() => {
    const next = Math.min(702, dimsRef.current.columnCount + 10);
    dimsRef.current = { ...dimsRef.current, columnCount: next };
    setColumnCount(next);
    scheduleSave();
  }, [scheduleSave]);

  const activeAddress = addressOf(selected.row, selected.col);
  const activeRaw = computed[activeAddress]?.raw ?? "";
  const formulaBarValue = editing ? editValue : activeRaw;

  if (status === "loading") return <div className="p-10 text-center text-[10px] text-black/40">Loading sheet…</div>;
  if (status === "not-found") return <div className="p-10 text-center text-[10px] text-black/40">Sheet not found, or you don&apos;t have access.</div>;

  const statusLabel: Record<SaveStatus, string> = {
    conflict: "Newer version available — edits kept locally", loading: "", saved: "Saved", pending: "Saving…", saving: "Saving…", error: errorMessage ?? "Could not save", "not-found": "",
  };

  return (
    <div className="flex h-full flex-col">
      {status === "conflict" && <div role="alert" className="border-b bg-amber-50 p-3 text-sm">
        <p>{errorMessage}</p>
        <button type="button" className="mr-4 underline" onClick={() => {
          const url = URL.createObjectURL(new Blob([JSON.stringify({ title, cells: rawCellsRef.current, ...dimsRef.current }, null, 2)], { type: "application/json" }));
          const link = document.createElement("a"); link.href = url; link.download = `kebu-${id}-recovery.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}>Download my edits</button>
        <button type="button" className="underline" onClick={() => { if (window.confirm("Reload the latest version? Download your edits first; reloading discards this local copy.")) window.location.reload(); }}>Reload latest</button>
      </div>}
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5" style={{ borderColor: KEBU.border }}>
        <div className="flex items-center gap-3">
          <Link href="/library?view=sheets" className="text-[9px] text-black/35">← Library</Link>
          <input
            aria-label="Sheet title"
            value={title}
            onChange={e => { setTitle(e.target.value); }}
            onBlur={() => {
              const nextTitle = title.trim();
              if (!loadedRef.current || conflictRef.current || nextTitle === savedTitleRef.current) return;
              void fetch("/api/library/nodes", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, title: nextTitle, ...(titleRevisionRef.current ? { expectedUpdatedAt: titleRevisionRef.current } : {}) }) }).then(async response => {
                const data = await response.json().catch(() => ({}));
                if (response.status === 409) { conflictRef.current = true; setStatus("conflict"); setErrorMessage("The title changed elsewhere. Download your edits before reloading."); return; }
                if (!response.ok) throw new Error("Could not save title. Your changes are kept here.");
                titleRevisionRef.current = data.node.updated_at;
                savedTitleRef.current = nextTitle;
              }).catch(cause => { setErrorMessage(cause.message); setStatus("error"); });
            }}
            className="border-none text-[13px] font-semibold outline-none"
          />
          <span role="status" className="text-[9px]" style={{ color: status === "error" ? KEBU.red : "rgba(10,10,10,0.35)" }}>{statusLabel[status]}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addRows} className="rounded-full border px-3 py-1 text-[9px] font-semibold" style={{ borderColor: KEBU.border }}>+50 rows</button>
          <button onClick={addColumns} className="rounded-full border px-3 py-1 text-[9px] font-semibold" style={{ borderColor: KEBU.border }}>+10 columns</button>
          <a href={`/api/library/sheets/${id}/export`} download className="rounded-full bg-black px-3 py-1 text-[9px] font-semibold text-white">Export CSV</a>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b px-4 py-1.5" style={{ borderColor: KEBU.border }}>
        <span data-testid="active-address" className="w-12 shrink-0 text-center text-[9px] font-semibold text-black/40">{activeAddress}</span>
        <span className="text-black/20">=</span>
        <input
          aria-label="Formula bar"
          value={formulaBarValue}
          onChange={e => { setEditValue(e.target.value); setEditing(true); }}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); onCommitEdit("down"); }
            if (e.key === "Escape") { e.preventDefault(); onCancelEdit(); }
          }}
          onFocus={() => { if (!editing) setEditValue(activeRaw); setEditing(true); }}
          className="flex-1 border-none text-[10px] outline-none"
        />
      </div>

      <div className="flex-1 overflow-hidden p-2">
        <SheetGrid
          rowCount={rowCount}
          columnCount={columnCount}
          computed={computed}
          selected={selected}
          onSelect={(row, col) => { setSelected({ row, col }); setEditing(false); }}
          editing={editing}
          editValue={editValue}
          onStartEdit={onStartEdit}
          onChangeEditValue={onChangeEditValue}
          onCommitEdit={onCommitEdit}
          onCancelEdit={onCancelEdit}
          onClearSelected={onClearSelected}
        />
      </div>
    </div>
  );
}
