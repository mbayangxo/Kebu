"use client";

import { useEffect, useState } from "react";

export type EmailPopupProps = {
  enabled?: boolean;
  mode?: "email" | "consent" | "both";
  heading?: string;
  body?: string;
  buttonLabel?: string;
  dismissLabel?: string;
  consentLabel?: string;
  acceptConsentLabel?: string;
  successMessage?: string;
  delaySeconds?: number;
  remindAfterDays?: number;
  showOnFirstVisitOnly?: boolean;
  imageUrl?: string;
  discountCode?: string;
  discountTeaser?: string;
};

const STORAGE_PREFIX = "kebu_site_popup_";

function storageKey(projectId: string | undefined, sectionId: string | undefined) {
  return `${STORAGE_PREFIX}${projectId ?? "draft"}_${sectionId ?? "default"}`;
}

type Stored = {
  dismissedAt?: string;
  consentedAt?: string;
  subscribedAt?: string;
};

function readStored(key: string): Stored {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Stored;
  } catch {
    return {};
  }
}

function writeStored(key: string, next: Stored) {
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
}

function daysSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / (1000 * 60 * 60 * 24);
}

/**
 * Live overlay for email capture and/or cookie consent.
 * Emails → `/api/projects/[id]/newsletter/subscribe` → `business_email_subscribers`.
 * Consent/dismiss = localStorage only (not a full legal CMP).
 */
export function SiteEmailPopup({
  projectId,
  sectionId,
  preview = false,
  props,
}: {
  projectId?: string;
  sectionId?: string;
  preview?: boolean;
  props: EmailPopupProps;
}) {
  const mode = props.mode ?? "both";
  const delayMs = Math.max(0, (props.delaySeconds ?? 4) * 1000);
  const remindDays = props.showOnFirstVisitOnly ? 36500 : (props.remindAfterDays ?? 14);
  const key = storageKey(projectId, sectionId);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentOk, setConsentOk] = useState(false);

  useEffect(() => {
    if (props.enabled === false) return;
    if (preview) {
      const t = window.setTimeout(() => setOpen(true), Math.min(delayMs, 800));
      return () => window.clearTimeout(t);
    }
    const stored = readStored(key);
    const needConsent = mode === "consent" || mode === "both";
    const needEmail = mode === "email" || mode === "both";
    if (needConsent && needEmail && stored.consentedAt && stored.subscribedAt) return;
    if (needConsent && !needEmail && stored.consentedAt) return;
    if (needEmail && !needConsent && stored.subscribedAt) return;
    const sinceDismiss = daysSince(stored.dismissedAt);
    if (sinceDismiss != null && remindDays > 0 && sinceDismiss < remindDays) return;
    const t = window.setTimeout(() => setOpen(true), delayMs);
    return () => window.clearTimeout(t);
  }, [key, delayMs, remindDays, mode, preview, props.enabled]);

  if (!open) return null;

  function dismiss() {
    writeStored(key, { ...readStored(key), dismissedAt: new Date().toISOString() });
    setOpen(false);
  }

  async function onPrimary(e: React.FormEvent) {
    e.preventDefault();
    const needConsent = mode === "consent" || mode === "both";
    const needEmail = mode === "email" || mode === "both";

    if (needConsent && !consentOk) {
      setError("Tick the consent box to continue.");
      return;
    }

    if (needEmail) {
      if (preview || !projectId) {
        setError("Publish your site to collect real emails.");
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/newsletter/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Could not subscribe.");
          return;
        }
        writeStored(key, {
          ...readStored(key),
          subscribedAt: new Date().toISOString(),
          consentedAt: new Date().toISOString(),
        });
        setDone(true);
        window.setTimeout(() => setOpen(false), 1400);
      } catch {
        setError("Network error. Try again.");
      } finally {
        setBusy(false);
      }
      return;
    }

    // consent-only
    writeStored(key, { ...readStored(key), consentedAt: new Date().toISOString() });
    setDone(true);
    window.setTimeout(() => setOpen(false), 900);
  }

  const primaryLabel =
    mode === "consent"
      ? props.acceptConsentLabel || "Accept"
      : props.buttonLabel || "Subscribe";

  return (
    <div className="kebu-email-popup" role="dialog" aria-modal="true" aria-label={props.heading || "Site notice"}>
      <button type="button" className="kebu-email-popup__backdrop" aria-label="Close" onClick={dismiss} />
      <div className="kebu-email-popup__card">
        {props.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.imageUrl}
            alt=""
            className="kebu-email-popup__image"
          />
        ) : null}
        {props.discountTeaser ? (
          <p className="kebu-email-popup__teaser">{props.discountTeaser}</p>
        ) : null}
        <h2 className="kebu-email-popup__heading">{props.heading || "Stay in the loop"}</h2>
        <p className="kebu-email-popup__body">{props.body || ""}</p>

        {done ? (
          <div>
            <p className="kebu-email-popup__success">
              {mode === "consent" ? "Saved." : props.successMessage || "You're on the list."}
            </p>
            {props.discountCode ? (
              <div className="kebu-email-popup__discount-reveal">
                <p className="kebu-email-popup__discount-label">Your discount code:</p>
                <code className="kebu-email-popup__discount-code">{props.discountCode}</code>
              </div>
            ) : null}
          </div>
        ) : (
          <form className="kebu-email-popup__form" onSubmit={(e) => void onPrimary(e)}>
            {(mode === "consent" || mode === "both") && (
              <label className="kebu-email-popup__check">
                <input
                  type="checkbox"
                  checked={consentOk}
                  onChange={(e) => setConsentOk(e.target.checked)}
                />
                <span>{props.consentLabel || "I agree to cookies needed for this site to work."}</span>
              </label>
            )}
            {(mode === "email" || mode === "both") && (
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                disabled={busy}
                className="kebu-email-popup__input"
              />
            )}
            <button type="submit" disabled={busy} className="kebu-email-popup__primary">
              {busy ? "Saving…" : primaryLabel}
            </button>
            {error ? <p className="kebu-email-popup__error">{error}</p> : null}
            <button type="button" className="kebu-email-popup__dismiss" onClick={dismiss}>
              {props.dismissLabel || "No thanks"}
            </button>
            {preview ? (
              <p className="kebu-email-popup__preview-note">Preview — emails save after you publish.</p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
