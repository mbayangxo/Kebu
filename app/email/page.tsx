"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { ALL_COUNTRY_PROGRAMS } from "@/lib/data/all-country-programs";
import { KEBU } from "@/lib/kebu-brand";

const SECTORS = [
  "Agriculture", "Construction", "Energy / Solar", "Tech / Software", "Healthcare",
  "Logistics / Transport", "Education", "Fashion / Beauty", "Food processing",
  "Finance / Fintech", "Media / Creative", "Tourism", "Manufacturing", "Mining",
];

const STAGES = [
  { id: "idea", label: "Just an idea" },
  { id: "early", label: "Early stage" },
  { id: "growing", label: "Growing" },
  { id: "established", label: "Established" },
];

const COUNTRIES = ALL_COUNTRY_PROGRAMS.map((program) => program.flag + " " + program.country);
const FIELD = "min-h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#FF6A00]";

export default function EmailPage() {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [stage, setStage] = useState("");
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!country || loading) return;
    setLoading(true);
    setResult("");
    const cleanCountry = country.replace(/^.{2,4}\s/, "");

    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, country: cleanCountry, sector, stage, goal }),
      });
      if (!res.body) throw new Error("No response stream.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        text += decoder.decode(part.value, { stream: true });
        setResult(text);
      }
    } catch {
      setResult("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const subjectMatch = result.match(/\[SUBJECT:\s*(.+?)\]/);
  const subject = subjectMatch?.[1] || "Your personalized opportunity digest";
  const body = result.replace(/\[SUBJECT:.*?\]\n?/, "");

  return (
    <AppShell title="Email">
      <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-7">
        <header className="grid gap-5 border-b pb-6 lg:grid-cols-[1fr_420px] lg:items-end" style={{ borderColor: KEBU.borders.default }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Email</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>Useful email, not a fake inbox.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>Use the email capabilities that are real today: business campaigns and generated opportunity digests. Kebu’s full interoperable mailbox remains a separate infrastructure slice.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/business" className="rounded-[18px] border bg-white p-3 outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }}>
              <KebuIcon name="people" size={17} style={{ color: KEBU.orange }} />
              <p className="mt-3 text-[11px] font-black">Business campaigns</p>
              <p className="mt-1 text-[9px]" style={{ color: KEBU.muted }}>Subscribers · drafts · sending</p>
            </Link>
            <Link href="/messages" className="rounded-[18px] border bg-white p-3 outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }}>
              <KebuIcon name="message" size={17} style={{ color: KEBU.orange }} />
              <p className="mt-3 text-[11px] font-black">Customer chat</p>
              <p className="mt-1 text-[9px]" style={{ color: KEBU.muted }}>Real site conversations</p>
            </Link>
          </div>
        </header>

        <section className="grid gap-5 py-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="rounded-[22px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
            <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>Opportunity digest</p>
            <h2 className="mt-2 text-xl font-black">Generate a useful email.</h2>
            <p className="mt-1 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>This uses the existing Kebu email agent to turn country, sector and stage into a personalized opportunity digest.</p>

            <div className="mt-5 space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-wide" style={{ color: KEBU.muted }}>First name
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional" className={FIELD + " mt-1"} style={{ borderColor: KEBU.borders.default }} />
              </label>
              <label className="block text-[10px] font-black uppercase tracking-wide" style={{ color: KEBU.muted }}>Country
                <select value={country} onChange={(event) => setCountry(event.target.value)} className={FIELD + " mt-1"} style={{ borderColor: KEBU.borders.default }}>
                  <option value="">Choose a country</option>
                  {COUNTRIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-[10px] font-black uppercase tracking-wide" style={{ color: KEBU.muted }}>Sector
                <select value={sector} onChange={(event) => setSector(event.target.value)} className={FIELD + " mt-1"} style={{ borderColor: KEBU.borders.default }}>
                  <option value="">Any sector</option>
                  {SECTORS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: KEBU.muted }}>Stage</p>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  {STAGES.map((item) => <button key={item.id} type="button" onClick={() => setStage(item.id)} className="rounded-xl border px-2 py-2.5 text-[10px] font-bold" style={{ borderColor: stage === item.id ? KEBU.orange : KEBU.borders.default, background: stage === item.id ? "rgba(255,106,0,.08)" : "white" }}>{item.label}</button>)}
                </div>
              </div>
              <label className="block text-[10px] font-black uppercase tracking-wide" style={{ color: KEBU.muted }}>Goal
                <input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Optional context" className={FIELD + " mt-1"} style={{ borderColor: KEBU.borders.default }} />
              </label>
              <button type="button" disabled={!country || loading} onClick={() => void generate()} className="min-h-11 w-full rounded-full text-xs font-black text-white disabled:opacity-40" style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}>{loading ? "Generating…" : "Generate digest →"}</button>
            </div>
          </aside>

          <main className="min-h-[520px] overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: KEBU.borders.default }}>
            {result ? (
              <>
                <div className="flex items-start justify-between gap-4 border-b bg-black px-5 py-4 text-white" style={{ borderColor: KEBU.borders.default }}>
                  <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-white/40">Subject</p><p className="mt-1 text-sm font-black">{subject}</p></div>
                  <button type="button" onClick={() => void copy()} className="rounded-full border border-white/15 px-3 py-2 text-[9px] font-black uppercase tracking-wide">{copied ? "Copied ✓" : "Copy"}</button>
                </div>
                <div className="whitespace-pre-wrap p-5 text-sm leading-relaxed">{body}{loading ? <span className="ml-1 inline-block h-4 w-1 animate-pulse" style={{ background: KEBU.orange }} /> : null}</div>
              </>
            ) : (
              <div className="flex min-h-[520px] flex-col items-center justify-center p-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-[18px]" style={{ background: KEBU.cream, color: KEBU.orange }}><KebuIcon name="message" size={24} /></span>
                <p className="mt-4 text-sm font-black">Your generated email appears here.</p>
                <p className="mt-1 max-w-sm text-[11px] leading-relaxed" style={{ color: KEBU.muted }}>Kebu will only show a result after the real email-agent endpoint responds.</p>
              </div>
            )}
          </main>
        </section>
      </div>
    </AppShell>
  );
}
