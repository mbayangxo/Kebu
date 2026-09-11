"use client";

import { useState } from "react";
import Link from "next/link";
import { KEBU_SUPPORT_EMAIL } from "@/lib/navigation/marketing-nav";
import { KEBU } from "@/lib/kebu-brand";

export function ContactHelpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/help/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone.trim() || undefined,
          subject,
          body,
          source: "contact",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not send.");
        return;
      }
      setDone(typeof data.message === "string" ? data.message : "Request received.");
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setBody("");
    } catch {
      setError("Network error. Try email instead.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-2xl border px-4 py-3 text-sm mb-6" style={{ borderColor: KEBU.border }}>
        {done}
      </p>
    );
  }

  return (
    <>
      <form onSubmit={(e) => void submit(e)} className="space-y-3 mb-10">
        <input
          required
          maxLength={80}
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-sm"
          style={{ borderColor: KEBU.border }}
        />
        <input
          required
          type="email"
          maxLength={254}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-sm"
          style={{ borderColor: KEBU.border }}
        />
        <input
          maxLength={24}
          placeholder="Phone (optional — WhatsApp preferred)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-sm"
          style={{ borderColor: KEBU.border }}
        />
        <input
          required
          maxLength={120}
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-sm"
          style={{ borderColor: KEBU.border }}
        />
        <textarea
          required
          maxLength={4000}
          rows={5}
          placeholder="How can we help?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-sm"
          style={{ borderColor: KEBU.border }}
        />
        {error ? <p className="text-sm" style={{ color: "#8B1E1E" }}>{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full px-8 py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: KEBU.orange }}
        >
          {busy ? "Sending…" : "Send help request"}
        </button>
      </form>
      <p className="text-sm" style={{ color: KEBU.muted }}>
        Or email{" "}
        <a href={`mailto:${KEBU_SUPPORT_EMAIL}`} className="underline" style={{ color: KEBU.orange }}>
          {KEBU_SUPPORT_EMAIL}
        </a>
        .
      </p>
      <p className="text-sm mt-4" style={{ color: KEBU.faint }}>
        For product guides, see the{" "}
        <Link href="/help" className="underline" style={{ color: KEBU.orange }}>
          Help center
        </Link>{" "}
        and{" "}
        <Link href="/faqs" className="underline" style={{ color: KEBU.orange }}>
          FAQs
        </Link>
        .
      </p>
    </>
  );
}
