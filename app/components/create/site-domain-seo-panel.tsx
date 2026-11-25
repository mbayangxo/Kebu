"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DomainConnectWizard } from "@/app/components/create/domain-connect-wizard";
import { SiteImageUpload } from "@/app/components/create/site-image-upload";
import { KEBU } from "@/lib/kebu-brand";
import { customDomainDnsTarget } from "@/lib/create/dns-target";
import { defaultSiteSeo, type SiteSeo } from "@/lib/create/site-seo";
import { effectiveSiteVisibility, SITE_VISIBILITY_MODES, type SiteVisibilityMode } from "@/lib/create/site-visibility";
import { liveSiteUrl, kebuSitePreviewPath } from "@/lib/create/site-urls";

type DomainRow = {
  id: string;
  hostname: string;
  status: string;
  dns_target?: string | null;
  last_error?: string | null;
};

export function SiteDomainSeoPanel({ projectId, embedded = false }: { projectId: string; embedded?: boolean }) {
  const [title, setTitle] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [seo, setSeo] = useState<SiteSeo>(defaultSiteSeo());
  const [customDomains, setCustomDomains] = useState<DomainRow[]>([]);
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [domainBusy, setDomainBusy] = useState(false);
  const [domainNote, setDomainNote] = useState<string | null>(null);
  const [settingsState, setSettingsState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [settingsNote, setSettingsNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [httpsLiveUrl, setHttpsLiveUrl] = useState<string | null>(null);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Password protection
  const [visibilityMode, setVisibilityMode] = useState<SiteVisibilityMode>("public");
  const [launchAt, setLaunchAt] = useState("");
  const [visibilityMessage, setVisibilityMessage] = useState("");
  const [published, setPublished] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwState, setPwState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pwNote, setPwNote] = useState<string | null>(null);

  const canonicalDns = customDomainDnsTarget(subdomain || "site");
  const livePath = subdomain.trim() ? kebuSitePreviewPath(subdomain.trim()) : null;
  const appOrigin =
    typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projRes, domRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { credentials: "include" }),
        fetch(`/api/projects/${projectId}/domains`, { credentials: "include" }),
      ]);
      const proj = await projRes.json().catch(() => ({}));
      const dom = await domRes.json().catch(() => ({}));

      if (!projRes.ok) {
        setError(typeof proj.error === "string" ? proj.error : "Could not load site.");
        return;
      }

      setTitle(proj.project?.title ?? "Site");
      const sub = typeof proj.project?.subdomain === "string" ? proj.project.subdomain : "";
      setSubdomain(sub);
      setSeo(defaultSiteSeo(proj.project?.title ?? "Site"));
      if (proj.project?.seo && typeof proj.project.seo === "object") {
        setSeo((prev) => ({ ...prev, ...(proj.project.seo as SiteSeo) }));
      }
      const project = proj.project;
      const mode = project ? effectiveSiteVisibility(project) : "public";
      setVisibilityMode(mode);
      const scheduled = mode === "coming_soon" && project?.site_launch_at ? new Date(project.site_launch_at) : null;
      setLaunchAt(scheduled ? new Date(scheduled.getTime() - scheduled.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "");
      setVisibilityMessage(project?.site_visibility_message ?? "");
      setPublished(Boolean(project?.published_at));
      setPasswordSet(Boolean(project?.site_password_set));

      if (domRes.ok) {
        const list = Array.isArray(dom.domains) ? dom.domains : [];
        setCustomDomains(list);
        const verified = list.find((d: DomainRow) => d.status === "verified");
        if (verified?.hostname) {
          setHttpsLiveUrl(`https://www.${verified.hostname}`);
        } else if (sub) {
          setHttpsLiveUrl(liveSiteUrl(sub));
        }
        const pending = list.find((d: DomainRow) => d.status === "pending" || d.status === "failed");
        if (pending?.id) {
          void verifyDomain(pending.id, list);
        }
      }
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function persistSettings(nextSub: string, nextSeo: SiteSeo) {
    setSettingsState("saving");
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: nextSub, seo: nextSeo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSettingsState("error");
        setSettingsNote(typeof data.error === "string" ? data.error : "Could not save.");
        return;
      }
      setSettingsState("saved");
      setSettingsNote("Saved.");
    } catch {
      setSettingsState("error");
      setSettingsNote("Network error.");
    }
  }

  function queueSave(patch: { subdomain?: string; seo?: Partial<SiteSeo> }) {
    const nextSub = patch.subdomain ?? subdomain;
    const nextSeo = { ...seo, ...(patch.seo ?? {}) };
    if (patch.subdomain !== undefined) setSubdomain(patch.subdomain);
    if (patch.seo) setSeo(nextSeo);
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSub.trim()) && nextSub.trim().length >= 3;
      void persistSettings(valid ? nextSub.trim().toLowerCase() : subdomain, nextSeo);
    }, 600);
  }

  async function saveVisibility() {
    setPwState("saving");
    setPwNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibility: {
            mode: visibilityMode,
            launchAt: visibilityMode === "coming_soon" && launchAt ? new Date(launchAt).toISOString() : null,
            message: visibilityMode === "coming_soon" || visibilityMode === "paused" ? visibilityMessage.trim() || null : null,
          },
          ...(visibilityMode === "private" && newPassword.trim() ? { sitePassword: newPassword.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not save visibility.");
      setPasswordSet(Boolean(data.sitePasswordSet));
      setNewPassword("");
      setPwState("saved");
      setPwNote(data.message ?? "Visibility saved. Draft changes were not published.");
    } catch (error) {
      setPwState("error");
      setPwNote(error instanceof Error ? error.message : "Could not save visibility.");
    }
  }

  async function addDomain() {
    if (domainBusy) return;
    const hostname = customDomainInput.trim();
    if (!hostname) {
      setDomainNote("Enter your domain, e.g. maylecor.com");
      return;
    }
    if (!subdomain.trim()) {
      setDomainNote("Set a Kebu site address (subdomain) first.");
      return;
    }
    setDomainBusy(true);
    setDomainNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/domains`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname, isPrimary: true, provider: "manual" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDomainNote(typeof data.error === "string" ? data.error : "Could not save domain.");
        return;
      }
      if (data.domain) {
        setCustomDomains((prev) => [data.domain, ...prev.filter((d) => d.id !== data.domain.id)]);
      }
      setDomainNote(data.message ?? "Domain saved. Update DNS at your registrar, then verify.");
      setCustomDomainInput("");
      if (data.domain?.id) void verifyDomain(data.domain.id as string);
    } catch {
      setDomainNote("Network error.");
    } finally {
      setDomainBusy(false);
    }
  }

  async function verifyDomain(domainId: string, list = customDomains) {
    if (domainBusy) return;
    setDomainBusy(true);
    setDomainNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/domains/${domainId}/verify`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDomainNote(typeof data.error === "string" ? data.error : "Verify failed.");
        return;
      }
      if (data.domain) {
        setCustomDomains((prev) => prev.map((d) => (d.id === domainId ? { ...d, ...data.domain } : d)));
      }
      if (data.liveUrl) setHttpsLiveUrl(data.liveUrl);
      if (data.ok) {
        setDomainNote(
          [data.sslNote || data.detail, data.hostingOk === false ? "Custom domain may still error until hosting finishes." : null]
            .filter(Boolean)
            .join(" · ") || "DNS OK.",
        );
      } else {
        setDomainNote(
          (data.detail as string) ||
            `At your registrar: CNAME host www → value ${canonicalDns}. Wait 5–30 min, then Verify again.`,
        );
      }
    } catch {
      setDomainNote("Network error.");
    } finally {
      setDomainBusy(false);
    }
  }

  async function removeDomain(domainId: string) {
    if (domainBusy) return;
    setDomainBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/domains`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDomainNote(typeof data.error === "string" ? data.error : "Could not remove.");
        return;
      }
      setCustomDomains((prev) => prev.filter((d) => d.id !== domainId));
      setDomainNote("Domain removed.");
    } finally {
      setDomainBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm opacity-60 p-6">Loading site settings…</p>;
  }

  if (error) {
    return (
      <p className="text-sm p-6" style={{ color: KEBU.errorText }}>
        {error}{" "}
        <button type="button" className="underline font-bold" onClick={() => void load()}>
          Retry
        </button>
      </p>
    );
  }

  return (
    <div className={embedded ? "space-y-3 p-3" : "max-w-2xl space-y-8"}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] mb-1" style={{ color: KEBU.orange }}>
          {title}
        </p>
        <h2 className={embedded ? "text-lg font-black mb-1" : "text-2xl font-bold mb-2"} style={{ fontFamily: "var(--font-fraunces)" }}>
          Domain &amp; SEO
        </h2>
        <p className={embedded ? "text-[10px] leading-relaxed" : "text-sm"} style={{ color: KEBU.muted }}>
          Manage the site address, custom domain, search appearance, social sharing and privacy without leaving Builder.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {httpsLiveUrl ? (
            <a
              href={httpsLiveUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-4 py-2 text-xs font-bold border"
              style={{ borderColor: KEBU.border }}
            >
              View live site
            </a>
          ) : null}
        </div>
      </div>

      <section className="rounded-2xl p-5 space-y-4 bg-white border" style={{ borderColor: KEBU.border }}>
        <h3 className="text-sm font-bold uppercase tracking-wider">Kebu site address</h3>
        <p className="text-xs" style={{ color: KEBU.muted }}>
          Free address on Kebu: <strong>{livePath ?? "/sites/your-name"}</strong>
          {livePath && appOrigin ? ` — ${appOrigin}${livePath}` : ""}
        </p>
        <label className="block text-[10px] uppercase tracking-wider">
          Subdomain slug
          <input
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={subdomain}
            onChange={(e) => queueSave({ subdomain: e.target.value.toLowerCase() })}
            placeholder="maylecor"
          />
        </label>
      </section>

      <section className="rounded-2xl p-5 space-y-4 bg-white border" style={{ borderColor: KEBU.border }}>
        <h3 className="text-sm font-bold uppercase tracking-wider">Your own domain</h3>
        <p className="text-[11px]" style={{ color: KEBU.muted }}>
          Type the domain for <strong>this</strong> site (e.g. <strong>k-direction.com</strong>). You only change DNS at
          your registrar — Kebu attaches hosting and HTTPS for you (like Shopify). No hosting account needed.
        </p>
        <DomainConnectWizard
          subdomain={subdomain}
          livePath={livePath}
          appOrigin={appOrigin}
          customDomainInput={customDomainInput}
          onDomainInputChange={setCustomDomainInput}
          onConnect={() => void addDomain()}
          onVerify={(id) => void verifyDomain(id)}
          onRemove={(id) => void removeDomain(id)}
          domains={customDomains.map((d) => ({ ...d, dns_target: canonicalDns }))}
          busy={domainBusy}
          note={domainNote}
          siteTitle={title}
        />
      </section>

      <section className="rounded-2xl p-5 space-y-4 bg-white border" style={{ borderColor: KEBU.border }}>
        <h3 className="text-sm font-bold uppercase tracking-wider">SEO &amp; sharing</h3>
        <p className="text-[11px] leading-relaxed" style={{ color: KEBU.muted }}>
          This is how Google and social apps understand your site. Fill these in, publish again, then ask Google to
          index <strong>https://www.yourdomain.com</strong>.
        </p>
        <label className="block text-[10px] uppercase tracking-wider">
          SEO title
          <input
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={seo.metaTitle}
            onChange={(e) => queueSave({ seo: { metaTitle: e.target.value } })}
            placeholder="May Lecor — music &amp; artist"
            maxLength={120}
          />
        </label>
        <label className="block text-[10px] uppercase tracking-wider">
          SEO description
          <textarea
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid ${KEBU.border}` }}
            rows={3}
            maxLength={320}
            value={seo.metaDescription}
            onChange={(e) => queueSave({ seo: { metaDescription: e.target.value } })}
            placeholder="One or two sentences people will see under your link in Google."
          />
        </label>
        <p className="text-[10px]" style={{ color: KEBU.muted }}>
          {seo.metaDescription.trim()
            ? `${seo.metaDescription.trim().length}/320 characters`
            : "If empty, Kebu writes a description from your page content when someone visits."}
        </p>
        <label className="block text-[10px] uppercase tracking-wider">
          Main keyword (what people search)
          <input
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={seo.focusKeyword}
            onChange={(e) => queueSave({ seo: { focusKeyword: e.target.value } })}
            placeholder="afrobeats singer senegal"
            maxLength={80}
          />
        </label>
        <label className="block text-[10px] uppercase tracking-wider">
          Extra keywords (optional)
          <input
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={seo.keywords}
            onChange={(e) => queueSave({ seo: { keywords: e.target.value } })}
            placeholder="music, live show, Dakar"
            maxLength={240}
          />
        </label>
        <SiteImageUpload
          projectId={projectId}
          kind="favicon"
          value={seo.faviconUrl}
          onChange={(url) => queueSave({ seo: { faviconUrl: url } })}
        />
        <SiteImageUpload
          projectId={projectId}
          kind="ogImage"
          value={seo.ogImageUrl}
          onChange={(url) => queueSave({ seo: { ogImageUrl: url } })}
          label="Social share image (1200×630 best)"
        />
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={Boolean(seo.noIndex)}
            onChange={(e) => queueSave({ seo: { noIndex: e.target.checked } })}
          />
          Hide from Google (noindex)
        </label>
      </section>

      <section className="rounded-2xl p-5 space-y-4 bg-white border" style={{ borderColor: KEBU.border }}>
        <h3 className="text-sm font-bold uppercase tracking-wider">Advanced SEO</h3>
        <p className="text-[11px] leading-relaxed" style={{ color: KEBU.muted }}>
          Helps Google show rich results (business card, products, breadcrumbs) — stronger than a basic Shopify theme
          out of the box.
        </p>
        <label className="block text-[10px] uppercase tracking-wider">
          Brand / site name
          <input
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={seo.siteName}
            onChange={(e) => queueSave({ seo: { siteName: e.target.value } })}
            placeholder={title || "Your brand"}
          />
        </label>
        <label className="block text-[10px] uppercase tracking-wider">
          Business type (for Google)
          <select
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={seo.businessType}
            onChange={(e) =>
              queueSave({ seo: { businessType: e.target.value as typeof seo.businessType } })
            }
          >
            <option value="Organization">Organization / brand</option>
            <option value="Person">Person / creator</option>
            <option value="MusicGroup">Music / artist</option>
            <option value="Store">Store / shop</option>
            <option value="LocalBusiness">Local business</option>
            <option value="Restaurant">Restaurant / food</option>
            <option value="ProfessionalService">Professional service</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-[10px] uppercase tracking-wider">
            City
            <input
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
              style={{ border: `1px solid ${KEBU.border}` }}
              value={seo.city}
              onChange={(e) => queueSave({ seo: { city: e.target.value } })}
              placeholder="Dakar"
            />
          </label>
          <label className="block text-[10px] uppercase tracking-wider">
            Country
            <input
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
              style={{ border: `1px solid ${KEBU.border}` }}
              value={seo.country}
              onChange={(e) => queueSave({ seo: { country: e.target.value } })}
              placeholder="Senegal"
            />
          </label>
        </div>
        <label className="block text-[10px] uppercase tracking-wider">
          Social / profile links (one per line)
          <textarea
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-mono"
            style={{ border: `1px solid ${KEBU.border}` }}
            rows={3}
            value={seo.sameAs}
            onChange={(e) => queueSave({ seo: { sameAs: e.target.value } })}
            placeholder={"https://instagram.com/you\nhttps://youtube.com/@you"}
          />
        </label>
        <label className="block text-[10px] uppercase tracking-wider">
          X / Twitter handle
          <input
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={seo.twitterHandle}
            onChange={(e) => queueSave({ seo: { twitterHandle: e.target.value } })}
            placeholder="@maylecor"
          />
        </label>
        <label className="block text-[10px] uppercase tracking-wider">
          Google Search Console verification
          <input
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-mono"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={seo.googleSiteVerification}
            onChange={(e) => queueSave({ seo: { googleSiteVerification: e.target.value } })}
            placeholder="Paste the content= value from Google"
          />
        </label>
        <p className="text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>
          After publish: open <strong>/sitemap.xml</strong> and <strong>/robots.txt</strong> on your live domain, then
          submit the sitemap in Google Search Console. Re-publish after SEO edits so the live site updates.
        </p>
        <p className="text-[10px]" style={{ color: KEBU.muted }}>
          {settingsState === "saving" ? "Saving…" : settingsState === "saved" ? settingsNote : settingsNote ?? "Autosaves"}
        </p>
      </section>

      <section className="rounded-2xl p-5 space-y-4 bg-white border" style={{ borderColor: KEBU.border }}>
        <h3 className="text-sm font-bold uppercase tracking-wider">Site visibility</h3>
        <p className="text-xs" style={{ color: KEBU.muted }}>
          Choose what visitors see. Saving your draft in Builder never changes the published version.
        </p>
        <label className="block space-y-1 text-sm">
          <span>Visitor access</span>
          <select className="w-full rounded-lg border p-2" value={visibilityMode} disabled={pwState === "saving"}
            onChange={(e) => setVisibilityMode(e.target.value as SiteVisibilityMode)}>
            {SITE_VISIBILITY_MODES.map((mode) => <option key={mode} value={mode}>
              {{ public: "Public site", private: "Private preview · password", coming_soon: "Coming soon", paused: "Temporarily unavailable" }[mode]}
            </option>)}
          </select>
        </label>
        {visibilityMode === "public" && !published && <p className="text-xs">Publish your first version when it’s ready. Until then, the public site stays unpublished.</p>}
        {visibilityMode === "private" && (
          <label className="block space-y-1 text-sm">
            <span>{passwordSet ? "New password (optional)" : "Visitor password"}</span>
            <input type="password" autoComplete="new-password" maxLength={128} className="w-full rounded-lg border p-2"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <span className="block text-xs">Guests can view the published version after entering the password. Checkout stays closed.</span>
          </label>
        )}
        {(visibilityMode === "coming_soon" || visibilityMode === "paused") && (
          <label className="block space-y-1 text-sm">
            <span>Message to visitors (optional)</span>
            <textarea className="w-full rounded-lg border p-2" maxLength={240} value={visibilityMessage}
              onChange={(e) => setVisibilityMessage(e.target.value)} />
          </label>
        )}
        {visibilityMode === "coming_soon" && (
          <label className="block space-y-1 text-sm">
            <span>Launch time in your device’s time zone (optional)</span>
            <input type="datetime-local" disabled={!published} className="block rounded-lg border p-2" value={launchAt}
              onChange={(e) => setLaunchAt(e.target.value)} />
            <span className="block text-xs">{published ? "The countdown reveals the last version you published. Saved drafts stay private." : "Publish an approved version while Coming soon is active to schedule when it opens."}</span>
          </label>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: KEBU.orange }} disabled={pwState === "saving" || (visibilityMode === "private" && !passwordSet && !newPassword.trim())}
            onClick={() => void saveVisibility()}>{pwState === "saving" ? "Saving…" : "Save visibility"}</button>
          {subdomain && <a href={`/sites/${subdomain}`} target="_blank" rel="noreferrer" className="text-sm underline">Open visitor view</a>}
        </div>
        {pwNote && <p role={pwState === "error" ? "alert" : "status"} className="text-sm">{pwNote}</p>}
      </section>
    </div>
  );
}
