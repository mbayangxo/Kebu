"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AlkebulanLion } from "@/app/components/panther-motif";
import { KEBU } from "@/lib/kebu-brand";

type LegalStructure = { code: string; label: string; description?: string };
type CountryModule = {
  countryCode: string;
  countryName: string;
  legalStructures: LegalStructure[];
  regions: string[];
};

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

const STEPS = ["Basics", "Structure", "Founder", "Review"] as const;

export default function RegisterBusinessWizardPage() {
  const router = useRouter();
  const formId = useId();
  const [step, setStep] = useState(0);
  const [module, setModule] = useState<CountryModule | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [legalName, setLegalName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [countryCode, setCountryCode] = useState("SN");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("services");
  const [description, setDescription] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [legalStructure, setLegalStructure] = useState("");
  const [founderName, setFounderName] = useState("");
  const [founderEmail, setFounderEmail] = useState("");
  const [ownershipPercent, setOwnershipPercent] = useState("100");

  const idempotencyKeyRef = useRef<string | null>(null);
  function getIdempotencyKey() {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `reg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return idempotencyKeyRef.current;
  }

  useEffect(() => {
    let cancelled = false;
    async function loadModule() {
      setModuleError(null);
      try {
        const res = await fetch(`/api/businesses/country-modules?country=${countryCode}`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          router.replace("/login?next=/business/register");
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            setModule(null);
            setModuleError(typeof data.error === "string" ? data.error : "Country module unavailable.");
          }
          return;
        }
        if (!cancelled) {
          setModule(data.module);
          setRegion("");
          setLegalStructure("");
        }
      } catch {
        if (!cancelled) setModuleError("Could not load country module.");
      }
    }
    void loadModule();
    return () => {
      cancelled = true;
    };
  }, [countryCode, router]);

  function validateStep(current: number): boolean {
    const errs: Record<string, string[]> = {};
    if (current === 0) {
      if (!legalName.trim()) errs.legalName = ["Required"];
      if (!region.trim()) errs.region = ["Required"];
      if (description.trim().length < 20) errs.description = ["At least 20 characters"];
      if (!businessEmail.trim()) errs.businessEmail = ["Required"];
      if (!businessPhone.trim()) errs.businessPhone = ["Required"];
    }
    if (current === 1) {
      if (!legalStructure) errs.legalStructure = ["Select a structure"];
    }
    if (current === 2) {
      if (!founderName.trim()) errs.founderName = ["Required"];
      if (!founderEmail.trim()) errs.founderEmail = ["Required"];
      const pct = Number(ownershipPercent);
      if (!(pct > 0 && pct <= 100)) errs.ownershipPercent = ["Must be between 0 and 100"];
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    setError(null);
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validateStep(2) && step < 3) {
      setStep(2);
      return;
    }
    if (step < 3) {
      next();
      return;
    }
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      setError("Please complete all required fields.");
      return;
    }

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
          region,
          category,
          description,
          businessEmail,
          businessPhone,
          website: website.trim() || undefined,
          legalStructure,
          founderName,
          founderEmail,
          ownershipPercent: Number(ownershipPercent),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/business/register");
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not register business.");
        if (data.issues?.fieldErrors) setFieldErrors(data.issues.fieldErrors);
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
    <div className="min-h-screen" style={{ background: KEBU.cream, color: KEBU.black }}>
      <header className="sticky top-0 z-40" style={{ background: KEBU.black }}>
        <div
          className="h-[3px] w-full"
          style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }}
        />
        <div className="max-w-xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/business" className="flex items-center gap-2 text-white text-sm">
            <AlkebulanLion size={28} />
            <span className="font-bold tracking-[0.12em]">Register a Business</span>
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-10">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3"
          style={{ color: KEBU.orange }}
        >
          Business registration · draft Kebu ID
        </p>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          Register a business
        </h1>
        <p className="text-sm mb-6" style={{ color: KEBU.muted, lineHeight: 1.7 }}>
          Creates a draft business with a permanent Kebu ID. Government filing is not submitted in this slice —
          country modules prepare for future connectors.
        </p>

        <nav aria-label="Wizard steps" className="flex gap-2 mb-8 flex-wrap">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
              style={{
                background: i === step ? KEBU.black : "#E8E6DF",
                color: i === step ? KEBU.white : KEBU.muted,
              }}
            >
              {i + 1}. {label}
            </span>
          ))}
        </nav>

        {moduleError && (
          <div role="alert" className="mb-4 rounded-xl px-3 py-2 text-sm" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
            {moduleError}
          </div>
        )}

        <form id={formId} onSubmit={onSubmit} className="space-y-5 rounded-2xl p-5 sm:p-6" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
          {step === 0 && (
            <>
              <label className="block text-xs font-semibold uppercase tracking-wider">
                Legal business name
                <input
                  required
                  maxLength={160}
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ border: "1px solid #DDE0F0" }}
                  disabled={submitting}
                />
                {fieldErrors.legalName && <span className="text-red-700 text-[11px]">{fieldErrors.legalName[0]}</span>}
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
                    <option value="SN">Senegal (SN)</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wider">
                  Region / state
                  <select
                    required
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                    style={{ border: "1px solid #DDE0F0" }}
                    disabled={submitting || !module}
                  >
                    <option value="">Select region</option>
                    {(module?.regions ?? []).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
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
                {fieldErrors.description && <span className="text-red-700 text-[11px]">{fieldErrors.description[0]}</span>}
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider">
                Business email
                <input
                  type="email"
                  required
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ border: "1px solid #DDE0F0" }}
                  disabled={submitting}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider">
                Business phone
                <input
                  required
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ border: "1px solid #DDE0F0" }}
                  disabled={submitting}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider">
                Website (optional)
                <input
                  type="url"
                  placeholder="https://"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ border: "1px solid #DDE0F0" }}
                  disabled={submitting}
                />
              </label>
            </>
          )}

          {step === 1 && (
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wider mb-3">
                Business structure ({module?.countryName ?? countryCode})
              </legend>
              <div className="space-y-2">
                {(module?.legalStructures ?? []).map((s) => (
                  <label
                    key={s.code}
                    className="flex items-start gap-3 rounded-xl px-3 py-3 cursor-pointer"
                    style={{
                      border: `1px solid ${legalStructure === s.code ? KEBU.orange : KEBU.border}`,
                      background: legalStructure === s.code ? "rgba(255,85,0,0.08)" : KEBU.card,
                    }}
                  >
                    <input
                      type="radio"
                      name="legalStructure"
                      value={s.code}
                      checked={legalStructure === s.code}
                      onChange={() => setLegalStructure(s.code)}
                      disabled={submitting}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold">{s.label}</span>
                      {s.description && (
                        <span className="block text-xs mt-0.5" style={{ color: "#6B5B45" }}>
                          {s.description}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
              {fieldErrors.legalStructure && (
                <p className="text-red-700 text-[11px] mt-2">{fieldErrors.legalStructure[0]}</p>
              )}
            </fieldset>
          )}

          {step === 2 && (
            <>
              <p className="text-xs" style={{ color: "#6B5B45" }}>
                This slice supports one primary founder. Multiple owners can be added in a later slice.
              </p>
              <label className="block text-xs font-semibold uppercase tracking-wider">
                Founder name
                <input
                  required
                  value={founderName}
                  onChange={(e) => setFounderName(e.target.value)}
                  className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ border: "1px solid #DDE0F0" }}
                  disabled={submitting}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider">
                Founder email
                <input
                  type="email"
                  required
                  value={founderEmail}
                  onChange={(e) => setFounderEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ border: "1px solid #DDE0F0" }}
                  disabled={submitting}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider">
                Ownership %
                <input
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.01}
                  required
                  value={ownershipPercent}
                  onChange={(e) => setOwnershipPercent(e.target.value)}
                  className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ border: "1px solid #DDE0F0" }}
                  disabled={submitting}
                />
              </label>
            </>
          )}

          {step === 3 && (
            <div className="space-y-2 text-sm" style={{ color: "#6B5B45" }}>
              <p>
                <strong style={{ color: KEBU.black }}>{legalName}</strong>
                {tradingName ? ` (trading as ${tradingName})` : ""}
              </p>
              <p>
                {countryCode} · {region} · {category}
              </p>
              <p>Structure: {module?.legalStructures.find((s) => s.code === legalStructure)?.label ?? legalStructure}</p>
              <p>
                Founder: {founderName} · {ownershipPercent}% · {founderEmail}
              </p>
              <p>{businessEmail} · {businessPhone}</p>
              <p className="text-xs pt-2">
                On submit you receive a draft Kebu ID. No government filing is sent.
              </p>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-xl px-3 py-2 text-sm" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                disabled={submitting}
                className="flex-1 rounded-full py-3 text-sm font-bold uppercase tracking-wider"
                style={{ background: "#E8E6DF", color: KEBU.black }}
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={next}
                disabled={submitting || !!moduleError}
                className="flex-1 rounded-full py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                style={{ background: KEBU.orange, color: KEBU.black }}
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !!moduleError}
                className="flex-1 rounded-full py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                style={{ background: KEBU.orange, color: KEBU.black }}
              >
                {submitting ? "Creating…" : "Create draft business"}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
