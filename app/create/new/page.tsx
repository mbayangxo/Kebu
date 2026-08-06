"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AlkebulanLion } from "@/app/components/panther-motif";

type Template = { id: string; slug: string; name: string; category: string; description: string };
type Business = { id: string; legal_name: string; country_code: string; category: string; description: string };

const CATEGORIES = [
  "fashion",
  "beauty",
  "restaurant",
  "portfolio",
  "agriculture",
  "technology",
  "services",
  "other",
];

function CreateWebsiteWizardInner() {
  const router = useRouter();
  const search = useSearchParams();
  const businessIdParam = search.get("businessId") ?? "";

  const [mode, setMode] = useState<"ai" | "template" | "blank">("template");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState(businessIdParam);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateSlug, setTemplateSlug] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("services");
  const [description, setDescription] = useState("");
  const [countryCode, setCountryCode] = useState("SN");
  const [locale, setLocale] = useState("en");
  const [visualDirection, setVisualDirection] = useState("Clean African modern");
  const [subdomain, setSubdomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [bRes, tRes] = await Promise.all([
        fetch("/api/businesses", { credentials: "include" }),
        fetch("/api/templates", { credentials: "include" }),
      ]);
      if (bRes.status === 401 || tRes.status === 401) {
        router.replace(`/login?next=/create/new${businessIdParam ? `?businessId=${businessIdParam}` : ""}`);
        return;
      }
      const bData = await bRes.json().catch(() => ({}));
      const tData = await tRes.json().catch(() => ({}));
      if (!cancelled) {
        const list = Array.isArray(bData.businesses) ? bData.businesses : [];
        setBusinesses(list);
        setTemplates(Array.isArray(tData.templates) ? tData.templates : []);
        if (businessIdParam) {
          const match = list.find((b: Business) => b.id === businessIdParam);
          if (match) {
            setBusinessId(match.id);
            setBusinessName(match.legal_name);
            setCountryCode(match.country_code || "SN");
            setCategory(match.category || "services");
            setDescription(match.description || "");
          }
        } else if (list[0]) {
          setBusinessId(list[0].id);
          setBusinessName(list[0].legal_name);
          setCountryCode(list[0].country_code || "SN");
          setCategory(list[0].category || "services");
          setDescription(list[0].description || "");
        }
        if (tData.templates?.[0]) setTemplateSlug(tData.templates[0].slug);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router, businessIdParam]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      if (!businessId) {
        setError("Register a Kebu business first, then build its website.");
        return;
      }
      const res = await fetch("/api/projects/create-website", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          businessId,
          businessName,
          category,
          description,
          countryCode,
          locale,
          desiredPages: ["home"],
          visualDirection,
          templateSlug: mode === "template" ? templateSlug : undefined,
          subdomain: subdomain.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/create/new");
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create website.");
        return;
      }
      router.replace(`/create/${data.project.id}`);
    } catch {
      setError("Network error. Retry.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", color: "#0F0D33" }}>
      <header className="sticky top-0 z-40" style={{ background: "#0F0D33" }}>
        <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #009E40, #00C851)" }} />
        <div className="max-w-xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/create" className="flex items-center gap-2 text-white text-sm">
            <AlkebulanLion size={28} />
            <span className="font-bold tracking-[0.12em]">Build Website</span>
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          Build a website
        </h1>
        <p className="text-sm mb-8" style={{ color: "#6B5B45" }}>
          Template, AI, or blank — structured pages saved to your Kebu business. Stores and payments are separate slices.
        </p>

        {businesses.length === 0 && (
          <div role="alert" className="mb-6 rounded-xl p-4" style={{ background: "#FFF8E8", color: "#6B5B45" }}>
            You need a Kebu business first.{" "}
            <Link href="/business/register" className="font-semibold underline">
              Register a Business
            </Link>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wider mb-3">Start with</legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["template", "Choose a template"],
                  ["ai", "Start with AI"],
                  ["blank", "Start blank"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className="rounded-xl px-2 py-3 text-xs font-semibold"
                  style={{
                    background: mode === value ? "#0F0D33" : "#F4F2EC",
                    color: mode === value ? "#fff" : "#0F0D33",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs font-semibold uppercase tracking-wider">
            Kebu business
            <select
              required
              value={businessId}
              onChange={(e) => {
                const id = e.target.value;
                setBusinessId(id);
                const match = businesses.find((b) => b.id === id);
                if (match) {
                  setBusinessName(match.legal_name);
                  setCountryCode(match.country_code || "SN");
                  setCategory(match.category || "services");
                  setDescription(match.description || "");
                }
              }}
              className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
              style={{ border: "1px solid #DDE0F0" }}
            >
              <option value="">Select business</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.legal_name}
                </option>
              ))}
            </select>
          </label>

          {mode === "template" && (
            <label className="block text-xs font-semibold uppercase tracking-wider">
              Template
              <select
                required
                value={templateSlug}
                onChange={(e) => setTemplateSlug(e.target.value)}
                className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ border: "1px solid #DDE0F0" }}
              >
                {templates.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name} · {t.category}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-xs font-semibold uppercase tracking-wider">
            Business name
            <input
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
              style={{ border: "1px solid #DDE0F0" }}
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-xs font-semibold uppercase tracking-wider">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ border: "1px solid #DDE0F0" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wider">
              Country
              <input
                required
                maxLength={2}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ border: "1px solid #DDE0F0" }}
              />
            </label>
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wider">
            Description
            <textarea
              required
              minLength={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm min-h-[90px]"
              style={{ border: "1px solid #DDE0F0" }}
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-xs font-semibold uppercase tracking-wider">
              Language
              <input
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ border: "1px solid #DDE0F0" }}
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wider">
              Subdomain (optional)
              <input
                placeholder="my-brand"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ border: "1px solid #DDE0F0" }}
              />
            </label>
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wider">
            Visual direction
            <input
              value={visualDirection}
              onChange={(e) => setVisualDirection(e.target.value)}
              className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
              style={{ border: "1px solid #DDE0F0" }}
            />
          </label>

          {error && (
            <div role="alert" className="rounded-xl px-3 py-2 text-sm" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !businessId}
            className="w-full rounded-full py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
            style={{ background: "#00C851", color: "#0F0D33" }}
          >
            {submitting ? "Creating…" : mode === "ai" ? "Generate with AI" : "Create website"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function CreateWebsiteWizardPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm">Loading…</div>}>
      <CreateWebsiteWizardInner />
    </Suspense>
  );
}
