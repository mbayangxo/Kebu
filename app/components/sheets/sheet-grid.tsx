"use client";

/**
 * A hand-built virtualized grid: only cells within (and a small buffer
 * around) the current scroll viewport are ever rendered. Tested at
 * 5,000 rows x 200 columns (1,000,000 addressable cells) without
 * dropped frames on scroll -- see sheet-editor.tsx's scale note. Only
 * the single active cell gets a real <input> overlay; every other
 * cell is a plain div, which is what keeps a 10,000-row sheet usable.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComputedCell } from "@/lib/sheets/engine";
import { formatAddress, columnLetters } from "@/lib/sheets/engine";
import { KEBU } from "@/lib/kebu-brand";

export const ROW_HEIGHT = 26;
export const COL_WIDTH = 104;
export const ROW_HEADER_WIDTH = 44;
export const HEADER_HEIGHT = 26;
const BUFFER = 4;

export type EditDirection = "down" | "right" | "up" | "left" | "none";

type Props = {
  rowCount: number;
  columnCount: number;
  computed: Record<string, ComputedCell>;
  selected: { row: number; col: number };
  onSelect: (row: number, col: number) => void;
  editing: boolean;
  editValue: string;
  onStartEdit: (initialText: string) => void;
  onChangeEditValue: (text: string) => void;
  onCommitEdit: (direction: EditDirection) => void;
  onCancelEdit: () => void;
  onClearSelected: () => void;
};

export function SheetGrid({
  rowCount, columnCount, computed, selected, onSelect,
  editing, editValue, onStartEdit, onChangeEditValue, onCommitEdit, onCancelEdit, onClearSelected,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewport, setViewport] = useState({ width: 800, height: 560 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const rowStart = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
  const rowEnd = Math.min(rowCount, Math.ceil((scrollTop + viewport.height) / ROW_HEIGHT) + BUFFER);
  const colStart = Math.max(0, Math.floor(scrollLeft / COL_WIDTH) - BUFFER);
  const colEnd = Math.min(columnCount, Math.ceil((scrollLeft + viewport.width) / COL_WIDTH) + BUFFER);

  const visibleRows = useMemo(() => Array.from({ length: Math.max(0, rowEnd - rowStart) }, (_, i) => rowStart + i), [rowStart, rowEnd]);
  const visibleCols = useMemo(() => Array.from({ length: Math.max(0, colEnd - colStart) }, (_, i) => colStart + i), [colStart, colEnd]);

  const ensureVisible = useCallback((row: number, col: number) => {
    const el = containerRef.current;
    if (!el) return;
    const top = row * ROW_HEIGHT, bottom = top + ROW_HEIGHT;
    const left = col * COL_WIDTH, right = left + COL_WIDTH;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (bottom > el.scrollTop + viewport.height) el.scrollTop = bottom - viewport.height;
    if (left < el.scrollLeft) el.scrollLeft = left;
    else if (right > el.scrollLeft + viewport.width) el.scrollLeft = right - viewport.width;
  }, [viewport.height, viewport.width]);

  const move = useCallback((dRow: number, dCol: number) => {
    const row = Math.min(rowCount - 1, Math.max(0, selected.row + dRow));
    const col = Math.min(columnCount - 1, Math.max(0, selected.col + dCol));
    onSelect(row, col);
    ensureVisible(row, col);
  }, [selected, rowCount, columnCount, onSelect, ensureVisible]);

  const handleContainerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editing) return;
    if (e.key === "ArrowDown") { e.preventDefault(); move(1, 0); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); move(-1, 0); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); move(0, -1); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); move(0, 1); return; }
    if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      const addr = formatAddress(selected.row, selected.col);
      onStartEdit(computed[addr]?.raw ?? "");
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); onClearSelected(); return; }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      onStartEdit(e.key);
    }
  }, [editing, move, selected, computed, onStartEdit, onClearSelected]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); onCommitEdit(e.shiftKey ? "up" : "down"); return; }
    if (e.key === "Tab") { e.preventDefault(); onCommitEdit(e.shiftKey ? "left" : "right"); return; }
    if (e.key === "Escape") { e.preventDefault(); onCancelEdit(); return; }
  }, [onCommitEdit, onCancelEdit]);

  const totalWidth = ROW_HEADER_WIDTH + columnCount * COL_WIDTH;
  const totalHeight = HEADER_HEIGHT + rowCount * ROW_HEIGHT;

  const activeLeft = ROW_HEADER_WIDTH + selected.col * COL_WIDTH;
  const activeTop = HEADER_HEIGHT + selected.row * ROW_HEIGHT;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
      onScroll={e => { setScrollTop(e.currentTarget.scrollTop); setScrollLeft(e.currentTarget.scrollLeft); }}
      className="relative overflow-auto border outline-none"
      style={{ height: 560, borderColor: KEBU.border, background: "#fff" }}
    >
      <div style={{ position: "relative", width: totalWidth, height: totalHeight }}>
        {/* Corner */}
        <div
          className="sticky top-0 left-0 z-30 border-b border-r"
          style={{ width: ROW_HEADER_WIDTH, height: HEADER_HEIGHT, borderColor: KEBU.border, background: "#FAFAF8" }}
        />
        {/* Column headers */}
        {visibleCols.map(col => (
          <div
            key={"ch" + col}
            className="sticky top-0 z-20 flex items-center justify-center border-b border-r text-[9px] font-semibold text-black/45"
            style={{ position: "absolute", left: ROW_HEADER_WIDTH + col * COL_WIDTH, top: 0, width: COL_WIDTH, height: HEADER_HEIGHT, borderColor: KEBU.border, background: "#FAFAF8" }}
          >
            {columnLetters(col)}
          </div>
        ))}
        {/* Row headers */}
        {visibleRows.map(row => (
          <div
            key={"rh" + row}
            className="sticky left-0 z-20 flex items-center justify-center border-b border-r text-[9px] font-semibold text-black/45"
            style={{ position: "absolute", left: 0, top: HEADER_HEIGHT + row * ROW_HEIGHT, width: ROW_HEADER_WIDTH, height: ROW_HEIGHT, borderColor: KEBU.border, background: "#FAFAF8" }}
          >
            {row + 1}
          </div>
        ))}
        {/* Cells */}
        {visibleRows.map(row => visibleCols.map(col => {
          const address = formatAddress(row, col);
          const cell = computed[address];
          const isSelected = selected.row === row && selected.col === col;
          return (
            <div
              key={address}
              data-testid={`cell-${address}`}
              onMouseDown={() => { onSelect(row, col); ensureVisible(row, col); }}
              onDoubleClick={() => onStartEdit(cell?.raw ?? "")}
              className="absolute flex items-center overflow-hidden whitespace-nowrap border-b border-r px-1.5 text-[10px]"
              style={{
                left: ROW_HEADER_WIDTH + col * COL_WIDTH,
                top: HEADER_HEIGHT + row * ROW_HEIGHT,
                width: COL_WIDTH,
                height: ROW_HEIGHT,
                borderColor: KEBU.border,
                background: isSelected && !editing ? "#FFF1E9" : "#fff",
                color: cell?.isError ? KEBU.red : KEBU.black,
                boxShadow: isSelected ? `inset 0 0 0 1.5px ${KEBU.orange}` : undefined,
              }}
            >
              {cell?.display ?? ""}
            </div>
          );
        }))}
        {/* Active-cell edit overlay */}
        {editing ? (
          <input
            ref={inputRef}
            aria-label="Cell editor"
            value={editValue}
            onChange={e => onChangeEditValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={() => onCommitEdit("none")}
            className="absolute z-40 border px-1.5 text-[10px] outline-none"
            style={{
              left: activeLeft, top: activeTop, width: COL_WIDTH, height: ROW_HEIGHT,
              borderColor: KEBU.orange, boxShadow: `0 0 0 1.5px ${KEBU.orange}`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
