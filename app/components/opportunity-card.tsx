import Link from "next/link";
import { Opportunity, OpportunityWithMatch } from "@/lib/types";
import { ScoreBreakdown, getScoreColor } from "@/lib/scoring";
import { computeFreshness, freshnessUI, type VerificationInput } from "@/lib/verification";
import { FlagListing } from "@/app/components/flag-listing";
import { KEBU } from "@/lib/kebu-brand";

function VerifiedBadge({ opp }: { opp: VerificationInput }) {
  const state = computeFreshness(opp);
  const ui = freshnessUI(state);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${ui.bg} ${ui.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ui.dot}`} />
      {ui.shortLabel}
    </span>
  );
}

const TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  Grant: { bg: "rgba(16,185,129,0.1)", color: "#059669" },
  Loan: { bg: "rgba(37,99,235,0.1)", color: "#1D4ED8" },
  Accelerator: { bg: "rgba(225,6,0,0.1)", color: KEBU.red },
  Fellowship: { bg: "rgba(92,83,72,0.1)", color: KEBU.muted },
  Investment: { bg: "rgba(245,158,11,0.1)", color: "#B45309" },
  "Government contract": { bg: "rgba(16,185,129,0.1)", color: "#059669" },
  Tender: { bg: "rgba(37,99,235,0.1)", color: "#1D4ED8" },
  Procurement: { bg: "rgba(37,99,235,0.1)", color: "#1D4ED8" },
  Training: { bg: "rgba(92,83,72,0.1)", color: KEBU.muted },
};

function TypePill({ type }: { type: string }) {
  const style = TYPE_STYLES[type] ?? { bg: "rgba(10,10,10,0.06)", color: KEBU.muted };
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
      style={{ background: style.bg, color: style.color }}
    >
      {type}
    </span>
  );
}

interface ScoreMeterProps {
  score: ScoreBreakdown;
}

function ScoreMeter({ score }: ScoreMeterProps) {
  const colors = getScoreColor(score.score);
  return (
    <div className={`rounded-xl border px-3 py-2.5 mb-4 ${colors.border} ${colors.bg}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
          {score.label}
        </span>
        <span className={`text-sm font-bold ${colors.text}`}>{score.score}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(10,10,10,0.08)" }}>
        <div
          className={`h-full rounded-full transition-all ${colors.bar}`}
          style={{ width: `${score.score}%` }}
        />
      </div>
      {score.reasons.length > 0 && (
        <p className={`text-[10px] mt-1.5 leading-snug ${colors.text} opacity-80`}>
          {score.reasons[0]}
          {score.reasons.length > 1 && ` · ${score.reasons[1]}`}
        </p>
      )}
      {score.concerns.length > 0 && (
        <p className="text-[10px] mt-0.5 leading-snug" style={{ color: KEBU.red }}>
          ⚠ {score.concerns[0]}
        </p>
      )}
    </div>
  );
}

interface OpportunityCardProps {
  opportunity: OpportunityWithMatch;
  showMatch?: boolean;
  score?: ScoreBreakdown;
  onTrack?: (opp: Opportunity) => void;
}

export function OpportunityCard({ opportunity, showMatch = false, score, onTrack }: OpportunityCardProps) {
  const deadlineDate = opportunity.deadline ? new Date(opportunity.deadline) : null;
  const now = new Date();
  const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isUrgent = daysLeft !== null && daysLeft <= 14 && daysLeft > 0;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  const formattedAmount = opportunity.amount
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: opportunity.currency,
        maximumFractionDigits: 0,
        notation: opportunity.amount >= 1000000 ? "compact" : "standard",
      }).format(opportunity.amount)
    : null;

  return (
    <div
      className="flex flex-col rounded-2xl p-5"
      style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          <TypePill type={opportunity.type} />
          <span
            className="text-[10px] font-medium px-2.5 py-0.5 rounded-full"
            style={{ background: KEBU.cream, color: KEBU.muted }}
          >
            {opportunity.country}
          </span>
          {opportunity.diaspora_allowed && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: "rgba(245,158,11,0.1)", color: "#B45309" }}
            >
              Diaspora ✓
            </span>
          )}
        </div>
        <VerifiedBadge opp={opportunity} />
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold mb-2 leading-snug" style={{ color: KEBU.black }}>
        {opportunity.title}
      </h3>

      {/* Summary */}
      <p className="text-sm leading-relaxed mb-4 line-clamp-2 flex-1" style={{ color: KEBU.muted }}>
        {opportunity.summary}
      </p>

      {/* Score meter */}
      {score && <ScoreMeter score={score} />}

      {/* Match info */}
      {showMatch && !score && opportunity.why_qualifies && (
        <div
          className="rounded-xl p-3 mb-4"
          style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: "#059669" }}>Why you qualify</p>
          <p className="text-xs leading-relaxed" style={{ color: "#065F46" }}>{opportunity.why_qualifies}</p>
          {opportunity.why_may_not_qualify && (
            <>
              <p className="text-xs font-semibold mt-2 mb-1" style={{ color: KEBU.red }}>Potential concern</p>
              <p className="text-xs leading-relaxed" style={{ color: KEBU.red }}>{opportunity.why_may_not_qualify}</p>
            </>
          )}
        </div>
      )}

      {/* Bottom row */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: `1px solid ${KEBU.border}` }}
      >
        <div className="flex items-center gap-4">
          {formattedAmount && (
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: KEBU.faint }}>Amount</p>
              <p className="text-sm font-bold" style={{ color: "#B45309" }}>{formattedAmount}</p>
            </div>
          )}
          {opportunity.deadline && !isExpired && (
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: KEBU.faint }}>Deadline</p>
              <p
                className="text-sm font-medium"
                style={{ color: isUrgent ? KEBU.red : KEBU.black, fontWeight: isUrgent ? 700 : 500 }}
              >
                {isUrgent
                  ? `${daysLeft}d left`
                  : new Date(opportunity.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onTrack && (
            <button
              onClick={() => onTrack(opportunity)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{ border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
            >
              + Track
            </button>
          )}
          <div className="flex items-center gap-3">
            <FlagListing opportunityId={opportunity.id} opportunityTitle={opportunity.title} />
            <Link
              href={`/opportunity/${opportunity.id}`}
              className="text-xs font-semibold"
              style={{ color: KEBU.orange }}
            >
              View →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
