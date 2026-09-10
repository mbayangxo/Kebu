"use client";

import { BUILDER } from "@/lib/create/builder-ui";
import type { EmailPopupProps } from "@/app/components/create/site-email-popup";

type PopupSection = {
  id: string;
  props: Record<string, unknown>;
};

/**
 * Site-wide email / consent popup — rail tool (not buried only in section list).
 */
export function BuilderPopupPanel({
  section,
  onEnsure,
  onPatch,
  ensuring,
}: {
  section: PopupSection | null;
  onEnsure: () => void | Promise<void>;
  onPatch: (patch: Record<string, unknown>) => void;
  ensuring?: boolean;
}) {
  if (!section) {
    return (
      <div className="space-y-3 rounded-2xl p-4" style={{ background: BUILDER.surfaceMuted, border: `1px solid ${BUILDER.border}` }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.orange }}>
          Popup
        </p>
        <p className="text-xs leading-relaxed" style={{ color: BUILDER.muted }}>
          Add an email signup or consent overlay that appears on the live site. Visitors dismiss it in their browser —
          emails go to your subscriber list.
        </p>
        <button
          type="button"
          disabled={ensuring}
          onClick={() => void onEnsure()}
          className="w-full rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: BUILDER.ink }}
        >
          {ensuring ? "Adding…" : "+ Add popup to this site"}
        </button>
      </div>
    );
  }

  const p = section.props as EmailPopupProps;

  return (
    <div className="space-y-3 rounded-2xl p-4" style={{ background: BUILDER.surfaceMuted, border: `1px solid ${BUILDER.border}` }}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.orange }}>
          Popup
        </p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: BUILDER.muted }}>
          Overlay on the published site. Save draft, then publish so visitors see it.
        </p>
      </div>

      <label className="flex items-center gap-2 text-[11px] font-semibold">
        <input
          type="checkbox"
          checked={p.enabled !== false}
          onChange={(e) => onPatch({ enabled: e.target.checked })}
        />
        Show popup on live site
      </label>

      <label className="block text-[10px] uppercase tracking-wider">
        Mode
        <select
          className="mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
          style={{ border: `1px solid ${BUILDER.border}` }}
          value={String(p.mode ?? "both")}
          onChange={(e) => onPatch({ mode: e.target.value })}
        >
          <option value="both">Email + consent</option>
          <option value="email">Email only</option>
          <option value="consent">Consent only</option>
        </select>
      </label>

      <input
        className="w-full rounded-lg px-2 py-1.5 text-sm"
        style={{ border: `1px solid ${BUILDER.border}` }}
        value={String(p.heading ?? "")}
        onChange={(e) => onPatch({ heading: e.target.value })}
        placeholder="Heading"
        aria-label="Popup heading"
      />
      <textarea
        className="min-h-[72px] w-full rounded-lg px-2 py-1.5 text-sm"
        style={{ border: `1px solid ${BUILDER.border}` }}
        value={String(p.body ?? "")}
        onChange={(e) => onPatch({ body: e.target.value })}
        placeholder="Body"
        aria-label="Popup body"
      />
      <input
        className="w-full rounded-lg px-2 py-1.5 text-sm"
        style={{ border: `1px solid ${BUILDER.border}` }}
        value={String(p.buttonLabel ?? "")}
        onChange={(e) => onPatch({ buttonLabel: e.target.value })}
        placeholder="Button label"
        aria-label="Popup button"
      />
      <input
        className="w-full rounded-lg px-2 py-1.5 text-sm"
        style={{ border: `1px solid ${BUILDER.border}` }}
        value={String(p.consentLabel ?? "")}
        onChange={(e) => onPatch({ consentLabel: e.target.value })}
        placeholder="Consent checkbox text"
        aria-label="Consent label"
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[10px] uppercase tracking-wider">
          Delay (sec)
          <input
            type="number"
            min={0}
            max={60}
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
            style={{ border: `1px solid ${BUILDER.border}` }}
            value={Number(p.delaySeconds ?? 4)}
            onChange={(e) => onPatch({ delaySeconds: Number(e.target.value) })}
          />
        </label>
        <label className="block text-[10px] uppercase tracking-wider">
          Remind (days)
          <input
            type="number"
            min={0}
            max={365}
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
            style={{ border: `1px solid ${BUILDER.border}` }}
            value={Number(p.remindAfterDays ?? 14)}
            onChange={(e) => onPatch({ remindAfterDays: Number(e.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}
