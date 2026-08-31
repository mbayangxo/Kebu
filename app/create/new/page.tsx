"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CreateShell } from "@/app/components/create/create-shell";
import { TemplateCatalogGrid } from "@/app/components/create/template-catalog-grid";
import { templateGroupId, type TemplateCategoryGroupId } from "@/lib/create/template-catalog";

type Template = { id: string; slug: string; name: string; category: string; description: string };
type Business = { id: string; legal_name: string; country_code: string; category: string; description: string };

const CATEGORIES = [
  "fashion",
  "beauty",
  "restaurant",
  "portfolio",
  "music",
  "film",
  "business",
  "store",
  "app",
  "public figure",
  "agriculture",
  "technology",
  "services",
  "other",
];

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function CreateWebsiteWizardInner() {
  const router = useRouter();
  const search = useSearchParams();
  const businessIdParam = search.get("businessId") ?? "";
  const templateParam = search.get("template") ?? "";
  const categoryParam = search.get("category") ?? "";

  const [mode, setMode] = useState<"ai" | "template" | "blank">("template");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState(businessIdParam);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateSlug, setTemplateSlug] = useState(templateParam);
  const [templateFilter, setTemplateFilter] = useState<TemplateCategoryGroupId | "">("");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("services");
  const [description, setDescription] = useState("");
  const [countryCode, setCountryCode] = useState("SN");
  const [locale, setLocale] = useState("en");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainTouched, setSubdomainTouched] = useState(false);
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
        const next = templateParam
          ? `/create/new?template=${encodeURIComponent(templateParam)}`
          : "/create/new";
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      const bData = await bRes.json().catch(() => ({}));
      const tData = await tRes.json().catch(() => ({}));
      if (!cancelled) {
        const list = Array.isArray(bData.businesses) ? bData.businesses : [];
        setBusinesses(list);
        const tList = Array.isArray(tData.templates) ? tData.templates : [];
        setTemplates(tList);
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
        const initialSlug =
          templateParam && tList.some((t: Template) => t.slug === templateParam)
            ? templateParam
            : tList[0]?.slug ?? "";
        setTemplateSlug(initialSlug);
        if (templateParam) {
          setTemplateFilter(templateGroupId(tList.find((t: Template) => t.slug === initialSlug)?.category ?? ""));
        } else if (categoryParam && /^[a-z]+$/.test(categoryParam)) {
          setTemplateFilter(categoryParam as TemplateCategoryGroupId);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router, businessIdParam, templateParam, categoryParam]);

  useEffect(() => {
    if (subdomainTouched || !businessName.trim()) return;
    setSubdomain(slugifyName(businessName));
  }, [businessName, subdomainTouched]);

  const filteredTemplates = templateFilter
    ? templates.filter((t) => templateGroupId(t.category) === templateFilter)
    : templates;

  useEffect(() => {
    if (mode !== "template" || filteredTemplates.length === 0) return;
    if (!filteredTemplates.some((t) => t.slug === templateSlug)) {
      setTemplateSlug(filteredTemplates[0]!.slug);
    }
  }, [mode, templateFilter, filteredTemplates, templateSlug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!subdomain.trim() || subdomain.trim().length < 3) {
      setError("Choose a site address (subdomain) — at least 3 characters.");
      return;
    }
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
          templateSlug: mode === "template" ? templateSlug : undefined,
          subdomain: subdomain.trim().toLowerCase(),
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

  const selectedTemplate = templates.find((t) => t.slug === templateSlug);

  return (
    <div className="min-h-screen" style={{ background: "#FFFBF7", color: "#0A0A0A" }}>
      <CreateShell step="start" title="Pick template" backHref="/create" />

      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          Start your site
        </h1>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: "#5C5348" }}>
          Connects to your Kebu business → editor → preview → live at{" "}
          <strong>/sites/{subdomain || "your-name"}</strong> on this app.
          <span className="block text-xs mt-1" style={{ color: "#8A8074" }}>
            {subdomain || "your-name"}.kebu.africa comes later (domain not owned yet).
          </span>
        </p>

        {businesses.length === 0 && (
          <div role="alert" className="mb-6 rounded-2xl p-5" style={{ background: "#FFF8E8", color: "#5C5348" }}>
            <p className="font-semibold mb-2" style={{ color: "#0A0A0A" }}>
              Step 0 — register your business
            </p>
            <p className="text-sm mb-3">Every Kebu site links to a real business profile (Kebu ID).</p>
            <Link
              href="/business/register"
              className="inline-block rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider"
              style={{ background: "#0A0A0A", color: "#fff" }}
            >
              Register a business
            </Link>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl p-6" style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.1)" }}>
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wider mb-3">How to start</legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["template", "Template"],
                  ["ai", "Yande AI"],
                  ["blank", "Blank"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className="rounded-xl px-2 py-3 text-xs font-semibold"
                  style={{
                    background: mode === value ? "#FF5500" : "#FFF8F2",
                    color: mode === value ? "#FFFFFF" : "#0A0A0A",
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
              style={{ border: "1px solid rgba(10,10,10,0.1)" }}
            >
              <option value="">Select business</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.legal_name}
                </option>
              ))}
            </select>
          </label>

          {mode === "template" && templates.length > 0 && (
            <TemplateCatalogGrid
              templates={templates}
              selectedSlug={templateSlug}
              onSelect={setTemplateSlug}
              categoryFilter={templateFilter}
              onCategoryChange={setTemplateFilter}
            />
          )}

          {mode === "template" && selectedTemplate?.description ? (
            <p className="text-xs leading-relaxed rounded-xl p-3" style={{ background: "#FFF8F2", color: "#5C5348" }}>
              <strong>Selected:</strong> {selectedTemplate.name} — {selectedTemplate.description}
            </p>
          ) : null}

          <label className="block text-xs font-semibold uppercase tracking-wider">
            Site name
            <input
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
              style={{ border: "1px solid rgba(10,10,10,0.1)" }}
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider">
            Your site slug
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs whitespace-nowrap" style={{ color: "#8A8578" }}>
                /sites/
              </span>
              <input
                required
                minLength={3}
                value={subdomain}
                onChange={(e) => {
                  setSubdomainTouched(true);
                  setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="maylecor"
                className="flex-1 rounded-xl px-3 py-2.5 text-sm"
                style={{ border: "1px solid rgba(10,10,10,0.1)" }}
              />
            </div>
            <p className="mt-1 text-[11px] font-normal normal-case tracking-normal" style={{ color: "#8A8074" }}>
              Later: {subdomain || "your-name"}.kebu.africa (after domain is owned)
            </p>
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider">
            Short description
            <textarea
              required
              minLength={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm min-h-[80px]"
              style={{ border: "1px solid rgba(10,10,10,0.1)" }}
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-xs font-semibold uppercase tracking-wider">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ border: "1px solid rgba(10,10,10,0.1)" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wider">
              Country code
              <input
                required
                maxLength={2}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ border: "1px solid rgba(10,10,10,0.1)" }}
              />
            </label>
          </div>

          {error && (
            <div role="alert" className="rounded-xl px-3 py-2 text-sm" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !businessId}
            className="w-full rounded-full py-3.5 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
            style={{ background: "#FF5500", color: "#FFFFFF" }}
          >
            {submitting ? "Creating…" : "Create & open editor →"}
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
