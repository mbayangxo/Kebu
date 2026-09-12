"use client";

import { useEffect, useState } from "react";

type Review = {
  id: string;
  rating: number;
  title: string;
  body: string;
  reviewerName: string;
  createdAt: string;
};

function FilledStar({ size, pct }: { size: number; pct: number }) {
  const id = `ks${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${pct}%`} stopColor="#FF5500" />
          <stop offset={`${pct}%`} stopColor="#E0DDD8" />
        </linearGradient>
      </defs>
      <path d="M8 1.2 9.8 5l4 .58-2.9 2.83.69 3.99L8 10.3l-3.59 2.1.69-3.99L2.2 5.58 6.2 5z" fill={`url(#${id})`} />
    </svg>
  );
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((s) => {
        const pct = Math.min(100, Math.max(0, (rating - (s - 1)) * 100));
        return <FilledStar key={s} size={size} pct={pct} />;
      })}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <span style={{ display: "inline-flex", gap: 3, cursor: "pointer" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width={24}
          height={24}
          viewBox="0 0 16 16"
          fill={active >= s ? "#FF5500" : "#E0DDD8"}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          style={{ transition: "fill 0.12s", cursor: "pointer" }}
        >
          <path d="M8 1.2 9.8 5l4 .58-2.9 2.83.69 3.99L8 10.3l-3.59 2.1.69-3.99L2.2 5.58 6.2 5z" />
        </svg>
      ))}
    </span>
  );
}

function RatingBar({ count, total, rating, accent }: { count: number; total: number; rating: number; accent: string }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: "0.72rem", fontWeight: 600, opacity: 0.5, minWidth: 14, textAlign: "right" }}>{rating}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 4, background: "#E8E6DF", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: accent, borderRadius: 4, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: "0.72rem", opacity: 0.4, minWidth: 20 }}>{count}</span>
    </div>
  );
}

export function SiteProductReviews({
  productId,
  subdomain,
  heading,
  showForm,
  maxVisible,
  layout,
  accent,
  preview,
}: {
  productId?: string;
  subdomain?: string;
  heading?: string;
  showForm?: boolean;
  maxVisible?: number;
  layout?: "list" | "grid";
  accent?: string;
  preview?: boolean;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(maxVisible ?? 6);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const ac = accent ?? "#FF5500";
  const border = "#E8E6DF";

  useEffect(() => {
    if (!productId || !subdomain) return;
    setLoading(true);
    fetch(
      `/api/public/sites/${encodeURIComponent(subdomain)}/reviews?productId=${encodeURIComponent(productId)}`,
    )
      .then((r) => r.json())
      .then((d: { reviews?: Review[] }) => setReviews(d.reviews ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId, subdomain]);

  const total = reviews.length;
  const avg = total
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    r,
    count: reviews.filter((rev) => rev.rating === r).length,
  }));

  const visible = reviews.slice(0, visibleCount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (preview || !subdomain || !productId) {
      setSubmitError("Publiez le site pour activer les avis.");
      return;
    }
    if (!rating) {
      setSubmitError("Veuillez choisir une note.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(
        `/api/public/sites/${encodeURIComponent(subdomain)}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            rating,
            title,
            body,
            reviewerName: name,
            reviewerEmail: email || undefined,
          }),
        },
      );
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(typeof data.error === "string" ? data.error : "Envoi impossible.");
        return;
      }
      setSubmitted(true);
      setFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${border}`,
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: "0.85rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    background: "transparent",
    color: "inherit",
  };

  return (
    <div>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0 0 6px", lineHeight: 1.2 }}>
            {heading ?? "Avis clients"}
          </h2>
          {total > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Stars rating={avg} size={16} />
              <span style={{ fontWeight: 800, fontSize: "1rem" }}>{avg.toFixed(1)}</span>
              <span style={{ fontSize: "0.8rem", opacity: 0.45 }}>({total} avis)</span>
            </div>
          )}
        </div>
        {showForm !== false && !submitted && (
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            style={{
              background: formOpen ? "transparent" : ac,
              color: formOpen ? "inherit" : "#fff",
              border: formOpen ? `1px solid ${border}` : "none",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            {formOpen ? "Annuler" : "+ Laisser un avis"}
          </button>
        )}
      </div>

      {/* Rating breakdown — show when there are reviews */}
      {total >= 3 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 24,
            padding: "16px 20px",
            background: "#FAFAF8",
            borderRadius: 14,
            border: `1px solid ${border}`,
            flexWrap: "wrap",
          }}
        >
          <div style={{ textAlign: "center", minWidth: 60 }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 900, lineHeight: 1 }}>{avg.toFixed(1)}</div>
            <Stars rating={avg} size={14} />
            <div style={{ fontSize: "0.7rem", opacity: 0.45, marginTop: 4 }}>{total} avis</div>
          </div>
          <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 4 }}>
            {ratingCounts.map(({ r, count }) => (
              <RatingBar key={r} rating={r} count={count} total={total} accent={ac} />
            ))}
          </div>
        </div>
      )}

      {/* Submit form */}
      {formOpen && !submitted && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          style={{
            background: "#fff",
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: "20px",
            marginBottom: 20,
          }}
        >
          <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: "0 0 14px" }}>Votre avis</p>

          <div style={{ marginBottom: 14 }}>
            <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, opacity: 0.5, letterSpacing: "0.08em", marginBottom: 6 }}>
              NOTE *
            </span>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, opacity: 0.5, letterSpacing: "0.08em" }}>PRÉNOM *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, opacity: 0.5, letterSpacing: "0.08em" }}>EMAIL (optionnel)</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, opacity: 0.5, letterSpacing: "0.08em" }}>TITRE</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="En une phrase…"
              maxLength={120}
              style={inputStyle}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, opacity: 0.5, letterSpacing: "0.08em" }}>AVIS</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Partagez votre expérience…"
              maxLength={2000}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </label>

          {submitError && (
            <p style={{ color: "#dc2626", fontSize: "0.8rem", marginBottom: 10 }}>{submitError}</p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: ac,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {submitting ? "Envoi…" : "Publier mon avis"}
            </button>
            <span style={{ fontSize: "0.7rem", opacity: 0.35 }}>Vérifiés avant publication.</span>
          </div>
        </form>
      )}

      {submitted && (
        <div
          style={{
            background: `${ac}10`,
            border: `1px solid ${ac}30`,
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: "0.875rem",
            color: ac,
            fontWeight: 600,
          }}
        >
          ✓ Merci ! Votre avis sera publié après vérification.
        </div>
      )}

      {/* Reviews */}
      {loading && (
        <p style={{ opacity: 0.4, fontSize: "0.85rem" }}>Chargement des avis…</p>
      )}

      {!loading && !productId && (
        <p style={{ opacity: 0.35, fontSize: "0.85rem", fontStyle: "italic" }}>
          Configurez un produit pour afficher ses avis.
        </p>
      )}

      {!loading && productId && total === 0 && (
        <p style={{ opacity: 0.35, fontSize: "0.85rem", fontStyle: "italic" }}>
          Aucun avis pour l'instant — soyez le premier !
        </p>
      )}

      {!loading && visible.length > 0 && (
        <div
          style={{
            display: layout === "grid" ? "grid" : "flex",
            flexDirection: layout === "grid" ? undefined : "column",
            gridTemplateColumns: layout === "grid" ? "repeat(auto-fill, minmax(260px, 1fr))" : undefined,
            gap: 12,
          }}
        >
          {visible.map((rev) => (
            <div
              key={rev.id}
              style={{
                background: "#fff",
                border: `1px solid ${border}`,
                borderRadius: 14,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Stars rating={rev.rating} size={13} />
                <span style={{ fontSize: "0.7rem", opacity: 0.35 }}>
                  {new Date(rev.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {rev.title && (
                <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: "0 0 4px", lineHeight: 1.3 }}>
                  {rev.title}
                </p>
              )}
              {rev.body && (
                <p style={{ fontSize: "0.85rem", opacity: 0.65, margin: "0 0 8px", lineHeight: 1.55 }}>
                  {rev.body}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: ac,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {rev.reviewerName.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, opacity: 0.55 }}>
                  {rev.reviewerName}
                </span>
                <svg width={11} height={11} viewBox="0 0 16 16" fill={ac} style={{ marginLeft: 2, flexShrink: 0 }}>
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.7 5.7-4.3 4.3a.75.75 0 0 1-1.06 0L4.3 9a.75.75 0 1 1 1.06-1.06l1.54 1.54 3.74-3.74A.75.75 0 1 1 11.7 6.7z" />
                </svg>
                <span style={{ fontSize: "0.68rem", opacity: 0.35 }}>Vérifié</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > visibleCount && (
        <button
          type="button"
          onClick={() => setVisibleCount((n) => n + 6)}
          style={{
            marginTop: 16,
            background: "transparent",
            border: `1px solid ${border}`,
            borderRadius: 10,
            padding: "9px 20px",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "block",
            width: "100%",
            opacity: 0.7,
          }}
        >
          Voir plus d'avis ({total - visibleCount} de plus)
        </button>
      )}
    </div>
  );
}
