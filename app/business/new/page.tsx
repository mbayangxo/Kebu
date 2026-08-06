"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { AlkebulanLion } from "@/app/components/panther-motif";

const CATEGORIES = [
  "agriculture",
  "fashion",
  "beauty",
  "food",
  "retail",
  "technology",
  "education",
  "services",
  "tourism",
  "construction",
  "manufacturing",
  "health",
  "other",
] as const;

const COUNTRIES = [
  ["SN", "Senegal"],
  ["NG", "Nigeria"],
  ["GH", "Ghana"],
  ["KE", "Kenya"],
  ["CI", "Côte d'Ivoire"],
  ["ZA", "South Africa"],
  ["ET", "Ethiopia"],
  ["RW", "Rwanda"],
  ["TZ", "Tanzania"],
  ["UG", "Uganda"],
  ["MA", "Morocco"],
  ["EG", "Egypt"],
] as const;

export default function NewBusinessPage() {
  const router = useRouter();
  const formId = useId();
  const [legalName, setLegalName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [countryCode, setCountryCode] = useState("SN");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("services");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idempotencyKeyRef = useRef<string | null>(null);
  function getIdempotencyKey() {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return idempotencyKeyRef.current;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": getIdempotencyKey(),
        },
        body: JSON.stringify({
          legalName,
          tradingName: tradingName.trim() || undefined,
          countryCode,
          category,
          description,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/business/new");
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create business.");
        return;
      }
      router.replace(`/business/${data.business.id}`);
    } catch {
      setError("Network error. Check your connection and retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", color: "#0F0D33" }}>
      <header className="sticky top-0 z-40" style={{ background: "#0F0D33" }}>
        <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #009E40, #00C851)" }} />
        <div className="max-w-xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/business" className="flex items-center gap-2 text-white text-sm">
            <AlkebulanLion size={28} />
            <span className="font-bold tracking-[0.12em]">KEBU ID</span>
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "#009E40" }}>
          Draft business · Level 1
        </p>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          Create a Kebu ID
        </h1>
        <p className="text-sm mb-8" style={{ color: "#6B5B45", lineHeight: 1.7 }}>
          This creates a draft business identity — not personal eligibility verification.
          You become the founder. Government registration and payments are later slices.
        </p>

        <form id={formId} onSubmit={onSubmit} className="space-y-5 rounded-2xl p-5 sm:p-6" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
          <label className="block text-xs font-semibold uppercase tracking-wider">
            Legal or proposed name
            <input
              required
              maxLength={160}
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
              style={{ border: "1px solid #DDE0F0" }}
              disabled={submitting}
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider">
            Trading name (optional)
            <input
              maxLength={160}
              value={tradingName}
              onChange={(e) => setTradingName(e.target.value)}
              className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
              style={{ border: "1px solid #DDE0F0" }}
              disabled={submitting}
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-xs font-semibold uppercase tracking-wider">
              Country
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ border: "1px solid #DDE0F0" }}
                disabled={submitting}
              >
                {COUNTRIES.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label} ({code})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wider">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
                className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ border: "1px solid #DDE0F0" }}
                disabled={submitting}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wider">
            Short description
            <textarea
              required
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm min-h-[100px]"
              style={{ border: "1px solid #DDE0F0" }}
              disabled={submitting}
            />
          </label>

          {error && (
            <div role="alert" className="rounded-xl px-3 py-2 text-sm" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !legalName.trim() || !description.trim()}
            className="w-full rounded-full py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
            style={{ background: "#00C851", color: "#0F0D33" }}
          >
            {submitting ? "Creating…" : "Create draft Kebu ID"}
          </button>
        </form>
      </main>
    </div>
  );
}
