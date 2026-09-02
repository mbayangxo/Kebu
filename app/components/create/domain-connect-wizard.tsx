"use client";

import { useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { customDomainDnsTarget, isObsoleteDnsTarget, normalizeHostname } from "@/lib/create/dns-target";

type DomainRow = {
  id: string;
  hostname: string;
  status: string;
  dns_target?: string | null;
  last_error?: string | null;
};

/**
 * Connect a custom domain to THIS site.
 * Domain input is always first — CNAME instructions follow after you type it.
 */
export function DomainConnectWizard({
  subdomain,
  livePath,
  appOrigin,
  customDomainInput,
  onDomainInputChange,
  onConnect,
  onVerify,
  onRemove,
  domains,
  busy,
  note,
  siteTitle,
}: {
  subdomain: string;
  livePath: string | null;
  appOrigin?: string;
  customDomainInput: string;
  onDomainInputChange: (v: string) => void;
  onConnect: () => void;
  onVerify: (domainId: string) => void;
  onRemove: (domainId: string) => void;
  domains: DomainRow[];
  busy: boolean;
  note: string | null;
  /** Helps users know which project this domain attaches to */
  siteTitle?: string;
}) {
  const [open, setOpen] = useState(true);
  const target = customDomainDnsTarget(subdomain || "site");
  const typed = normalizeHostname(customDomainInput);
  const exampleHost = typed || domains[0]?.hostname || "kdirection.com";
  const fullLiveUrl =
    livePath && appOrigin ? `${appOrigin.replace(/\/$/, "")}${livePath}` : livePath;

  useEffect(() => {
    if (domains.length > 0) setOpen(true);
  }, [domains.length]);

  if (!open) {
    return (
      <div className="rounded-xl p-3" style={{ background: "#F8F7F4", border: "1px solid #E8E4DC" }}>
        <p className="text-[11px] leading-relaxed mb-2" style={{ color: "#6B5B45" }}>
          Your site works on Kebu{fullLiveUrl ? ` at ${fullLiveUrl}` : ""}. Connect a custom domain when you own one.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[10px] font-bold uppercase tracking-wider underline"
          style={{ color: KEBU.orange }}
        >
          Connect my domain
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-4 space-y-4" style={{ background: "#F8F7F4", border: "1px solid #E8E4DC" }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: KEBU.orange }}>
            Custom domain for this site
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
            {siteTitle ? `${siteTitle}` : "Your domain"}
          </p>
          <p className="text-[11px] mt-1" style={{ color: "#6B5B45" }}>
            Enter the domain you bought for <strong>this</strong> site (e.g. kdirection.com). Each site gets its own
            domain. You only edit DNS at your registrar — Kebu turns on HTTPS automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] font-bold uppercase shrink-0"
          style={{ color: KEBU.muted }}
        >
          Hide
        </button>
      </div>

      {!subdomain.trim() ? (
        <p className="text-[11px] rounded-lg px-3 py-2" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
          Set a Kebu site address (subdomain) above first — e.g. <strong>kdirection</strong> — then connect the domain.
        </p>
      ) : null}

      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.black }}>
          Domain you own (no www)
        </span>
        <div className="mt-1.5 flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 rounded-lg px-3 py-2.5 text-sm font-mono"
            style={{ border: `2px solid ${KEBU.black}`, background: KEBU.white }}
            value={customDomainInput}
            onChange={(e) => onDomainInputChange(e.target.value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))}
            placeholder="kdirection.com"
            autoComplete="off"
            spellCheck={false}
            disabled={busy || !subdomain.trim()}
            aria-label="Custom domain hostname"
          />
          <button
            type="button"
            onClick={onConnect}
            disabled={busy || !subdomain.trim() || !typed}
            className="rounded-full px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 shrink-0"
            style={{ background: KEBU.orange, color: "#fff" }}
          >
            {busy ? "Saving…" : "Save on this site"}
          </button>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: KEBU.muted }}>
          Example: <strong>kdirection.com</strong> or <strong>maylecor.com</strong> — not www, not a path.
        </p>
      </label>

      <div className="rounded-lg p-3 space-y-2" style={{ background: KEBU.white, border: "1px solid #DDE0F0" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.black }}>
          Then at your registrar, add this CNAME
        </p>
        <div className="font-mono text-[11px] space-y-1">
          <p>
            <span style={{ color: "#8A8578" }}>Type:</span> CNAME
          </p>
          <p>
            <span style={{ color: "#8A8578" }}>Host / Name:</span> www
          </p>
          <p>
            <span style={{ color: "#8A8578" }}>Value / Points to:</span>{" "}
            <strong style={{ color: KEBU.orange }}>{target}</strong>
          </p>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: "#6B5B45" }}>
          For <strong>{exampleHost}</strong> (no www), redirect to{" "}
          <strong>https://www.{exampleHost}</strong>. Same CNAME value for every Kebu site — Kebu uses the domain you
          saved to open the right project and issue HTTPS. You do not need a hosting login.
        </p>
      </div>

      {domains.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider">Saved on this site</p>
          {domains.map((d) => (
            <div key={d.id} className="rounded-lg p-3 text-[11px]" style={{ background: KEBU.white, border: "1px solid #DDE0F0" }}>
              <p className="font-semibold text-sm" style={{ color: KEBU.black }}>
                www.{d.hostname}{" "}
                <span
                  style={{
                    color:
                      d.status === "verified" ? "#009E40" : d.status === "failed" ? "#8B1E1E" : "#8A8578",
                  }}
                >
                  · {d.status}
                </span>
              </p>
              <p className="mt-1 font-mono text-[10px]" style={{ color: "#5C5348" }}>
                CNAME www → <strong style={{ color: KEBU.orange }}>{target}</strong>
              </p>
              {d.dns_target && isObsoleteDnsTarget(d.dns_target) ? (
                <p className="mt-1" style={{ color: "#8B1E1E" }}>
                  Old target {d.dns_target} is wrong — use {target}, then Verify.
                </p>
              ) : null}
              {d.last_error ? (
                <p className="mt-1" style={{ color: "#8B1E1E" }}>
                  {d.last_error.toLowerCase().includes("kebu.africa")
                    ? `Use CNAME www → ${target}, then Verify again.`
                    : d.last_error}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onVerify(d.id)}
                  disabled={busy}
                  className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase disabled:opacity-50"
                  style={{ background: "#00C851", color: "#0F0D33" }}
                >
                  Verify DNS
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(d.id)}
                  disabled={busy}
                  className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase"
                  style={{ background: "#F4F2EC", color: "#8B1E1E" }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {note ? (
        <p
          className="text-[11px]"
          style={{ color: note.toLowerCase().includes("verified") || note.includes("Copied") ? "#009E40" : "#6B5B45" }}
        >
          {note}
        </p>
      ) : null}

      {fullLiveUrl ? (
        <p className="text-[10px]" style={{ color: KEBU.muted }}>
          Without a custom domain, this site stays live at {fullLiveUrl}.
        </p>
      ) : null}
    </div>
  );
}
