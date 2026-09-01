import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/app/components/nav";
import { SAMPLE_OPPORTUNITIES } from "@/lib/data/sample-opportunities";
import { computeFreshness, freshnessUI } from "@/lib/verification";
import { FlagListing } from "@/app/components/flag-listing";

export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opp = SAMPLE_OPPORTUNITIES.find((o) => o.id === id);
  if (!opp) notFound();

  const freshness = computeFreshness(opp);
  const freshnessStyle = freshnessUI(freshness);

  const deadlineDate = opp.deadline ? new Date(opp.deadline) : null;
  const now = new Date();
  const daysLeft = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isUrgent = daysLeft !== null && daysLeft <= 14 && daysLeft > 0;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  const formattedAmount = opp.amount
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: opp.currency,
        maximumFractionDigits: 0,
      }).format(opp.amount)
    : null;

  const formattedAmountMax = opp.amount_max
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: opp.currency,
        maximumFractionDigits: 0,
      }).format(opp.amount_max)
    : null;

  return (
    <div className="min-h-screen bg-warm-ivory">
      <Nav />

      <div
        className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm"
        role="status"
      >
        <strong>Sample listing</strong> — not Opportunity OS. Demo data only. Live country profiles:{" "}
        <Link href="/opportunity/countries" className="font-semibold underline text-deep-green">
          Country Explorer
        </Link>
        .
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted mb-6">
          <Link href="/dashboard" className="hover:text-deep-green transition-colors">
            Opportunities
          </Link>
          <span>/</span>
          <span className="text-ink">{opp.title}</span>
        </div>

        {/* Type + Country */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-deep-green/10 text-deep-green">
            {opp.type}
          </span>
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-warm-ivory border border-border text-warm-brown">
            {opp.country}
          </span>
          {opp.diaspora_allowed && (
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gold/10 text-gold-dark">
              Diaspora eligible
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${freshnessStyle.bg} ${freshnessStyle.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${freshnessStyle.dot}`} />
            {freshnessStyle.shortLabel}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-display text-3xl font-bold text-ink mb-2 leading-tight">
          {opp.title}
        </h1>

        {/* Attribution metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted mb-4">
          <span>Source: <span className="text-ink font-medium">{opp.source_name}</span></span>
          {opp.attributed_ministry && (
            <span>Ministry: <span className="text-ink font-medium">{opp.attributed_ministry}</span></span>
          )}
          {opp.legal_basis && (
            <span>Legal basis: <span className="text-ink font-medium">{opp.legal_basis}</span></span>
          )}
          {opp.verification_source_url && (
            <a href={opp.verification_source_url} target="_blank" rel="noopener noreferrer"
               className="text-deep-green hover:underline font-medium">
              Verification source →
            </a>
          )}
        </div>

        {opp.attributed_official && (
          <div className="bg-warm-ivory border border-border rounded-xl px-3 py-2 mb-4 text-xs text-muted">
            Program associated with <span className="font-medium text-ink">{opp.attributed_official}</span>.
            Leadership changes flag this listing for reverification — they do not automatically close the program.
          </div>
        )}

        {/* Verification notice — shown prominently when stale, flagged, or unknown */}
        {freshnessStyle.showWarning && (
          <div className={`border rounded-xl px-4 py-3 mb-6 ${freshnessStyle.bg} border-current/20`}>
            <div className="flex items-start gap-2">
              <span className="text-sm mt-0.5">⚠</span>
              <div>
                <p className={`text-xs font-semibold ${freshnessStyle.text} mb-0.5`}>
                  {freshness.kind === "flagged" ? "Program flagged for reverification" :
                   freshness.kind === "stale" ? "Listing may be outdated" :
                   freshness.kind === "removed" ? "Program closed" :
                   "Verification date unknown"}
                </p>
                <p className={`text-xs ${freshnessStyle.text} opacity-80`}>
                  {freshnessStyle.longLabel} Always verify directly with{" "}
                  <a href={opp.source_url} target="_blank" rel="noopener noreferrer" className="underline">
                    {opp.source_name}
                  </a>{" "}
                  before applying.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {formattedAmount && (
            <div className="bg-white border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Amount</p>
              <p className="font-bold text-gold-dark">
                {formattedAmountMax ? `${formattedAmount} – ${formattedAmountMax}` : formattedAmount}
              </p>
            </div>
          )}
          {deadlineDate && (
            <div className="bg-white border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Deadline</p>
              <p className={`font-bold text-sm ${isUrgent ? "text-red-earth" : isExpired ? "text-muted line-through" : "text-ink"}`}>
                {isExpired ? "Expired" : isUrgent ? `${daysLeft} days left` : deadlineDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}
          {(opp.eligibility_age_min || opp.eligibility_age_max) && (
            <div className="bg-white border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Age</p>
              <p className="font-bold text-sm text-ink">
                {opp.eligibility_age_min && opp.eligibility_age_max
                  ? `${opp.eligibility_age_min}–${opp.eligibility_age_max}`
                  : opp.eligibility_age_min
                  ? `${opp.eligibility_age_min}+`
                  : `Under ${opp.eligibility_age_max}`}
              </p>
            </div>
          )}
          {opp.eligibility_gender && opp.eligibility_gender !== "All" && (
            <div className="bg-white border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Gender</p>
              <p className="font-bold text-sm text-ink">{opp.eligibility_gender}</p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-white border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-ink mb-3">About this opportunity</h2>
          <p className="text-sm text-muted leading-relaxed">{opp.description || opp.summary}</p>
          {opp.notes && (
            <p className="text-xs text-muted/70 mt-3 italic">{opp.notes}</p>
          )}
        </div>

        {/* Eligibility */}
        {opp.eligibility_citizenship && opp.eligibility_citizenship.length > 0 && (
          <div className="bg-white border border-border rounded-2xl p-6 mb-6">
            <h2 className="font-display text-lg font-bold text-ink mb-4">Eligibility</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Citizenship</p>
                <p className="text-sm text-ink">{opp.eligibility_citizenship.join(", ")}</p>
              </div>
              {opp.eligibility_residence && (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Residence</p>
                  <p className="text-sm text-ink">{opp.eligibility_residence.join(", ")}</p>
                </div>
              )}
              {opp.business_stage_required && opp.business_stage_required.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Business stage</p>
                  <p className="text-sm text-ink">{opp.business_stage_required.join(", ")}</p>
                </div>
              )}
              {opp.sectors && opp.sectors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Sectors</p>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.sectors.map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-warm-ivory border border-border text-ink">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents */}
        {opp.documents_required && opp.documents_required.length > 0 && (
          <div className="bg-white border border-border rounded-2xl p-6 mb-6">
            <h2 className="font-display text-lg font-bold text-ink mb-4">Documents required</h2>
            <ul className="space-y-2">
              {opp.documents_required.map((doc, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink">
                  <span className="text-gold mt-0.5">•</span>
                  {doc}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Application steps */}
        {opp.application_steps && opp.application_steps.length > 0 && (
          <div className="bg-white border border-border rounded-2xl p-6 mb-6">
            <h2 className="font-display text-lg font-bold text-ink mb-4">How to apply</h2>
            <ol className="space-y-3">
              {opp.application_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-ink">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-deep-green text-ivory text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Tags */}
        {opp.tags && opp.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {opp.tags.map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-ivory border border-border text-muted">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-3 mb-4">
          <a
            href={opp.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-deep-green text-ivory font-bold py-4 rounded-xl hover:bg-mid-green transition-colors text-center"
          >
            Apply now →
          </a>
          <Link
            href="/assistant"
            className="flex-1 border border-deep-green text-deep-green font-bold py-4 rounded-xl hover:bg-deep-green hover:text-ivory transition-colors text-center"
          >
            Get AI coaching
          </Link>
        </div>

        {/* Crowdsourced correction — every listing, day one */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted">
          <span>Something look wrong?</span>
          <FlagListing opportunityId={opp.id} opportunityTitle={opp.title} />
        </div>
      </div>
    </div>
  );
}
