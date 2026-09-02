"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";
import { customDomainDnsTarget, normalizeHostname, validateCustomHostname } from "@/lib/create/dns-target";

export default function KebuDomainsPage() {
  const [query, setQuery] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    hostname: string;
    available: boolean | null;
    message: string;
  } | null>(null);

  const canonicalCname = customDomainDnsTarget();

  async function checkDomain() {
    const hostname = normalizeHostname(query);
    const valid = validateCustomHostname(hostname);
    if (!valid.ok) {
      setResult({ hostname, available: null, message: valid.error });
      return;
    }
    setChecking(true);
    setResult(null);
    try {
      const res = await fetch("/api/kebu-domains/search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        available?: boolean;
        message?: string;
        hostname?: string;
      };
      setResult({
        hostname: data.hostname ?? hostname,
        available: typeof data.available === "boolean" ? data.available : null,
        message: data.message ?? "Could not check availability.",
      });
    } catch {
      setResult({ hostname, available: null, message: "Network error. Try again." });
    } finally {
      setChecking(false);
    }
  }

  return (
    <AppShell title="Kebu Domains">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-2" style={{ color: KEBU.orange }}>
            Kebu Domains
          </p>
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>
            Your domain, inside Kebu
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: KEBU.muted }}>
            Search a name, connect one you already own, or attach it to a site. Connecting a domain you own works today
            (DNS + HTTPS). Buying a new domain inside Kebu checkout is still rolling out — names are often about $5+/year
            at a registrar.
          </p>
        </div>

        <section className="rounded-2xl p-6 bg-white border space-y-4" style={{ borderColor: KEBU.border }}>
          <h2 className="text-sm font-bold uppercase tracking-wider">Search a domain</h2>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl px-4 py-3 text-sm"
              style={{ border: `1px solid ${KEBU.border}` }}
              placeholder="maylecor.com"
              value={query}
              onChange={(e) => setQuery(e.target.value.toLowerCase())}
              onKeyDown={(e) => e.key === "Enter" && void checkDomain()}
            />
            <button
              type="button"
              disabled={checking || !query.trim()}
              onClick={() => void checkDomain()}
              className="rounded-full px-6 py-3 text-xs font-bold uppercase text-white disabled:opacity-50"
              style={{ background: KEBU.orange }}
            >
              {checking ? "Checking…" : "Search"}
            </button>
          </div>
          {result ? (
            <div className="rounded-xl p-4 text-sm" style={{ background: KEBU.cream }}>
              <p className="font-bold">{result.hostname}</p>
              <p className="mt-2" style={{ color: KEBU.muted }}>
                {result.message}
              </p>
              {result.available === true ? (
                <p className="mt-3 text-xs">
                  Domain purchase checkout in Kebu is not live yet (~$5+/year at most registrars). Buy the name
                  elsewhere, then connect it in{" "}
                  <Link href="/create/sites" className="font-bold underline" style={{ color: KEBU.orange }}>
                    My sites → Domain &amp; SEO
                  </Link>
                  . Connecting + HTTPS on Kebu is what works end-to-end today.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl p-6 bg-white border space-y-3" style={{ borderColor: KEBU.border }}>
          <h2 className="text-sm font-bold uppercase tracking-wider">Already own a domain?</h2>
          <p className="text-sm" style={{ color: KEBU.muted }}>
            Open <strong>My sites</strong>, pick your site, and connect the domain there. Use this CNAME at your
            registrar:
          </p>
          <div className="rounded-xl p-4 font-mono text-sm" style={{ background: KEBU.black, color: KEBU.white }}>
            <p>
              <span style={{ color: KEBU.orange }}>www</span> CNAME → <strong>{canonicalCname}</strong>
            </p>
          </div>
          <p className="text-xs" style={{ color: KEBU.muted }}>
            Do not point DNS at kebu.africa — that zone is not live yet.
          </p>
          <Link
            href="/create/sites"
            className="inline-flex rounded-full px-6 py-3 text-xs font-bold uppercase text-white"
            style={{ background: KEBU.black }}
          >
            Go to My sites
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
