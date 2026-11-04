"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const ISSUE_TYPES = [
  { id: "broken_button", label: "Button doesn't work" },
  { id: "page_error", label: "Page shows an error" },
  { id: "content_wrong", label: "Wrong or missing info" },
  { id: "slow", label: "Very slow or freezing" },
  { id: "display_broken", label: "Display looks broken" },
  { id: "other", label: "Something else" },
];

export function ReportBug() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [needsEmail, setNeedsEmail] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function ensureSessionChecked() {
    if (checkedSession) return;
    setCheckedSession(true);
    try {
      const { data } = await createClient().auth.getUser();
      if (!data.user?.email) setNeedsEmail(true);
    } catch {
      setNeedsEmail(true);
    }
  }

  async function submit() {
    if (!type || !description.trim() || submitting) return;
    if (needsEmail && !email.trim().includes("@")) return;

    setSubmitting(true);
    setErr(null);
    const page = typeof window !== "undefined" ? window.location.pathname : "";
    const issueLabel = ISSUE_TYPES.find((t) => t.id === type)?.label ?? type;

    try {
      const { data } = await createClient().auth.getUser();
      const userEmail = data.user?.email ?? email.trim();
      const name = (data.user?.user_metadata?.full_name as string | undefined)?.trim() || userEmail.split("@")[0] || "Kebu user";

      const res = await fetch("/api/help/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: userEmail,
          subject: `Bug report: ${issueLabel}`,
          body: `${description.trim()}\n\nPage: ${page}`,
          source: "in_app",
        }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof resData.error === "string" ? resData.error : "Could not send report.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      setSubmitting(false);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setType("");
        setDescription("");
        setEmail("");
      }, 2500);
    } catch {
      setErr("Network error while sending the report.");
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void ensureSessionChecked();
        }}
        className="bg-white border border-border text-muted text-[10px] font-semibold px-3 py-2 rounded-full shadow-md hover:border-orange hover:text-ink transition-colors flex items-center gap-1.5 whitespace-nowrap"
        aria-label="Report a problem"
      >
        🐛 Report issue
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-ink px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-ivory text-sm">Report a problem</h3>
                <p className="text-ivory/60 text-[10px]">We read every report and fix it fast.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-ivory/60 hover:text-ivory text-xl leading-none">×</button>
            </div>

            {submitted ? (
              <div className="p-8 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="font-bold text-ink text-sm">Report sent. Thank you.</p>
                <p className="text-muted text-xs mt-1">We&apos;ll fix it.</p>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-2">What&apos;s the problem?</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ISSUE_TYPES.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setType(id)}
                        className={`text-left text-xs px-3 py-2.5 rounded-xl border font-medium transition-colors ${
                          type === id
                            ? "bg-deep-green text-ivory border-deep-green"
                            : "bg-white border-border text-ink hover:border-deep-green"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-2">Describe what happened</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="e.g. 'I clicked the Generate button and nothing happened'"
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-xs text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold resize-none"
                  />
                  <p className="text-[10px] text-muted mt-1">
                    Page: <span className="font-semibold">{typeof window !== "undefined" ? window.location.pathname : ""}</span>
                  </p>
                </div>

                {needsEmail ? (
                  <div>
                    <label className="block text-xs font-bold text-ink mb-2">Your email (so we can follow up)</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-xs text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold"
                    />
                  </div>
                ) : null}

                {err ? <p className="text-xs" style={{ color: "#8B1E1E" }}>{err}</p> : null}

                <button
                  onClick={() => void submit()}
                  disabled={!type || !description.trim() || submitting || (needsEmail && !email.trim().includes("@"))}
                  className="w-full bg-deep-green text-ivory text-sm font-bold py-3 rounded-xl hover:bg-mid-green transition-colors disabled:opacity-40"
                >
                  {submitting ? "Sending…" : "Send report →"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
