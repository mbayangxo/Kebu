import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/app/components/nav";
import { TrackListingButton } from "@/app/components/opportunity/track-listing-button";
import { computeFreshness, freshnessUI } from "@/lib/verification";
import { FlagListing } from "@/app/components/flag-listing";
import { createClient } from "@/lib/supabase/server";
import { getOpportunityListingById } from "@/lib/opportunity/listings";
import { KEBU } from "@/lib/kebu-brand";

export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { listing: opp, missingTable } = await getOpportunityListingById(supabase, id);

  if (missingTable || !opp) notFound();

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
    <div className="min-h-screen" style={{ background: KEBU.cream }}>
      <Nav />

      <div
        className="px-4 py-3 text-center text-sm"
        role="status"
        style={{ background: "rgba(16,185,129,0.08)", borderBottom: "1px solid rgba(16,185,129,0.2)" }}
      >
        <strong>Opportunity OS listing</strong> — stored in Kebu database. Verify deadline and eligibility at{" "}
        <a
          href={opp.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline"
          style={{ color: "#059669" }}
        >
          {opp.source_name}
        </a>
        . Browse all:{" "}
        <Link href="/opportunity/listings" className="font-semibold underline" style={{ color: "#059669" }}>
          Programs &amp; listings
        </Link>
        .
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs mb-6" style={{ color: KEBU.muted }}>
          <Link href="/opportunity" style={{ color: KEBU.muted }}>Opportunities</Link>
          <span>/</span>
          <span style={{ color: KEBU.black }}>{opp.title}</span>
        </div>

        {/* Type + Country */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: "rgba(16,185,129,0.1)", color: "#059669" }}
          >
            {opp.type}
          </span>
          <span
            className="text-xs font-medium px-2.5 py-0.5 rounded-full"
            style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
          >
            {opp.country}
          </span>
          {opp.diaspora_allowed && (
            <span
              className="text-xs font-medium px-2.5 py-0.5 rounded-full"
              style={{ background: "rgba(245,158,11,0.1)", color: "#B45309" }}
            >
              Diaspora eligible
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${freshnessStyle.bg} ${freshnessStyle.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${freshnessStyle.dot}`} />
            {freshnessStyle.shortLabel}
          </span>
        </div>

        {/* Title */}
        <h1
          className="text-3xl font-bold mb-2 leading-tight"
          style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
        >
          {opp.title}
        </h1>

        {/* Attribution metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mb-4" style={{ color: KEBU.muted }}>
          <span>Source: <span className="font-medium" style={{ color: KEBU.black }}>{opp.source_name}</span></span>
          {opp.attributed_ministry && (
            <span>Ministry: <span className="font-medium" style={{ color: KEBU.black }}>{opp.attributed_ministry}</span></span>
          )}
          {opp.legal_basis && (
            <span>Legal basis: <span className="font-medium" style={{ color: KEBU.black }}>{opp.legal_basis}</span></span>
          )}
          {opp.verification_source_url && (
            <a
              href={opp.verification_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
              style={{ color: "#059669" }}
            >
              Verification source →
            </a>
          )}
        </div>

        {opp.attributed_official && (
          <div
            className="rounded-xl px-3 py-2 mb-4 text-xs"
            style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
          >
            Program associated with{" "}
            <span className="font-medium" style={{ color: KEBU.black }}>{opp.attributed_official}</span>.{" "}
            Leadership changes flag this listing for reverification — they do not automatically close the program.
          </div>
        )}

        {/* Verification notice */}
        {freshnessStyle.showWarning && (
          <div
            className={`rounded-xl px-4 py-3 mb-6 ${freshnessStyle.bg}`}
            style={{ border: "1px solid currentColor" }}
          >
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
            <div className="rounded-xl p-4" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
              <p className="text-xs mb-1" style={{ color: KEBU.muted }}>Amount</p>
              <p className="font-bold" style={{ color: "#B45309" }}>
                {formattedAmountMax ? `${formattedAmount} – ${formattedAmountMax}` : formattedAmount}
              </p>
            </div>
          )}
          {deadlineDate && (
            <div className="rounded-xl p-4" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
              <p className="text-xs mb-1" style={{ color: KEBU.muted }}>Deadline</p>
              <p
                className="font-bold text-sm"
                style={{
                  color: isExpired ? KEBU.faint : isUrgent ? KEBU.red : KEBU.black,
                  textDecoration: isExpired ? "line-through" : "none",
                }}
              >
                {isExpired
                  ? "Expired"
                  : isUrgent
                  ? `${daysLeft} days left`
                  : deadlineDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          )}
          {(opp.eligibility_age_min || opp.eligibility_age_max) && (
            <div className="rounded-xl p-4" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
              <p className="text-xs mb-1" style={{ color: KEBU.muted }}>Age</p>
              <p className="font-bold text-sm" style={{ color: KEBU.black }}>
                {opp.eligibility_age_min && opp.eligibility_age_max
                  ? `${opp.eligibility_age_min}–${opp.eligibility_age_max}`
                  : opp.eligibility_age_min
                  ? `${opp.eligibility_age_min}+`
                  : `Under ${opp.eligibility_age_max}`}
              </p>
            </div>
          )}
          {opp.eligibility_gender && opp.eligibility_gender !== "All" && (
            <div className="rounded-xl p-4" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
              <p className="text-xs mb-1" style={{ color: KEBU.muted }}>Gender</p>
              <p className="font-bold text-sm" style={{ color: KEBU.black }}>{opp.eligibility_gender}</p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
          <h2
            className="text-lg font-bold mb-3"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
          >
            About this opportunity
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: KEBU.muted }}>
            {opp.description || opp.summary}
          </p>
          {opp.notes && (
            <p className="text-xs mt-3 italic" style={{ color: KEBU.faint }}>{opp.notes}</p>
          )}
        </div>

        {/* Eligibility */}
        {opp.eligibility_citizenship && opp.eligibility_citizenship.length > 0 && (
          <div className="rounded-2xl p-6 mb-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
            <h2
              className="text-lg font-bold mb-4"
              style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
            >
              Eligibility
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: KEBU.muted }}>Citizenship</p>
                <p className="text-sm" style={{ color: KEBU.black }}>{opp.eligibility_citizenship.join(", ")}</p>
              </div>
              {opp.eligibility_residence && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: KEBU.muted }}>Residence</p>
                  <p className="text-sm" style={{ color: KEBU.black }}>{opp.eligibility_residence.join(", ")}</p>
                </div>
              )}
              {opp.business_stage_required && opp.business_stage_required.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: KEBU.muted }}>Business stage</p>
                  <p className="text-sm" style={{ color: KEBU.black }}>{opp.business_stage_required.join(", ")}</p>
                </div>
              )}
              {opp.sectors && opp.sectors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: KEBU.muted }}>Sectors</p>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.sectors.map((s) => (
                      <span
                        key={s}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}`, color: KEBU.black }}
                      >
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
          <div className="rounded-2xl p-6 mb-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
            <h2
              className="text-lg font-bold mb-4"
              style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
            >
              Documents required
            </h2>
            <ul className="space-y-2">
              {opp.documents_required.map((doc, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: KEBU.black }}>
                  <span style={{ color: "#B45309" }}>•</span>
                  {doc}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Application steps */}
        {opp.application_steps && opp.application_steps.length > 0 && (
          <div className="rounded-2xl p-6 mb-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
            <h2
              className="text-lg font-bold mb-4"
              style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
            >
              How to apply
            </h2>
            <ol className="space-y-3">
              {opp.application_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm" style={{ color: KEBU.black }}>
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white"
                    style={{ background: "#059669" }}
                  >
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
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <a
            href={opp.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 font-bold py-4 rounded-xl text-center text-white"
            style={{ background: KEBU.black }}
          >
            Apply at official source →
          </a>
          <TrackListingButton opportunityId={opp.id} />
        </div>

        {/* Flag / correction */}
        <div className="flex items-center justify-center gap-2 text-xs" style={{ color: KEBU.muted }}>
          <span>Something look wrong?</span>
          <FlagListing opportunityId={opp.id} opportunityTitle={opp.title} />
        </div>
      </div>
    </div>
  );
}
