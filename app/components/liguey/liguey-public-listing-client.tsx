"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";
import { LanguageBar } from "@/app/components/language-bar";
import { useLocale } from "@/app/components/locale-context";
import { ligueyT, employmentTypeLabel, locationTypeLabel, type LigueyKey } from "@/lib/liguey/liguey-i18n";

type Listing = {
  id: string; businessId: string; publicId: string; title: string; description: string; requirements: string;
  employmentType: string; locationType: string; location: string; payLabel: string; photoUrl: string;
  employerName: string; employerAbout: string;
};

type CompanyReview = { rating: number; body: string; createdAt: string; reviewerLabel: string };
type MyReview = { id: string; rating: number; body: string; isAnonymous: boolean; status: "visible" | "removed" };

function stars(rating: number): string {
  return "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(rating);
}

const fieldStyle = { borderColor: KEBU.borders.default } as const;

export function LigueyPublicListingClient({ publicId }: { publicId: string }) {
  const { lang } = useLocale();
  const t = (key: LigueyKey) => ligueyT(lang, key);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [applied, setApplied] = useState(false);

  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [reviewAverage, setReviewAverage] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [myReview, setMyReview] = useState<MyReview | null>(null);
  const [eligibleApplicationId, setEligibleApplicationId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewAnonymous, setReviewAnonymous] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSaved, setReviewSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/public/liguey/listings/${encodeURIComponent(publicId)}`);
        const body = await res.json();
        if (!res.ok) { setNotFound(true); return; }
        setListing(body.listing);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [publicId]);

  useEffect(() => {
    if (!listing) return;
    void (async () => {
      try {
        const res = await fetch(`/api/public/liguey/businesses/${listing.businessId}/reviews`);
        const body = await res.json();
        if (res.ok) { setReviews(body.reviews ?? []); setReviewAverage(body.average); setReviewCount(body.count ?? 0); }
      } catch {
        // Public review list is supplementary — a failed fetch leaves the section empty, not the page broken.
      }
      try {
        const mine = await fetch(`/api/liguey/businesses/${listing.businessId}/reviews`);
        if (mine.ok) {
          const body = await mine.json();
          setEligibleApplicationId(body.eligibleApplicationId ?? null);
          if (body.myReview) {
            setMyReview(body.myReview);
            setReviewRating(body.myReview.rating);
            setReviewBody(body.myReview.body);
            setReviewAnonymous(body.myReview.isAnonymous);
          }
        }
      } catch {
        // Signed-out visitors get 401 here — no review form, which is correct.
      }
    })();
  }, [listing?.businessId, listing]);

  async function submitReview() {
    if (!listing || !eligibleApplicationId) return;
    setReviewBusy(true);
    setReviewError(null);
    setReviewSaved(false);
    try {
      const res = await fetch(`/api/liguey/businesses/${listing.businessId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: eligibleApplicationId, rating: reviewRating, body: reviewBody, isAnonymous: reviewAnonymous }),
      });
      const body = await res.json();
      if (!res.ok) { setReviewError(body.error ?? "Could not save your review."); return; }
      setMyReview(body.review);
      setReviewSaved(true);
    } catch {
      setReviewError("Could not save your review. Retry when connected.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function removeReview() {
    if (!listing) return;
    setReviewBusy(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/liguey/businesses/${listing.businessId}/reviews`, { method: "DELETE" });
      if (!res.ok) { const body = await res.json().catch(() => ({})); setReviewError(body.error ?? "Could not remove your review."); return; }
      setMyReview((prev) => (prev ? { ...prev, status: "removed" } : prev));
    } catch {
      setReviewError("Could not remove your review. Retry when connected.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function handleApply() {
    if (!listing) return;
    setSubmitting(true);
    setApplyError(null);
    setNeedsSignIn(false);
    try {
      const res = await fetch("/api/liguey/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, businessId: listing.businessId, coverNote }),
      });
      if (res.status === 401) { setNeedsSignIn(true); return; }
      const body = await res.json();
      if (!res.ok) { setApplyError(body.error ?? "Could not submit your application."); return; }
      setApplied(true);
    } catch {
      setApplyError("Could not submit your application. Retry when connected.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-[680px] px-4 py-10 text-[11px]" style={{ color: KEBU.muted }}>{t("public_loading")}</div>;
  if (notFound || !listing) {
    return (
      <div className="mx-auto max-w-[680px] px-4 py-10 text-center">
        <p className="text-[13px] font-black">{t("public_not_found")}</p>
        <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>{t("public_not_found_hint")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[680px] px-4 py-4 sm:px-6">
      <div className="flex justify-end"><LanguageBar variant="builder" /></div>
      {listing.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.photoUrl} alt="" className="mt-3 h-40 w-full rounded-[14px] object-cover" />
      ) : null}
      <p className="mt-2 text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">{listing.employerName}</p>
      <h1 className="mt-1 text-[26px] tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>{listing.title}</h1>
      <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>
        {employmentTypeLabel(listing.employmentType, lang)} · {locationTypeLabel(listing.locationType, lang)}{listing.location ? ` · ${listing.location}` : ""}{listing.payLabel ? ` · ${listing.payLabel}` : ""}
      </p>
      {reviewCount > 0 ? (
        <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>{stars(Math.round(reviewAverage ?? 0))} {reviewAverage?.toFixed(1)} ({reviewCount})</p>
      ) : null}

      {listing.description ? <p className="mt-6 whitespace-pre-wrap text-[12px] leading-relaxed">{listing.description}</p> : null}
      {listing.requirements ? (
        <div className="mt-4">
          <p className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>{t("public_requirements_label")}</p>
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed">{listing.requirements}</p>
        </div>
      ) : null}
      {listing.employerAbout ? (
        <div className="mt-4">
          <p className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>{t("public_about_title")}</p>
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed">{listing.employerAbout}</p>
        </div>
      ) : null}

      <section className="mt-8 border-t pt-6" style={fieldStyle}>
        <p className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>{t("public_reviews_title")}</p>
        {reviews.length === 0 ? (
          <p className="mt-2 text-[10px]" style={{ color: KEBU.faint }}>{t("public_reviews_empty")}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {reviews.map((review, index) => (
              <div key={index} className="rounded-[10px] border p-2" style={fieldStyle}>
                <p className="text-[10px] font-black" style={{ color: KEBU.orange }}>{stars(review.rating)}</p>
                {review.body ? <p className="mt-1 text-[11px] leading-relaxed">{review.body}</p> : null}
                <p className="mt-1 text-[8px]" style={{ color: KEBU.faint }}>{review.reviewerLabel}</p>
              </div>
            ))}
          </div>
        )}

        {eligibleApplicationId ? (
          <div className="mt-4 border-t pt-4" style={fieldStyle}>
            <p className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>{t("public_review_title")}</p>
            {reviewError ? <p className="mt-1 text-[9px]" style={{ color: "#B00020" }}>{reviewError}</p> : null}
            {myReview?.status === "removed" ? <p className="mt-1 text-[9px]" style={{ color: KEBU.faint }}>{t("public_review_removed")}</p> : null}
            <div className="mt-2 flex items-center gap-2">
              <label htmlFor="liguey-review-rating" className="text-[9px]" style={{ color: KEBU.muted }}>{t("public_review_rating_label")}</label>
              <select id="liguey-review-rating" value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="rounded-[8px] border px-2 py-1 text-[11px]" style={fieldStyle}>
                {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <textarea value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} rows={3} maxLength={2000}
              placeholder={t("public_review_body_placeholder")}
              className="mt-2 w-full rounded-[10px] border px-3 py-2 text-[12px]" style={fieldStyle} />
            <label className="mt-2 flex items-center gap-2 text-[9px]" style={{ color: KEBU.muted }}>
              <input type="checkbox" checked={reviewAnonymous} onChange={(e) => setReviewAnonymous(e.target.checked)} />
              {t("public_review_anonymous_label")}
            </label>
            <div className="mt-2 flex items-center gap-3">
              <button type="button" disabled={reviewBusy} onClick={() => void submitReview()} className="rounded-full bg-black px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-50">
                {reviewBusy ? t("public_review_submitting") : myReview && myReview.status === "visible" ? t("public_review_update") : t("public_review_submit")}
              </button>
              {myReview && myReview.status === "visible" ? (
                <button type="button" disabled={reviewBusy} onClick={() => void removeReview()} className="text-[9px] font-black uppercase" style={{ color: "#B00020" }}>{t("public_review_remove")}</button>
              ) : null}
              {reviewSaved ? <span className="text-[9px]" style={{ color: KEBU.orange }}>{t("public_review_saved")}</span> : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-8 border-t pt-6" style={fieldStyle}>
        {applied ? (
          <p className="text-[12px] font-black" style={{ color: KEBU.orange }}>{t("public_applied")}</p>
        ) : needsSignIn ? (
          <div>
            <p className="text-[11px]" style={{ color: KEBU.muted }}>{t("public_sign_in_prompt")}</p>
            <Link href={`/login?next=/j/${encodeURIComponent(listing.publicId)}`} className="mt-2 inline-flex rounded-full bg-black px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white">{t("public_sign_in_cta")}</Link>
          </div>
        ) : (
          <div>
            {applyError ? <div className="mb-3 rounded-[10px] border px-3 py-2 text-[10px]" style={{ borderColor: "#FFB3B3", color: "#B00020", background: "#FFF3F3" }}>{applyError}</div> : null}
            <textarea value={coverNote} onChange={(e) => setCoverNote(e.target.value)} rows={4} maxLength={4000}
              placeholder={t("public_cover_note_placeholder")}
              className="w-full rounded-[10px] border px-3 py-2 text-[12px]" style={fieldStyle} />
            <button type="button" disabled={submitting} onClick={handleApply} className="mt-3 rounded-full bg-black px-5 py-2 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-50">
              {submitting ? t("public_applying") : t("public_apply")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
