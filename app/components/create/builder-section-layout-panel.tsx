"use client";

import {
  GalaxyFieldLabel,
  GalaxySegmentedControl,
} from "@/app/components/galaxy/editor-primitives";

type MotionSettings = {
  preset?: string;
  durationMs?: number;
  delayMs?: number;
};

const SPACING_OPTIONS = [
  { value: "tight", label: "Tight" },
  { value: "normal", label: "Normal" },
  { value: "spacious", label: "Airy" },
  { value: "open", label: "Open" },
] as const;

const NUMBER_FIELDS = [
  { key: "minHeightPx", label: "Minimum height", min: 0, max: 4000, fallback: 0 },
  { key: "maxWidthPx", label: "Content width", min: 320, max: 2400, fallback: 1200 },
  { key: "marginTopPx", label: "Top margin", min: -400, max: 800, fallback: 0 },
  { key: "marginBottomPx", label: "Bottom margin", min: -400, max: 800, fallback: 0 },
] as const;

const INPUT_CLASS =
  "mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs font-semibold text-black outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/15";

function clampNumber(value: number, min: number, max: number, fallback: number) {
  const resolved = Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, resolved));
}

export function BuilderSectionLayoutPanel({
  props,
  onPatch,
}: {
  props: Record<string, unknown>;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const motion = (
    props.builderMotion && typeof props.builderMotion === "object" ? props.builderMotion : {}
  ) as MotionSettings;

  const setMotion = (patch: Partial<MotionSettings>) =>
    onPatch({
      builderMotion: {
        preset: motion.preset ?? "none",
        durationMs: motion.durationMs ?? 500,
        delayMs: motion.delayMs ?? 0,
        trigger: "scroll",
        ...patch,
      },
    });

  return (
    <div className="space-y-5">
      <GalaxySegmentedControl
        label="Vertical spacing"
        value={String(props.sectionPaddingY ?? "normal") as (typeof SPACING_OPTIONS)[number]["value"]}
        options={SPACING_OPTIONS}
        onChange={(sectionPaddingY) => onPatch({ sectionPaddingY })}
      />

      <div className="grid grid-cols-2 gap-2.5">
        {NUMBER_FIELDS.map(({ key, label, min, max, fallback }) => (
          <GalaxyFieldLabel key={key} label={label}>
            <input
              type="number"
              min={min}
              max={max}
              className={INPUT_CLASS}
              value={Number(props[key] ?? fallback)}
              onChange={(event) =>
                onPatch({
                  [key]: clampNumber(Number(event.target.value), min, max, fallback),
                })
              }
            />
          </GalaxyFieldLabel>
        ))}
      </div>

      <GalaxyFieldLabel label="Overflow">
        <select
          className={INPUT_CLASS}
          value={String(props.overflow ?? "visible")}
          onChange={(event) => onPatch({ overflow: event.target.value })}
        >
          <option value="visible">Visible outside section</option>
          <option value="hidden">Hide outside section</option>
          <option value="clip">Clip without scrolling</option>
        </select>
      </GalaxyFieldLabel>

      <section className="space-y-3 border-t border-black/[0.07] pt-4" aria-labelledby="section-motion-title">
        <div>
          <p id="section-motion-title" className="text-[10px] font-black uppercase tracking-[0.1em] text-[#FF6A00]">
            Motion
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-black/45">
            Applied when this section enters the visitor&apos;s screen.
          </p>
        </div>
        <GalaxyFieldLabel label="Entrance">
          <select
            className={INPUT_CLASS}
            value={motion.preset ?? "none"}
            onChange={(event) => setMotion({ preset: event.target.value })}
          >
            <option value="none">None</option>
            <option value="fade">Fade</option>
            <option value="fade-up">Fade upward</option>
            <option value="slide-left">Slide from right</option>
            <option value="slide-right">Slide from left</option>
            <option value="scale">Soft scale</option>
          </select>
        </GalaxyFieldLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <GalaxyFieldLabel label="Duration (ms)">
            <input
              type="number"
              min="100"
              max="3000"
              step="50"
              className={INPUT_CLASS}
              value={motion.durationMs ?? 500}
              onChange={(event) =>
                setMotion({ durationMs: clampNumber(Number(event.target.value), 100, 3000, 500) })
              }
            />
          </GalaxyFieldLabel>
          <GalaxyFieldLabel label="Delay (ms)">
            <input
              type="number"
              min="0"
              max="3000"
              step="50"
              className={INPUT_CLASS}
              value={motion.delayMs ?? 0}
              onChange={(event) =>
                setMotion({ delayMs: clampNumber(Number(event.target.value), 0, 3000, 0) })
              }
            />
          </GalaxyFieldLabel>
        </div>
      </section>

      <label className="flex min-h-10 cursor-pointer items-center justify-between rounded-[10px] bg-[#F6F6F4] px-3 text-[11px] font-bold text-black/70">
        Hide this section
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#FF6A00]"
          checked={Boolean(props.hidden)}
          onChange={(event) => onPatch({ hidden: event.target.checked })}
        />
      </label>
    </div>
  );
}
