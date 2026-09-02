"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CreateShell } from "@/app/components/create/create-shell";
import { BuilderBusinessNudge } from "@/app/components/create/builder-business-nudge";
import {
  BuilderFieldLabel,
  BuilderModePicker,
  BuilderSurface,
  builderInputClass,
  builderInputStyle,
} from "@/app/components/create/builder-mode-picker";
import { TemplatePickerGrid } from "@/app/components/create/template-picker-grid";
import { YandeAssistant } from "@/app/components/create/yande-assistant";
import { BUILDER } from "@/lib/create/builder-ui";
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
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [bRes, tRes] = await Promise.all([
        fetch("/api/businesses", { credentials: "include" }),
        fetch("/api/templates", { credentials: "include" }),
      ]);
      if (bRes.status === 401 || tRes.status === 401) {
        const next = businessIdParam
          ? `/create/new?businessId=${encodeURIComponent(businessIdParam)}${templateParam ? `&template=${encodeURIComponent(templateParam)}` : ""}`
          : templateParam
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
    if (mode === "template" && !templateSlug) {
      setError("Pick a template from the gallery above.");
      return;
    }
    if (mode === "ai" && description.trim().length < 20) {
      setError("Tell Yande a bit more about your business (at least 20 characters).");
      return;
    }
    if (!subdomain.trim() || subdomain.trim().length < 3) {
      setError("Choose a site address (subdomain) — at least 3 characters.");
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        mode,
        businessName,
        category,
        description,
        countryCode,
        locale,
        desiredPages: ["home"],
        templateSlug: mode === "template" ? templateSlug : undefined,
        subdomain: subdomain.trim().toLowerCase(),
      };
      if (businessId) payload.businessId = businessId;

      const res = await fetch("/api/projects/create-website", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    <div className="min-h-screen" style={{ background: BUILDER.bg, color: BUILDER.ink }}>
      <CreateShell step="start" title="Kebu Builder" backHref="/create" />

      <main className="max-w-6xl mx-auto px-5 py-10 sm:py-14">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] mb-3" style={{ color: BUILDER.orange }}>
          New site
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold mb-3 max-w-2xl" style={{ fontFamily: "var(--font-fraunces)" }}>
          {mode === "ai" ? "Describe it. Yande builds it." : mode === "blank" ? "Start from nothing" : "Pick a design you love"}
        </h1>
        <p className="text-base mb-8 leading-relaxed max-w-xl" style={{ color: BUILDER.muted }}>
          {mode === "ai"
            ? "No templates to browse — tell Yande what you sell and who it’s for. You’ll edit everything before you go live."
            : "Live previews, real sites. Customize photos and copy, then publish at "}
          {mode !== "ai" ? (
            <strong>/sites/{subdomain || "your-name"}</strong>
          ) : null}
          {mode === "ai" ? (
            <>
              {" "}
              Live at <strong>/sites/{subdomain || "your-name"}</strong> when you publish.
            </>
          ) : null}
        </p>

        <BuilderBusinessNudge />

        <form ref={formRef} onSubmit={onSubmit} className="space-y-8" id="create-site-form">
          <BuilderSurface>
            <BuilderFieldLabel hint="Templates, Yande, or blank — switch anytime before you create.">
              How do you want to start?
            </BuilderFieldLabel>
            <BuilderModePicker value={mode} onChange={setMode} />
          </BuilderSurface>

          {mode === "ai" && (
            <YandeAssistant
              variant="create"
              value={description}
              onChange={setDescription}
              onSubmit={() => formRef.current?.requestSubmit()}
              busy={submitting}
            />
          )}

          {mode === "template" && (
            <BuilderSurface className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Choose your template</h2>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#5C5348" }}>
                    Scroll the gallery — each card is a real live preview. Tap a design to select it, or open full
                    preview before you commit.
                  </p>
                </div>
                <Link
                  href={
                    businessId
                      ? `/create/templates?businessId=${encodeURIComponent(businessId)}`
                      : "/create/templates"
                  }
                  className="text-[10px] font-black uppercase tracking-wider underline shrink-0"
                  style={{ color: "#FF5500" }}
                >
                  Full gallery →
                </Link>
              </div>
              {templates.length > 0 ? (
                <TemplatePickerGrid
                  templates={templates}
                  selectedSlug={templateSlug}
                  onSelect={setTemplateSlug}
                  businessId={businessId || undefined}
                  categoryFilter={templateFilter}
                  onCategoryChange={setTemplateFilter}
                />
              ) : (
                <p className="text-sm rounded-xl p-6 text-center" style={{ background: "#FFF8F2", color: "#5C5348" }}>
                  Loading templates…
                </p>
              )}
            </BuilderSurface>
          )}

          <BuilderSurface className="space-y-5">
            <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
              Site details
            </h2>

          <label className="block">
            <BuilderFieldLabel hint="Optional — link Kebu ID, registration, and score later.">
              Kebu business
            </BuilderFieldLabel>
            <select
              value={businessId}
              onChange={(e) => {
                const id = e.target.value;
                setBusinessId(id);
                if (!id) return;
                const match = businesses.find((b) => b.id === id);
                if (match) {
                  setBusinessName(match.legal_name);
                  setCountryCode(match.country_code || "SN");
                  setCategory(match.category || "services");
                  if (mode !== "ai") setDescription(match.description || "");
                }
              }}
              className={builderInputClass}
              style={builderInputStyle}
            >
              <option value="">None — build site first</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.legal_name}
                </option>
              ))}
            </select>
          </label>

          {mode === "template" && selectedTemplate ? (
            <p className="text-sm rounded-xl px-4 py-3" style={{ background: BUILDER.surfaceMuted, color: BUILDER.muted }}>
              Template: <strong style={{ color: BUILDER.ink }}>{selectedTemplate.name}</strong>
            </p>
          ) : null}

          <label className="block">
            <BuilderFieldLabel>Site name</BuilderFieldLabel>
            <input
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={builderInputClass}
              style={builderInputStyle}
            />
          </label>

          <label className="block">
            <BuilderFieldLabel hint="Your public URL on Kebu.">Site address</BuilderFieldLabel>
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap" style={{ color: BUILDER.faint }}>
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
                className={`flex-1 ${builderInputClass}`}
                style={builderInputStyle}
              />
            </div>
          </label>

          {mode !== "ai" ? (
            <label className="block">
              <BuilderFieldLabel>Short description</BuilderFieldLabel>
              <textarea
                required
                minLength={10}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${builderInputClass} min-h-[88px]`}
                style={builderInputStyle}
              />
            </label>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <BuilderFieldLabel>Category</BuilderFieldLabel>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={builderInputClass}
                style={builderInputStyle}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <BuilderFieldLabel>Country</BuilderFieldLabel>
              <input
                required
                maxLength={2}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                className={builderInputClass}
                style={builderInputStyle}
              />
            </label>
          </div>

          {error && (
            <div role="alert" className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full py-4 text-sm font-bold disabled:opacity-50 transition-all hover:brightness-105"
            style={{ background: BUILDER.gradient, color: "#FFFFFF", boxShadow: BUILDER.shadow }}
          >
            {submitting
              ? "Creating…"
              : mode === "ai"
                ? "Create with Yande →"
                : "Create & open editor →"}
          </button>
          </BuilderSurface>
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
