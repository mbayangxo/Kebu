"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type SiteDomain = {
  id: string;
  hostname: string;
  is_primary: boolean;
};
type MailDomain = {
  id: string;
  domain: string;
  status: "pending" | "verified" | "failed";
  dns_records: Array<Record<string, unknown>>;
  last_error: string | null;
};
type BusinessMailbox = {
  id: string;
  address: string;
  display_name: string;
};

type BusinessMailState = {
  context: {
    businessId: string;
    businessName: string;
    role: string;
    canManage: boolean;
  };
  siteDomains: SiteDomain[];
  mailDomains: MailDomain[];
  mailboxes: BusinessMailbox[];
};

export function BusinessMailSetup({ onMailboxCreated }: { onMailboxCreated?: () => void }) {
  const [state, setState] = useState<BusinessMailState | null>(null);
  const [siteDomainId, setSiteDomainId] = useState("");
  const [mailDomainId, setMailDomainId] = useState("");
  const [localPart, setLocalPart] = useState("hello");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/mail/business", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Could not load business mail setup."); return; }
    const next = data as BusinessMailState;
    setState(next);
    setSiteDomainId((current) => current || next.siteDomains[0]?.id || "");
    setMailDomainId((current) => current || next.mailDomains[0]?.id || "");
    setDisplayName((current) => current || next.context.businessName || "Business");
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectedMailDomain = useMemo(
    () => state?.mailDomains.find((domain) => domain.id === mailDomainId) ?? null,
    [mailDomainId, state?.mailDomains],
  );

  async function action(payload: Record<string, unknown>, key: string) {
    if (busy) return;
    setBusy(key);
    setError(null);
    const res = await fetch("/api/mail/business", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(data.error || "Business mail setup failed."); return; }
    await load();
    if (payload.action === "create_mailbox") onMailboxCreated?.();
  }

  if (!state && !error) return <p className="text-[10px]" style={{ color: KEBU.muted }}>Loading business mail…</p>;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>Business Mail</p>
        <h2 className="mt-1 text-lg font-black">{state?.context.businessName ?? "Business Kebu"}</h2>
        <p className="mt-1 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>
          Business email is separate from your personal @kebu.africa mailbox and only appears inside this Business Kebu.
        </p>
      </div>

      {error ? <div className="rounded-xl border px-3 py-2 text-[10px]" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>{error}</div> : null}

      {!state?.context.canManage ? (
        <div className="rounded-xl bg-black/[.03] p-3 text-[10px]" style={{ color: KEBU.muted }}>
          You can use business mailboxes you have access to, but your role cannot change mail domains or create addresses.
        </div>
      ) : (
        <>
          <section className="rounded-[16px] border p-3" style={{ borderColor: KEBU.borders.default }}>
            <p className="text-[10px] font-black">1. Connect a verified business domain</p>
            {state.siteDomains.length ? (
              <div className="mt-2 flex gap-2">
                <select value={siteDomainId} onChange={(event) => setSiteDomainId(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-xl border bg-white px-3 text-[10px] font-bold" style={{ borderColor: KEBU.borders.default }}>
                  {state.siteDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.hostname}</option>)}
                </select>
                <button type="button" disabled={!siteDomainId || Boolean(busy)} onClick={() => void action({ action: "register_domain", siteDomainId }, "domain")} className="rounded-xl bg-black px-3 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-35">{busy === "domain" ? "Connecting…" : "Use for Mail"}</button>
              </div>
            ) : (
              <p className="mt-2 text-[10px]" style={{ color: KEBU.muted }}>No verified custom domain is attached to a site in this business yet. Verify the site domain first.</p>
            )}
          </section>

          {state.mailDomains.length ? (
            <section className="rounded-[16px] border p-3" style={{ borderColor: KEBU.borders.default }}>
              <div className="flex items-center justify-between gap-2">
                <div><p className="text-[10px] font-black">2. Verify mail DNS</p><p className="text-[9px]" style={{ color: KEBU.muted }}>MX, SPF and DKIM come from the mail provider.</p></div>
                <select value={mailDomainId} onChange={(event) => setMailDomainId(event.target.value)} className="rounded-lg border bg-white px-2 py-1.5 text-[9px] font-bold" style={{ borderColor: KEBU.borders.default }}>
                  {state.mailDomains.map((domain) => <option key={domain.id} value={domain.id}>{domain.domain} · {domain.status}</option>)}
                </select>
              </div>
              {selectedMailDomain ? (
                <>
                  <div className="mt-3 space-y-1.5">
                    {selectedMailDomain.dns_records.length ? selectedMailDomain.dns_records.map((record, index) => (
                      <div key={index} className="grid gap-1 rounded-xl bg-black/[.025] p-2.5 text-[9px] sm:grid-cols-[70px_1fr_1.2fr]">
                        <span className="font-black uppercase">{String(record.type ?? record.record ?? "DNS")}</span>
                        <span className="break-all" style={{ color: KEBU.muted }}>{String(record.name ?? "")}</span>
                        <span className="break-all">{String(record.value ?? "")}</span>
                      </div>
                    )) : <p className="text-[9px]" style={{ color: KEBU.muted }}>Provider DNS records will appear here after the domain is registered.</p>}
                  </div>
                  <button type="button" disabled={Boolean(busy)} onClick={() => void action({ action: "verify_domain", mailDomainId: selectedMailDomain.id }, "verify")} className="mt-3 rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.borders.default }}>{busy === "verify" ? "Checking…" : "Check DNS"}</button>
                </>
              ) : null}
            </section>
          ) : null}

          {selectedMailDomain?.status === "verified" ? (
            <section className="rounded-[16px] border p-3" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[10px] font-black">3. Create the business address</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="flex min-h-10 items-center rounded-xl border bg-white" style={{ borderColor: KEBU.borders.default }}>
                  <input value={localPart} onChange={(event) => setLocalPart(event.target.value)} placeholder="hello" className="min-w-0 flex-1 bg-transparent px-3 text-[10px] font-bold outline-none" />
                  <span className="pr-3 text-[9px]" style={{ color: KEBU.muted }}>@{selectedMailDomain.domain}</span>
                </div>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" className="min-h-10 rounded-xl border bg-white px-3 text-[10px] font-bold outline-none" style={{ borderColor: KEBU.borders.default }} />
              </div>
              <button type="button" disabled={!localPart.trim() || !displayName.trim() || Boolean(busy)} onClick={() => void action({ action: "create_mailbox", mailDomainId: selectedMailDomain.id, localPart, displayName }, "mailbox")} className="mt-3 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-35" style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}>{busy === "mailbox" ? "Creating…" : "Create business email →"}</button>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
