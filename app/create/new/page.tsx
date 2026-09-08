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
  isBuilderCreateModeImplemented,
  type BuilderCreateMode,
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
  const modeParam = search.get("mode");

  const initialMode: BuilderCreateMode =
    modeParam === "ai" ||
    modeParam === "photos" ||
    modeParam === "blank" ||
    modeParam === "template" ||
    modeParam === "import" ||
    modeParam === "code"
      ? modeParam
      : templateParam
        ? "template"
        : "ai";

  const [mode, setMode] = useState<BuilderCreateMode>(initialMode);
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
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
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
    if (!isBuilderCreateModeImplemented(mode)) {
      setError("This creation mode is not implemented yet. Use AI, template, or blank.");
      return;
    }
    if (mode === "template" && !templateSlug) {
      setError("Pick a template from the gallery above.");
      return;
    }
    if (mode === "ai" && description.trim().length < 20) {
      setError("Tell Yande a bit more about your business (at least 20 characters).");
      return;
    }
    if (mode === "photos" && photoUrls.length < 1) {
      setError("Upload at least one photo of your products, place, or work.");
      return;
    }
    if (mode === "photos" && description.trim().length < 10) {
      setError("Add a short line about what these photos show (at least 10 characters).");
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
        desiredPages:
          mode === "ai" || mode === "photos"
            ? category === "fashion" || category === "beauty" || category === "store"
              ? ["home", "shop", "about", "contact"]
              : category === "restaurant"
                ? ["home", "menu", "about", "contact"]
                : ["home", "about", "contact"]
            : ["home"],
        templateSlug: mode === "template" ? templateSlug : undefined,
        photoUrls: mode === "photos" ? photoUrls : undefined,
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
      const usedAi = data.usedAi === true;
      router.replace(
        `/create/${data.project.id}?created=1&usedAi=${usedAi ? "1" : "0"}`,
      );
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
          {mode === "ai"
            ? "Describe it. Yande builds it."
            : mode === "photos"
              ? "Your photos. Your site."
            : mode === "blank"
              ? "Start from nothing"
              : mode === "import"
                ? "Import your existing site"
                : mode === "code"
                  ? "Build with code"
                  : "Pick a design you love"}
        </h1>
        <p className="text-base mb-8 leading-relaxed max-w-xl" style={{ color: BUILDER.muted }}>
          {mode === "ai"
            ? "Tell Yande what you want — luxury fashion, restaurant, artist, agency. You get an editable draft, not a locked HTML page."
            : mode === "photos"
              ? "Upload real photos from your phone (under 2 MB each). Kebu builds pages around them — edit and publish when ready."
            : mode === "import"
              ? "Kebu will analyze an existing URL and reconstruct it as editable Kebu structured data — when this slice ships."
              : mode === "code"
                ? "Advanced users will be able to extend sites with real code alongside the Kebu schema — when assigned."
                : mode === "blank"
                  ? "Empty site — add every section yourself. Full creative freedom."
                  : "Live previews, real sites. Customize photos and copy, then publish at "}
          {mode === "template" || mode === "blank" ? (
            <strong>/sites/{subdomain || "your-name"}</strong>
          ) : null}
          {mode === "ai" || mode === "photos" ? (
            <>
              {" "}
              Live at <strong>/sites/{subdomain || "your-name"}</strong> when you publish.
            </>
          ) : null}
        </p>

        <BuilderBusinessNudge />

        <form ref={formRef} onSubmit={onSubmit} className="space-y-8" id="create-site-form">
          <BuilderSurface>
            <BuilderFieldLabel hint="Primary path: describe your business. Yande designs the site. Aesthetics are optional inspiration.">
              How do you want to start?
            </BuilderFieldLabel>
            <BuilderModePicker value={mode} onChange={setMode} />
          </BuilderSurface>

          {(mode === "import" || mode === "code") && (
            <BuilderSurface>
              <p className="text-sm font-bold" style={{ color: BUILDER.ink }}>
                {mode === "import" ? "Import website" : "Build with code"} — not implemented yet
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: BUILDER.muted }}>
                {mode === "import"
                  ? "You will paste a URL; Kebu retrieves public structure and rebuilds it as editable website-v1 schema — never a frozen HTML import."
                  : "Developers will extend Kebu projects with code hooks alongside the structured renderer — for when you need more than the visual editor."}
              </p>
              <p className="mt-3 text-xs" style={{ color: BUILDER.faint }}>
                Use AI, template, or blank to create a site today.
              </p>
            </BuilderSurface>
          )}

          {mode === "ai" && (
            <>
              <YandeAssistant
                variant="create"
                value={description}
                onChange={setDescription}
                onSubmit={() => formRef.current?.requestSubmit()}
                busy={submitting}
              />
              <BuilderSurface className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.muted }}>
                  Try a brief like this
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Create a Senegalese fashion store. Luxury African fashion magazine feel. Sand, deep green and gold. Founder story right under the hero. Large editorial product cards.",
                    "Make it feel less like Shopify and more like a high-end fashion website — bold type, big photos, fewer small cards.",
                    "Beauty brand for Dakar — soft pink and black, gloss products, Klarna-style pay later note, WhatsApp order CTA.",
                  ].map((example) => (
                    <button
                      key={example.slice(0, 40)}
                      type="button"
                      onClick={() => setDescription(example)}
                      className="max-w-full rounded-full px-3 py-1.5 text-left text-[11px] font-medium leading-snug transition hover:opacity-90"
                      style={{
                        background: BUILDER.surfaceMuted,
                        border: `1px solid ${BUILDER.border}`,
                        color: BUILDER.ink,
                      }}
                    >
                      {example.length > 110 ? `${example.slice(0, 110)}…` : example}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: BUILDER.muted }}>
                  After the site is created, keep talking to Yande in the editor (“Add a wholesale section”, “Make
                  mobile completely different”) — Yande redesigns the structured site, not a locked theme.
                </p>
              </BuilderSurface>
            </>
          )}

          {mode === "photos" ? (
            <BuilderSurface className="space-y-3">
              <BuilderFieldLabel hint="JPG / PNG / WebP · max 2 MB each · up to 8 photos (Data Saver friendly).">
                Your photos
              </BuilderFieldLabel>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={uploadingPhotos || photoUrls.length >= 8}
                onChange={(e) => {
                  const list = e.target.files;
                  if (!list?.length) return;
                  void (async () => {
                    setUploadingPhotos(true);
                    setError(null);
                    try {
                      const form = new FormData();
                      const remaining = 8 - photoUrls.length;
                      Array.from(list)
                        .slice(0, remaining)
                        .forEach((f) => form.append("files", f));
                      const res = await fetch("/api/create/draft-photos", {
                        method: "POST",
                        credentials: "include",
                        body: form,
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        setError(typeof data.error === "string" ? data.error : "Photo upload failed.");
                        return;
                      }
                      const urls = Array.isArray(data.photoUrls) ? (data.photoUrls as string[]) : [];
                      setPhotoUrls((prev) => [...prev, ...urls].slice(0, 8));
                    } catch {
                      setError("Network error uploading photos.");
                    } finally {
                      setUploadingPhotos(false);
                      e.target.value = "";
                    }
                  })();
                }}
                className="block w-full text-xs"
              />
              {uploadingPhotos ? (
                <p className="text-xs" style={{ color: BUILDER.muted }}>
                  Uploading…
                </p>
              ) : null}
              {photoUrls.length > 0 ? (
                <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {photoUrls.map((url) => (
                    <li key={url} className="relative aspect-square overflow-hidden rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded bg-black/70 px-1.5 text-[10px] font-bold text-white"
                        onClick={() => setPhotoUrls((prev) => prev.filter((u) => u !== url))}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs" style={{ color: BUILDER.muted }}>
                  No photos yet — add product shots, your shop front, or your work.
                </p>
              )}
            </BuilderSurface>
          ) : null}

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
                      ? `/create/aesthetics?businessId=${encodeURIComponent(businessId)}`
                      : "/create/aesthetics"
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

          {isBuilderCreateModeImplemented(mode) ? (
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
                : mode === "photos"
                  ? "Create site from photos →"
                : "Create & open editor →"}
          </button>
          </BuilderSurface>
          ) : null}
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
