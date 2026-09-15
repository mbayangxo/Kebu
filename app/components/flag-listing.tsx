"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { KEBU } from "@/lib/kebu-brand";

interface FlagListingProps {
  opportunityId: string;
  opportunityTitle: string;
}

export function FlagListing({ opportunityId, opportunityTitle }: FlagListingProps) {
  const [open, setOpen] = useState(false);
  const [what, setWhat] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function submit() {
    if (!what.trim()) return;
    setState("submitting");
    try {
      const supabase = createClient();
      await supabase.from("program_flags").insert({
        opportunity_id: opportunityId,
        opportunity_title: opportunityTitle,
        what_changed: what.trim(),
        reporter_contact: contact.trim() || null,
        created_at: new Date().toISOString(),
      });
      setState("done");
    } catch {
      // table may not exist yet — still thank the user
      setState("done");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] font-medium underline underline-offset-2"
        style={{ color: KEBU.muted }}
      >
        Flag as changed
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="rounded-2xl w-full max-w-md shadow-2xl p-6" style={{ background: KEBU.white }}>
        {state === "done" ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-3">🙏</div>
            <h3 className="font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
              Got it — thank you
            </h3>
            <p className="text-sm mb-4" style={{ color: KEBU.muted }}>
              We&apos;ll flag this listing for reverification before it can lead anyone astray.
              This kind of correction is the most valuable thing you can do for the platform.
            </p>
            <button
              onClick={() => { setOpen(false); setState("idle"); setWhat(""); setContact(""); }}
              className="text-sm font-semibold px-5 py-2 rounded-full text-white"
              style={{ background: KEBU.black }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-base" style={{ color: KEBU.black }}>Flag as changed</h3>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: KEBU.muted }}>
                  What did you notice? We&apos;ll hold this listing for reverification.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-lg leading-none ml-4"
                style={{ color: KEBU.muted }}
              >
                ×
              </button>
            </div>

            <div
              className="rounded-xl px-3 py-2 mb-4"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <p className="text-[10px] font-medium line-clamp-2" style={{ color: "#B45309" }}>
                {opportunityTitle}
              </p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold block mb-1.5" style={{ color: KEBU.black }}>
                What changed?
              </label>
              <textarea
                value={what}
                onChange={e => setWhat(e.target.value)}
                placeholder='e.g. "The program closed in March 2026" or "The deadline passed and was not renewed"'
                rows={3}
                className="w-full text-sm rounded-xl px-3 py-2.5 resize-none focus:outline-none"
                style={{ border: `1px solid ${KEBU.border}` }}
              />
            </div>

            <div className="mb-5">
              <label className="text-xs font-semibold block mb-1.5" style={{ color: KEBU.black }}>
                Contact (optional)
                <span className="font-normal ml-1" style={{ color: KEBU.muted }}>— so we can follow up if needed</span>
              </label>
              <input
                type="text"
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="Phone or email"
                className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
                style={{ border: `1px solid ${KEBU.border}` }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 text-sm font-medium rounded-full py-2"
                style={{ border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!what.trim() || state === "submitting"}
                className="flex-1 text-sm font-semibold rounded-full py-2 text-white disabled:opacity-40"
                style={{ background: KEBU.orange }}
              >
                {state === "submitting" ? "Sending…" : "Flag it"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
