import { KEBU } from "@/lib/kebu-brand";
import { OPPORTUNITY_TRUST_LABELS, UNVERIFIED_EXAMPLE_BADGE_STYLE } from "@/lib/opportunity/trust-labels";

/**
 * Renders a visually distinct warning badge for unverified_example content,
 * and a quiet neutral tag for everything else (curated, ai_generated, etc.).
 * The two must never look the same — that distinction is the whole point
 * of this component existing instead of inlining a span per page.
 */
export function TrustLabelBadge({ trustLabel }: { trustLabel: string }) {
  if (trustLabel === "unverified_example") {
    return (
      <span
        className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
        style={UNVERIFIED_EXAMPLE_BADGE_STYLE}
        title={OPPORTUNITY_TRUST_LABELS.unverified_exampleDetail}
      >
        {OPPORTUNITY_TRUST_LABELS.unverified_example}
      </span>
    );
  }
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
      style={{ background: `${KEBU.muted}14`, color: KEBU.muted }}
    >
      {OPPORTUNITY_TRUST_LABELS.curated}
    </span>
  );
}
