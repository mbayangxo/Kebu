"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DomainConnectWizard } from "@/app/components/create/domain-connect-wizard";
import { SiteImageUpload } from "@/app/components/create/site-image-upload";
import { KEBU } from "@/lib/kebu-brand";
import { customDomainDnsTarget } from "@/lib/create/dns-target";
import { defaultSiteSeo, type SiteSeo } from "@/lib/create/site-seo";
import { liveSiteUrl, kebuSitePreviewPath } from "@/lib/create/site-urls";

type DomainRow = {
  id: string;
  hostname: string;
  status: string;
  dns_target?: string | null;
  last_error?: string | null;
};

export function SiteDomainSeoPanel({ projectId }: { projectId: string }) {
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
      setDomainNote(
        [data.detail, data.sslNote].filter(Boolean).join(" · ") ||
          (data.ok ? "Domain verified!" : "DNS not ready yet — use CNAME www → cname.vercel-dns.com"),
      );
      if (!data.ok && list.length) {
        setDomainNote(
          (data.detail as string) ||
            `At Namecheap: CNAME host www → value ${canonicalDns}. Vercel app URLs also work. Wait 5–30 min, then Verify again.`,
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
    <div className="max-w-2xl space-y-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] mb-1" style={{ color: KEBU.orange }}>
          {title}
        </p>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          Domain &amp; SEO
        </h2>
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Connect your own domain (e.g. maylecor.com). Kebu handles SSL — you only paste one CNAME at your
          your registrar.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            href={`/create/${projectId}`}
            className="rounded-full px-4 py-2 text-xs font-bold text-white"
            style={{ background: KEBU.black }}
          >
            Open visual editor
          </Link>
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
        <div
          className="rounded-xl p-3 font-mono text-xs space-y-1"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p>
            <span style={{ color: KEBU.muted }}>Type:</span> CNAME
          </p>
          <p>
            <span style={{ color: KEBU.muted }}>Host:</span> www
          </p>
          <p>
            <span style={{ color: KEBU.muted }}>Value:</span>{" "}
            <strong style={{ color: KEBU.orange }}>{canonicalDns}</strong>
          </p>
        </div>
        <p className="text-[11px]" style={{ color: KEBU.muted }}>
          At your registrar (e.g. Namecheap): CNAME <strong>www</strong> → <strong>{canonicalDns}</strong>. A Vercel
          deployment hostname as the value is OK.
        </p>
        <DomainConnectWizard
          subdomain={subdomain}
          livePath={livePath}
          appOrigin={appOrigin}
          dnsTarget={canonicalDns}
          customDomainInput={customDomainInput}
          onDomainInputChange={setCustomDomainInput}
          onConnect={() => void addDomain()}
          onVerify={(id) => void verifyDomain(id)}
          onRemove={(id) => void removeDomain(id)}
          domains={customDomains.map((d) => ({ ...d, dns_target: canonicalDns }))}
          busy={domainBusy}
          note={domainNote}
        />
      </section>

      <section className="rounded-2xl p-5 space-y-4 bg-white border" style={{ borderColor: KEBU.border }}>
        <h3 className="text-sm font-bold uppercase tracking-wider">SEO &amp; sharing</h3>
        <label className="block text-[10px] uppercase tracking-wider">
          SEO title
          <input
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={seo.metaTitle}
            onChange={(e) => queueSave({ seo: { metaTitle: e.target.value } })}
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
          label="Social share image"
        />
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={Boolean(seo.noIndex)}
            onChange={(e) => queueSave({ seo: { noIndex: e.target.checked } })}
          />
          Hide from Google (noindex)
        </label>
        <p className="text-[10px]" style={{ color: KEBU.muted }}>
          {settingsState === "saving" ? "Saving…" : settingsState === "saved" ? settingsNote : settingsNote ?? "Autosaves"}
        </p>
      </section>
    </div>
  );
}
