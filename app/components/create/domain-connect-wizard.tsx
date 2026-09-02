"use client";

import { useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { customDomainDnsTarget, isObsoleteDnsTarget } from "@/lib/create/dns-target";

type DomainRow = {
  id: string;
  hostname: string;
  status: string;
  dns_target?: string | null;
  last_error?: string | null;
};

export function DomainConnectWizard({
  subdomain,
  livePath,
  appOrigin,
  dnsTarget,
  customDomainInput,
  onDomainInputChange,
  onConnect,
  onVerify,
  onRemove,
  domains,
  busy,
  note,
}: {
  subdomain: string;
  livePath: string | null;
  appOrigin?: string;
  dnsTarget: string | null;
  customDomainInput: string;
  onDomainInputChange: (v: string) => void;
  onConnect: () => void;
  onVerify: (domainId: string) => void;
  onRemove: (domainId: string) => void;
  domains: DomainRow[];
  busy: boolean;
  note: string | null;
}) {
  const [open, setOpen] = useState(domains.length > 0);
  const [step, setStep] = useState(0);
  const target = customDomainDnsTarget(subdomain || "site");
  const hostname = customDomainInput.trim() || domains[0]?.hostname || "yourbrand.com";
  const fullLiveUrl =
    livePath && appOrigin ? `${appOrigin.replace(/\/$/, "")}${livePath}` : livePath;

  if (!open) {
    return (
      <div className="rounded-xl p-3" style={{ background: "#F8F7F4", border: "1px solid #E8E4DC" }}>
        <p className="text-[11px] leading-relaxed mb-2" style={{ color: "#6B5B45" }}>
          <strong>You do not need a custom domain.</strong> Publish with a subdomain above — your site works on Kebu
          hosting{fullLiveUrl ? ` at ${fullLiveUrl}` : ""}. Skip this unless you already bought a domain like{" "}
          maylecor.com.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[10px] font-bold uppercase tracking-wider underline"
          style={{ color: KEBU.orange }}
        >
          I own a domain — connect it (optional)
        </button>
      </div>
    );
  }

  const steps = [
    {
      title: "Your site already works without this",
      body: (
        <>
          <p className="mb-2">
            After <strong>Publish</strong>, visitors open{" "}
            <strong>{fullLiveUrl ?? livePath ?? "/sites/your-name"}</strong> on Kebu. No domain purchase required.
          </p>
          <p className="text-[10px]" style={{ color: "#8A8578" }}>
            Custom domains (e.g. maylecor.com) connect here. Do <strong>not</strong> point DNS at kebu.africa — that
            address is not live.
          </p>
        </>
      ),
    },
    {
      title: "Buy a domain (only if you don't have one)",
      body: (
        <p>
          Purchase <strong>{hostname}</strong> from any registrar — GoDaddy, Cloudflare, Namecheap, etc. If you have not
          bought a domain yet, close this section and just use Publish.
        </p>
      ),
    },
    {
      title: "Open DNS at your registrar",
      body: (
        <p>
          Log in where you bought the domain → find <strong>DNS</strong> or <strong>Advanced DNS</strong>. Remove any
          &quot;parking&quot; or placeholder records for <strong>www</strong> (common on new domains).
        </p>
      ),
    },
    {
      title: "Add this CNAME record",
      body: (
        <div className="rounded-lg p-3 font-mono text-[11px] space-y-1" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
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
          <p>
            <span style={{ color: "#8A8578" }}>TTL:</span> Automatic (or 300)
          </p>
        </div>
      ),
    },
    {
      title: "Redirect the bare domain",
      body: (
        <p>
          For <strong>{hostname}</strong> (without www), set a <strong>URL redirect</strong> to{" "}
          <strong>https://www.{hostname}</strong>. Some registrars call this forwarding or ALIAS/ANAME.
        </p>
      ),
    },
    {
      title: "Connect in Kebu & verify",
      body: (
        <div className="space-y-3">
          <label className="block text-[10px] uppercase tracking-wider">
            Domain you own (no www)
            <input
              className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs font-normal normal-case"
              style={{ border: "1px solid #DDE0F0" }}
              value={customDomainInput}
              onChange={(e) => onDomainInputChange(e.target.value.toLowerCase())}
              placeholder="maylecor.com"
            />
          </label>
          <button
            type="button"
            onClick={onConnect}
            disabled={busy || !subdomain.trim()}
            className="w-full rounded-full py-2 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
            style={{ background: KEBU.orange, color: "#fff" }}
          >
            {busy ? "Saving…" : "Save domain in Kebu"}
          </button>
          {domains.map((d) => (
            <div key={d.id} className="rounded-lg p-2 text-[10px]" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
              <p className="font-semibold">
                www.{d.hostname}{" "}
                <span style={{ color: d.status === "verified" ? "#009E40" : d.status === "failed" ? "#8B1E1E" : "#8A8578" }}>
                  · {d.status}
                </span>
              </p>
              <p className="mt-1 font-mono text-[10px]" style={{ color: "#5C5348" }}>
                CNAME www → <strong style={{ color: KEBU.orange }}>{target}</strong>
                <span className="block font-sans normal-case mt-0.5 opacity-70">
                  Vercel deployment URLs (*.vercel.app) also work.
                </span>
              </p>
              {d.dns_target && isObsoleteDnsTarget(d.dns_target) ? (
                <p className="mt-1" style={{ color: "#8B1E1E" }}>
                  Old target {d.dns_target} is wrong — use {target} or your Vercel app URL, then Verify.
                </p>
              ) : null}
              {d.last_error ? (
                <p className="mt-1" style={{ color: "#8B1E1E" }}>
                  {d.last_error.toLowerCase().includes("kebu.africa")
                    ? `DNS may already be correct. Use CNAME www → ${target} or your Vercel *.vercel.app hostname, then click Verify again.`
                    : d.last_error}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onVerify(d.id)}
                  disabled={busy}
                  className="rounded-full px-3 py-1 text-[10px] font-bold uppercase disabled:opacity-50"
                  style={{ background: "#00C851", color: "#0F0D33" }}
                >
                  Verify DNS
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(d.id)}
                  disabled={busy}
                  className="rounded-full px-3 py-1 text-[10px] font-bold uppercase"
                  style={{ background: "#F4F2EC", color: "#8B1E1E" }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <p className="text-[10px]" style={{ color: "#6B5B45" }}>
            Wait 5–30 minutes after changing DNS, then click Verify. When verified, your site opens at{" "}
            <strong>https://www.{domains[0]?.hostname ?? hostname}</strong>.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-xl p-3 space-y-3" style={{ background: "#F8F7F4", border: "1px solid #E8E4DC" }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider">Optional — your own domain</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] font-bold uppercase"
          style={{ color: KEBU.muted }}
        >
          Hide
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold" style={{ color: KEBU.orange }}>
          Step {step + 1} / {steps.length}
        </span>
      </div>
      <div className="flex gap-1">
        {steps.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className="h-1 flex-1 rounded-full transition-all"
            style={{ background: i <= step ? KEBU.orange : "#E8E4DC" }}
            aria-label={`Step ${i + 1}`}
          />
        ))}
      </div>
      <div className="text-[11px] leading-relaxed" style={{ color: "#6B5B45" }}>
        <p className="font-bold mb-2 text-sm" style={{ color: "#0F0D33", fontFamily: "var(--font-fraunces)" }}>
          {steps[step]?.title}
        </p>
        {steps[step]?.body}
      </div>
      <div className="flex justify-between gap-2">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="rounded-full px-4 py-1.5 text-[10px] font-bold uppercase disabled:opacity-40"
          style={{ border: "1px solid #DDE0F0" }}
        >
          Back
        </button>
        <button
          type="button"
          disabled={step >= steps.length - 1}
          onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
          className="rounded-full px-4 py-1.5 text-[10px] font-bold uppercase disabled:opacity-40"
          style={{ background: "#0F0D33", color: "#fff" }}
        >
          Next
        </button>
      </div>
      {note ? (
        <p className="text-[10px]" style={{ color: note.includes("verified") || note.includes("Copied") ? "#009E40" : "#6B5B45" }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
