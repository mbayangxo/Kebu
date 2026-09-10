"use client";

import type { TemplateCardLayout, TemplateCardVisual } from "@/lib/create/template-visuals";

/**
 * Distinct gallery chrome per aesthetic layout — not one gradient + wordmark for every look.
 */
export function AestheticCardVisual({
  visual,
  name,
  accent,
}: {
  visual: TemplateCardVisual;
  name: string;
  accent: string;
}) {
  const layout: TemplateCardLayout = visual.layout ?? "generic";
  const mark = visual.wordmark ?? name;
  const gradient =
    visual.previewGradient ?? `linear-gradient(160deg, ${accent}55 0%, #0a0a0a 100%)`;

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: gradient }} />

      {visual.previewImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={visual.previewImage}
          alt=""
          className={`absolute object-cover ${
            layout === "wix-collage" || layout === "dark-artist"
              ? "bottom-[18%] right-[8%] h-[48%] w-[38%] rotate-[-12deg] shadow-2xl ring-2 ring-white/70"
              : layout === "russian-cutouts"
                ? "inset-0 h-full w-full opacity-90"
                : "inset-0 h-full w-full opacity-40"
          }`}
        />
      ) : null}

      {visual.previewImageSecondary ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={visual.previewImageSecondary}
          alt=""
          className="absolute bottom-[8%] right-[6%] z-10 w-[42%] rotate-6 object-cover shadow-2xl ring-2 ring-white/80"
        />
      ) : null}

      {layout === "wix-collage" ? (
        <>
          <div className="absolute inset-x-[8%] top-[12%] z-10 flex flex-wrap justify-center gap-1">
            {["HOME", "ARTISTS", "CONTACT"].map((label) => (
              <span
                key={label}
                className="rounded-full px-2 py-0.5 text-[6px] font-bold tracking-wider text-black"
                style={{ background: "#FFF86B" }}
              >
                {label}
              </span>
            ))}
          </div>
          <p
            className="absolute inset-x-0 top-[32%] z-10 text-center text-[22px] font-medium leading-none text-white"
            style={{ fontFamily: "Oswald, Impact, sans-serif" }}
          >
            K
            <span className="mt-0.5 block text-[11px] tracking-[0.28em]">DIRECTION</span>
          </p>
        </>
      ) : null}

      {layout === "russian-cutouts" ? (
        <div
          className="absolute left-[8%] top-[12%] z-10 max-w-[70%] text-[11px] font-semibold uppercase leading-none tracking-tight text-white drop-shadow"
          style={{ fontFamily: "var(--font-jost), system-ui, sans-serif" }}
        >
          May Lècor
          <span className="mt-1 block text-[8px] font-medium tracking-[0.15em] text-[#ffd6ec]">
            Circle seal · cutouts
          </span>
        </div>
      ) : null}

      {layout === "salon" ? (
        <div className="absolute inset-x-[10%] top-[18%] z-10 text-center">
          <div className="mx-auto mb-2 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-8 w-6 rounded-full bg-black/15" />
            ))}
          </div>
          <p className="text-[8px] tracking-[0.3em] text-black/65">BOOK · CUT · STYLE</p>
          <p className="mt-1.5 font-serif text-[17px] text-black">{mark}</p>
        </div>
      ) : null}

      {layout === "store" ? (
        <div className="absolute inset-x-[10%] top-[14%] z-10">
          <p className="mb-1.5 text-[8px] font-black tracking-[0.2em] text-white/90">{mark}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-square rounded-sm bg-white/85 shadow-sm">
                <div className="m-1 h-1.5 w-1/2 rounded-full bg-black/15" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {layout === "restaurant" ? (
        <div className="absolute inset-x-[12%] top-[20%] z-10 border border-white/45 bg-black/25 px-3 py-4 text-center text-white backdrop-blur-[2px]">
          <p className="text-[7px] tracking-[0.4em]">TONIGHT · MENU</p>
          <p className="mt-1 font-serif text-[16px]">{mark}</p>
          <div className="mx-auto mt-3 space-y-1">
            <div className="h-0.5 w-full bg-white/35" />
            <div className="h-0.5 w-3/4 mx-auto bg-white/25" />
          </div>
        </div>
      ) : null}

      {layout === "fashion" ? (
        <>
          <div className="absolute inset-y-[12%] left-[10%] z-10 w-[2px] bg-white/50" />
          <p
            className="absolute inset-x-0 top-[30%] z-10 text-center text-[12px] tracking-[0.45em] text-white"
            style={{ fontFamily: "Times New Roman, serif" }}
          >
            {mark}
          </p>
          <p className="absolute inset-x-0 bottom-[18%] z-10 text-center text-[7px] tracking-[0.35em] text-white/70">
            LOOKBOOK · SS
          </p>
        </>
      ) : null}

      {layout === "film" ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
          <span className="rounded-full border-2 border-white/85 px-3 py-3 text-[8px] font-black tracking-widest text-white">
            PLAY
          </span>
          <p className="text-[9px] font-black tracking-[0.25em] text-white/90">{mark}</p>
        </div>
      ) : null}

      {layout === "tech" ? (
        <div className="absolute inset-x-[16%] top-[14%] z-10 rounded-[18px] border border-white/25 bg-black/40 px-2.5 py-3 shadow-xl backdrop-blur-sm">
          <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-white/30" />
          <p className="text-[9px] font-black tracking-wider text-white">{mark}</p>
          <div className="mt-2 space-y-1.5">
            <div className="h-8 rounded-md bg-white/15" />
            <div className="h-8 rounded-md bg-white/10" />
            <div className="h-6 rounded-full bg-white/80" />
          </div>
        </div>
      ) : null}

      {layout === "event" ? (
        <div className="absolute inset-x-[8%] top-[16%] z-10 overflow-hidden rounded-md border border-white/30 bg-black/50 text-white">
          <div className="bg-white px-2 py-1 text-center text-[7px] font-black tracking-[0.3em] text-black">
            THIS WEEK
          </div>
          <p className="px-2 py-3 text-center text-[18px] font-black leading-none">{mark}</p>
          <p className="pb-2 text-center text-[7px] tracking-widest text-white/70">DOORS · 21:00</p>
        </div>
      ) : null}

      {layout === "agency" ? (
        <div className="absolute inset-x-[8%] top-[14%] z-10">
          <p className="text-[10px] font-black uppercase tracking-tight text-white drop-shadow">{mark}</p>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-sm bg-white/20 ring-1 ring-white/30" />
            ))}
          </div>
          <p className="mt-2 text-[7px] font-bold tracking-[0.2em] text-white/75">WORK · BRIEF · HIRE</p>
        </div>
      ) : null}

      {layout === "portfolio" ? (
        <div className="absolute inset-x-[8%] top-[12%] z-10">
          <div className="flex items-end justify-between">
            <p className="text-[11px] font-black text-white">{mark}</p>
            <span className="text-[7px] tracking-widest text-white/60">SELECTED</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1">
            <div className="aspect-[4/5] rounded-sm bg-white/25" />
            <div className="space-y-1">
              <div className="aspect-square rounded-sm bg-white/20" />
              <div className="aspect-square rounded-sm bg-white/15" />
            </div>
          </div>
        </div>
      ) : null}

      {layout === "perfume" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-4 px-4">
          <div
            className="h-[58%] w-[18%] rounded-b-[40%] rounded-t-[8%] border border-white/40 bg-gradient-to-b from-white/30 to-white/5 shadow-lg"
            style={{ borderColor: `${accent}99` }}
          />
          <div className="max-w-[55%]">
            <p className="text-[7px] tracking-[0.35em] text-white/70">EAU DE PARFUM</p>
            <p
              className="mt-1 text-[14px] font-serif leading-tight text-white"
              style={{ fontFamily: "Times New Roman, serif" }}
            >
              {mark}
            </p>
          </div>
        </div>
      ) : null}

      {layout === "hotel" ? (
        <div className="absolute inset-x-[8%] top-[16%] z-10 text-white">
          <p className="text-[8px] tracking-[0.35em] text-white/70">ROOMS · STAY</p>
          <p className="mt-1 font-serif text-[16px]">{mark}</p>
          <div className="mt-3 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 flex-1 rounded-sm bg-white/25 ring-1 ring-white/30" />
            ))}
          </div>
        </div>
      ) : null}

      {layout === "farm" ? (
        <div className="absolute inset-x-[8%] top-[18%] z-10">
          <p className="text-[10px] font-black uppercase text-white drop-shadow">{mark}</p>
          <div className="mt-3 space-y-1.5">
            {["Harvest", "Order", "Visit"].map((row) => (
              <div
                key={row}
                className="flex items-center justify-between rounded-sm bg-white/85 px-2 py-1.5 text-[8px] font-bold text-black"
              >
                <span>{row}</span>
                <span className="text-black/40">→</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {layout === "build" ? (
        <div className="absolute inset-x-[8%] top-[14%] z-10">
          <div
            className="rounded-md border border-dashed border-white/50 bg-black/20 p-3"
            style={{ backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "12px 12px" }}
          >
            <p className="text-[10px] font-black uppercase tracking-wide text-white">{mark}</p>
            <p className="mt-2 text-[7px] tracking-[0.2em] text-white/70">PROJECTS · QUOTE</p>
          </div>
        </div>
      ) : null}

      {layout === "impact" ? (
        <div className="absolute inset-x-[8%] top-[18%] z-10 text-center text-white">
          <p className="text-[7px] font-bold tracking-[0.35em] text-white/75">MISSION</p>
          <p className="mt-2 text-[15px] font-black leading-tight">{mark}</p>
          <div className="mx-auto mt-3 flex max-w-[80%] justify-between gap-1">
            {["01", "02", "03"].map((n) => (
              <div key={n} className="flex-1 rounded-sm bg-white/20 py-2 text-[8px] font-black">
                {n}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {layout === "dark-artist" ? (
        <div className="absolute inset-0 z-10">
          <div className="absolute left-1/2 top-[20%] h-24 w-24 -translate-x-1/2 rounded-full bg-white/10 blur-2xl" />
          <p className="absolute left-[8%] top-[16%] text-[15px] font-black uppercase tracking-tight text-white drop-shadow">
            {mark}
          </p>
          <p className="absolute bottom-[16%] left-[8%] text-[7px] font-bold tracking-[0.3em] text-white/70">
            MUSIC · SHOWS · BOOK
          </p>
        </div>
      ) : null}

      {layout === "generic" ? (
        <p className="absolute inset-x-0 top-[28%] z-10 text-center text-[14px] font-black uppercase tracking-tight text-white drop-shadow">
          {mark}
        </p>
      ) : null}

      {layout === "music" ? (
        <div className="absolute inset-x-[10%] top-[20%] z-10 text-center text-white">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/60">
            <span className="text-[10px]">♪</span>
          </div>
          <p className="text-[13px] font-black tracking-wide">{mark}</p>
        </div>
      ) : null}
    </div>
  );
}
