"use client";

import { BUILDER } from "@/lib/create/builder-ui";
import { TEXT_FONT_OPTIONS, cssFontStack } from "@/lib/create/site-theme-fonts";
import { BUILDER_FONT_WEIGHT_OPTIONS } from "@/lib/create/builder-fonts";

export type FreeTextBlock = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: "sm" | "md" | "lg" | "xl" | "hero";
  fontSizePx?: number;
  align: "left" | "center" | "right";
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number;
  rotation?: number;
  opacity?: number;
  animation?: "none" | "fade" | "rise" | "slide-left" | "slide-right" | "pop" | "blur-in" | "float" | "bob" | "pulse" | "spin";
  animationDurationMs?: number;
  animationDelayMs?: number;
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
        fontSizePx: 20,
        align: "left",
        color: "",
        fontFamily: "",
        fontWeight: 700,
        letterSpacing: 0,
        lineHeight: 1.1,
        rotation: 0,
        opacity: 1,
        animation: "none",
        animationDurationMs: 650,
        animationDelayMs: 0,
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
        <div key={block.id} className="border-b border-black/[.07] py-3 last:border-b-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[9px] font-semibold text-black/35">Text {index + 1}</span>
            <button
              type="button"
              className="ml-auto rounded-md px-2 py-1 text-[9px] font-semibold text-red-700 hover:bg-red-50"
              onClick={() => onChange(blocks.filter((b) => b.id !== block.id))}
            >
              Remove
            </button>
          </div>

          <textarea
            className="min-h-[62px] w-full resize-y rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs leading-snug outline-none focus:border-[#FF6A00]"
            style={{ fontFamily: block.fontFamily ? cssFontStack(block.fontFamily) : themeDisplayFont ? cssFontStack(themeDisplayFont) : undefined }}
            value={block.text}
            onChange={(e) => patchBlock(block.id, { text: e.target.value })}
            placeholder="Type something…"
            aria-label={`Text for object ${index + 1}`}
          />

          <div className="mt-2 grid grid-cols-[1fr_76px] gap-2">
            <select
              className="min-h-9 rounded-lg border border-black/10 bg-white px-2.5 text-xs"
              value={block.fontFamily ?? ""}
              onChange={(e) => patchBlock(block.id, { fontFamily: e.target.value })}
              aria-label={`Font for text object ${index + 1}`}
            >
              <option value="">Site font{themeDisplayFont ? ` · ${themeDisplayFont}` : ""}</option>
              {TEXT_FONT_OPTIONS.filter((f) => f !== themeDisplayFont && f !== themeBodyFont).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <input
              type="number" min="6" max="240" step="1"
              className="min-h-9 rounded-lg border border-black/10 bg-white px-2 text-right text-xs"
              value={block.fontSizePx ?? ({ sm: 14, md: 16, lg: 20, xl: 28, hero: 40 }[block.fontSize] ?? 16)}
              onChange={(e) => patchBlock(block.id, { fontSizePx: Math.min(240, Math.max(6, Number(e.target.value) || 16)) })}
              aria-label="Font size"
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              className="min-h-9 rounded-lg border border-black/10 bg-white px-2.5 text-xs"
              value={String(block.fontWeight ?? 700)}
              onChange={(e) => patchBlock(block.id, { fontWeight: Number(e.target.value) })}
            >
              {BUILDER_FONT_WEIGHT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select
              className="min-h-9 rounded-lg border border-black/10 bg-white px-2.5 text-xs"
              value={block.align}
              onChange={(e) => patchBlock(block.id, { align: e.target.value as FreeTextBlock["align"] })}
            >
              {ALIGNS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-[9px] font-semibold text-black/45">
              Letter spacing
              <input type="number" min="-0.1" max="1" step="0.01" className="mt-1 min-h-9 w-full rounded-lg border border-black/10 px-2 text-xs" value={block.letterSpacing ?? 0} onChange={(e)=>patchBlock(block.id,{letterSpacing:Math.min(1,Math.max(-.1,Number(e.target.value)||0))})}/>
            </label>
            <label className="text-[9px] font-semibold text-black/45">
              Line height
              <input type="number" min=".7" max="3" step=".05" className="mt-1 min-h-9 w-full rounded-lg border border-black/10 px-2 text-xs" value={block.lineHeight ?? 1.1} onChange={(e)=>patchBlock(block.id,{lineHeight:Math.min(3,Math.max(.7,Number(e.target.value)||1.1))})}/>
            </label>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <label className="min-w-0 flex-1 text-[9px] font-semibold text-black/45">
              Color
              <div className="mt-1 flex items-center gap-2">
                <input type="color" className="h-9 w-10 rounded-lg border border-black/10 bg-white p-1" value={block.color || "#111111"} onChange={(e)=>patchBlock(block.id,{color:e.target.value})}/>
                <input className="min-h-9 min-w-0 flex-1 rounded-lg border border-black/10 px-2 text-xs" value={block.color ?? ""} onChange={(e)=>patchBlock(block.id,{color:e.target.value})} placeholder="Theme"/>
              </div>
            </label>
            <label className="w-[92px] text-[9px] font-semibold text-black/45">
              Opacity
              <input type="number" min="0" max="100" step="5" className="mt-1 min-h-9 w-full rounded-lg border border-black/10 px-2 text-xs" value={Math.round((block.opacity ?? 1)*100)} onChange={(e)=>patchBlock(block.id,{opacity:Math.min(1,Math.max(0,(Number(e.target.value)||0)/100))})}/>
            </label>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-[9px] font-semibold text-black/45">
              Rotation
              <input type="number" min="0" max="360" step="1" className="mt-1 min-h-9 w-full rounded-lg border border-black/10 px-2 text-xs" value={((block.rotation ?? 0)%360+360)%360} onChange={(e)=>patchBlock(block.id,{rotation:Math.min(360,Math.max(0,Number(e.target.value)||0))})}/>
            </label>
            <label className="text-[9px] font-semibold text-black/45">
              Animation
              <select className="mt-1 min-h-9 w-full rounded-lg border border-black/10 px-2 text-xs" value={block.animation ?? "none"} onChange={(e)=>patchBlock(block.id,{animation:e.target.value as FreeTextBlock["animation"]})}>
                <option value="none">None</option><option value="fade">Fade</option><option value="rise">Rise</option><option value="slide-left">Slide from right</option><option value="slide-right">Slide from left</option><option value="pop">Pop</option><option value="blur-in">Blur in</option><option value="float">Float</option><option value="bob">Bob</option><option value="pulse">Pulse</option><option value="spin">Spin</option>
              </select>
            </label>
          </div>

          {(block.animation ?? "none") !== "none" ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-[9px] font-semibold text-black/45">Duration ms<input type="number" min="100" max="20000" step="50" className="mt-1 min-h-9 w-full rounded-lg border border-black/10 px-2 text-xs" value={block.animationDurationMs ?? 650} onChange={(e)=>patchBlock(block.id,{animationDurationMs:Math.min(20000,Math.max(100,Number(e.target.value)||650))})}/></label>
              <label className="text-[9px] font-semibold text-black/45">Delay ms<input type="number" min="0" max="5000" step="50" className="mt-1 min-h-9 w-full rounded-lg border border-black/10 px-2 text-xs" value={block.animationDelayMs ?? 0} onChange={(e)=>patchBlock(block.id,{animationDelayMs:Math.min(5000,Math.max(0,Number(e.target.value)||0))})}/></label>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-3 gap-2">
            {([
              ["x", "X %", block.x],
              ["y", "Y %", block.y],
              ["width", "Width %", block.width],
            ] as const).map(([key,label,value]) => (
              <label key={key} className="text-[9px] font-semibold text-black/45">
                {label}
                <input type="number" min={key==="width"?5:0} max={100} step={1} className="mt-1 min-h-9 w-full rounded-lg border border-black/10 px-2 text-xs" value={Math.round(value)} onChange={(e)=>{const n=Number(e.target.value);if(!Number.isFinite(n))return;patchBlock(block.id,{[key]:key==="width"?Math.min(100,Math.max(5,n)):Math.min(100,Math.max(0,n))})}}/>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
