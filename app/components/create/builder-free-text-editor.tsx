"use client";

import { BUILDER } from "@/lib/create/builder-ui";
import { TEXT_FONT_OPTIONS, cssFontStack } from "@/lib/create/site-theme-fonts";

export type FreeTextBlock = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: "sm" | "md" | "lg" | "xl" | "hero";
  align: "left" | "center" | "right";
  color?: string;
  fontFamily?: string;
};

const FONT_SIZES: FreeTextBlock["fontSize"][] = ["sm", "md", "lg", "xl", "hero"];
const ALIGNS: FreeTextBlock["align"][] = ["left", "center", "right"];

/**
 * Edit moveable text blocks — replace mock copy, pick fonts, nudge position.
 * Drag on canvas still moves; this panel is the precise control surface.
 */
export function BuilderFreeTextEditor({
  blocks,
  themeDisplayFont,
  themeBodyFont,
  onChange,
}: {
  blocks: FreeTextBlock[];
  themeDisplayFont?: string;
  themeBodyFont?: string;
  onChange: (blocks: FreeTextBlock[]) => void;
}) {
  function patchBlock(id: string, patch: Partial<FreeTextBlock>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function addBlock() {
    onChange([
      ...blocks,
      {
        id: `text-${Date.now()}`,
        text: "Your text here — replace this",
        x: 10,
        y: Math.min(80, 12 + blocks.length * 14),
        width: 80,
        fontSize: "lg",
        align: "left",
        color: "",
        fontFamily: "",
      },
    ]);
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed" style={{ color: BUILDER.muted }}>
        Delete the mock words and type yours. Pick a font per box. Drag on the preview to move, or use the
        position sliders below.
      </p>
      <button
        type="button"
        className="w-full rounded-lg px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider"
        style={{ background: BUILDER.ink, color: "#fff" }}
        onClick={addBlock}
      >
        + Add text box
      </button>
      {blocks.length === 0 ? (
        <p className="text-[11px]" style={{ color: BUILDER.faint }}>
          No text boxes yet — add one, then edit on the canvas or here.
        </p>
      ) : null}
      {blocks.map((block, index) => (
        <div
          key={block.id}
          className="space-y-2 rounded-xl p-2.5"
          style={{ border: `1px solid ${BUILDER.border}`, background: BUILDER.surfaceMuted }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.orange }}>
              Text box {index + 1}
            </p>
            <button
              type="button"
              className="text-[10px] font-semibold text-red-600"
              onClick={() => onChange(blocks.filter((b) => b.id !== block.id))}
            >
              Delete
            </button>
          </div>
          <label className="block text-[10px] uppercase tracking-wider" style={{ color: BUILDER.muted }}>
            Words
            <textarea
              className="mt-1 w-full rounded-lg px-2 py-1.5 text-sm leading-snug"
              style={{
                border: `1px solid ${BUILDER.border}`,
                fontFamily: block.fontFamily
                  ? cssFontStack(block.fontFamily)
                  : themeDisplayFont
                    ? cssFontStack(themeDisplayFont)
                    : undefined,
                minHeight: 64,
              }}
              value={block.text}
              onChange={(e) => patchBlock(block.id, { text: e.target.value })}
              placeholder="Replace mock text…"
              aria-label={`Text for box ${index + 1}`}
            />
          </label>
          <label className="block text-[10px] uppercase tracking-wider" style={{ color: BUILDER.muted }}>
            Font
            <select
              className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
              style={{ border: `1px solid ${BUILDER.border}` }}
              value={block.fontFamily ?? ""}
              onChange={(e) => patchBlock(block.id, { fontFamily: e.target.value })}
              aria-label={`Font for box ${index + 1}`}
            >
              <option value="">
                Site default
                {themeDisplayFont ? ` (${themeDisplayFont})` : ""}
              </option>
              {themeBodyFont && themeBodyFont !== themeDisplayFont ? (
                <option value={themeBodyFont}>Body · {themeBodyFont}</option>
              ) : null}
              {TEXT_FONT_OPTIONS.filter((f) => f !== themeDisplayFont && f !== themeBodyFont).map((f) => (
                <option key={f} value={f} style={{ fontFamily: cssFontStack(f) }}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[10px] uppercase tracking-wider" style={{ color: BUILDER.muted }}>
              Size
              <select
                className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
                style={{ border: `1px solid ${BUILDER.border}` }}
                value={block.fontSize}
                onChange={(e) =>
                  patchBlock(block.id, { fontSize: e.target.value as FreeTextBlock["fontSize"] })
                }
              >
                {FONT_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] uppercase tracking-wider" style={{ color: BUILDER.muted }}>
              Align
              <select
                className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
                style={{ border: `1px solid ${BUILDER.border}` }}
                value={block.align}
                onChange={(e) =>
                  patchBlock(block.id, { align: e.target.value as FreeTextBlock["align"] })
                }
              >
                {ALIGNS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-[10px] uppercase tracking-wider" style={{ color: BUILDER.muted }}>
            Color (blank = theme text)
            <input
              className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs font-mono"
              style={{ border: `1px solid ${BUILDER.border}` }}
              value={block.color ?? ""}
              onChange={(e) => patchBlock(block.id, { color: e.target.value })}
              placeholder="#0F0D33"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["x", "Left %", block.x],
                ["y", "Top %", block.y],
                ["width", "Width %", block.width],
              ] as const
            ).map(([key, label, value]) => (
              <label
                key={key}
                className="block text-[10px] uppercase tracking-wider"
                style={{ color: BUILDER.muted }}
              >
                {label}
                <input
                  type="number"
                  min={key === "width" ? 15 : 0}
                  max={100}
                  step={1}
                  className="mt-1 w-full rounded-lg px-1.5 py-1 text-xs tabular-nums"
                  style={{ border: `1px solid ${BUILDER.border}` }}
                  value={Math.round(value)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    const clamped =
                      key === "width"
                        ? Math.min(100, Math.max(15, n))
                        : Math.min(100, Math.max(0, n));
                    patchBlock(block.id, { [key]: clamped });
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
