"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { defaultAgencyLaunchChecklist } from "@/lib/business/ops-docs";

type Tab = "invoices" | "contracts" | "launch";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  client_name: string;
  amount_xof: number;
  status: string;
  publicPath: string;
};

type ContractRow = {
  id: string;
  title: string;
  counterparty_name: string;
  status: string;
  publicPath: string;
};

type CheckItem = { id: string; label: string; done: boolean };

/**
 * Agency / services ops: invoices, contracts, launch popup strategy.
 * Shops keep using Shop admin for catalog — this is business-level.
 */
export function BusinessOpsPanel({ businessId }: { businessId: string }) {
  const [tab, setTab] = useState<Tab>("invoices");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [lineDesc, setLineDesc] = useState("");
  const [lineAmount, setLineAmount] = useState(50000);

  const [ctrTitle, setCtrTitle] = useState("");
  const [ctrParty, setCtrParty] = useState("");
  const [ctrEmail, setCtrEmail] = useState("");
  const [ctrBody, setCtrBody] = useState("");

  const [checklist, setChecklist] = useState<CheckItem[]>(defaultAgencyLaunchChecklist());
  const [popupHeading, setPopupHeading] = useState("We're launching soon");
  const [popupBody, setPopupBody] = useState("Leave your email for early access, tickets, or the drop.");
  const [popupCta, setPopupCta] = useState("Join the list");

  const loadInvoices = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/invoices`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load invoices.");
      return;
    }
    setInvoices((data.invoices ?? []) as InvoiceRow[]);
  }, [businessId]);

  const loadContracts = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/contracts`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load contracts.");
      return;
    }
    setContracts((data.contracts ?? []) as ContractRow[]);
  }, [businessId]);

  const loadLaunch = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/launch-plan`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load launch plan.");
      return;
    }
    if (data.plan) {
      setChecklist(Array.isArray(data.plan.checklist) ? data.plan.checklist : defaultAgencyLaunchChecklist());
      setPopupHeading(data.plan.popup_heading || "We're launching soon");
      setPopupBody(data.plan.popup_body || "Leave your email for early access.");
      setPopupCta(data.plan.popup_cta || "Join the list");
    } else if (data.defaults) {
      setChecklist(data.defaults.checklist);
      setPopupHeading(data.defaults.popupHeading);
      setPopupBody(data.defaults.popupBody);
      setPopupCta(data.defaults.popupCta);
    }
  }, [businessId]);

  useEffect(() => {
    setError(null);
    if (tab === "invoices") void loadInvoices();
    if (tab === "contracts") void loadContracts();
    if (tab === "launch") void loadLaunch();
  }, [tab, loadInvoices, loadContracts, loadLaunch]);

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/invoices`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientEmail,
          lines: [{ description: lineDesc || "Services", quantity: 1, unitAmountXof: lineAmount }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Create failed.");
        return;
      }
      setNote("Invoice drafted. Send to email a link (or share).");
      setClientName("");
      setClientEmail("");
      await loadInvoices();
    } finally {
      setBusy(false);
    }
  }

  async function sendInvoice(id: string) {
    setBusy(true);
    const res = await fetch(`/api/businesses/${businessId}/invoices`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", invoiceId: id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setNote(typeof data.message === "string" ? data.message : data.url || "Sent.");
    await loadInvoices();
  }

  async function markPaid(id: string) {
    await fetch(`/api/businesses/${businessId}/invoices`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: id, status: "paid" }),
    });
    await loadInvoices();
  }

  async function createContract(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/contracts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ctrTitle,
          counterpartyName: ctrParty,
          counterpartyEmail: ctrEmail,
          bodyText: ctrBody,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Create failed.");
        return;
      }
      setNote("Contract drafted. Send to share accept link.");
      setCtrTitle("");
      setCtrParty("");
      setCtrBody("");
      await loadContracts();
    } finally {
      setBusy(false);
    }
  }

  async function sendContract(id: string) {
    setBusy(true);
    const res = await fetch(`/api/businesses/${businessId}/contracts`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", contractId: id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setNote(typeof data.message === "string" ? data.message : data.url || "Sent.");
    await loadContracts();
  }

  async function saveLaunch() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/launch-plan`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist,
          popupHeading,
          popupBody,
          popupCta,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed.");
        return;
      }
      setNote(
        "Launch plan saved. In the site builder, add an Email popup section and paste this heading/body/CTA for the waitlist.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
          Invoices · Contracts · Launch
        </h2>
        <p className="mt-1 text-sm" style={{ color: KEBU.muted }}>
          For DkLNS and service businesses: bill clients, send agreements, plan pop-up / launch with a site
          popup. Shops still run catalog money in Shop.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["invoices", "Invoices"],
            ["contracts", "Contracts"],
            ["launch", "Launch / popup"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: tab === id ? KEBU.black : "#fff",
              color: tab === id ? "#fff" : KEBU.muted,
              border: `1px solid ${KEBU.border}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {note ? (
        <p className="rounded-xl px-3 py-2 text-xs" style={{ background: KEBU.cream }}>
          {note}
        </p>
      ) : null}

      {tab === "invoices" ? (
        <div className="space-y-4">
          <form onSubmit={(e) => void createInvoice(e)} className="space-y-2 rounded-2xl p-3" style={{ background: KEBU.cream }}>
            <input
              required
              placeholder="Client name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Client email (to send)"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Line description"
              value={lineDesc}
              onChange={(e) => setLineDesc(e.target.value)}
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              value={lineAmount}
              onChange={(e) => setLineAmount(Number(e.target.value) || 0)}
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ background: KEBU.orange }}
            >
              Create invoice
            </button>
          </form>
          <ul className="space-y-2 text-xs">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-3">
                <span>
                  {inv.invoice_number} · {inv.client_name} · {inv.amount_xof.toLocaleString()} XOF ·{" "}
                  {inv.status}
                </span>
                <span className="flex gap-2">
                  <button type="button" className="underline font-semibold" onClick={() => void sendInvoice(inv.id)}>
                    Send
                  </button>
                  <a href={inv.publicPath} target="_blank" rel="noreferrer" className="underline">
                    Open
                  </a>
                  {inv.status !== "paid" ? (
                    <button type="button" className="underline font-semibold" onClick={() => void markPaid(inv.id)}>
                      Mark paid
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "contracts" ? (
        <div className="space-y-4">
          <form onSubmit={(e) => void createContract(e)} className="space-y-2 rounded-2xl p-3" style={{ background: KEBU.cream }}>
            <input
              required
              placeholder="Contract title"
              value={ctrTitle}
              onChange={(e) => setCtrTitle(e.target.value)}
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Counterparty name"
              value={ctrParty}
              onChange={(e) => setCtrParty(e.target.value)}
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Counterparty email"
              value={ctrEmail}
              onChange={(e) => setCtrEmail(e.target.value)}
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            />
            <textarea
              required
              placeholder="Contract body"
              value={ctrBody}
              onChange={(e) => setCtrBody(e.target.value)}
              className="w-full min-h-[120px] rounded-xl border bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ background: KEBU.orange }}
            >
              Create contract
            </button>
          </form>
          <ul className="space-y-2 text-xs">
            {contracts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-3">
                <span>
                  {c.title} · {c.counterparty_name} · {c.status}
                </span>
                <span className="flex gap-2">
                  <button type="button" className="underline font-semibold" onClick={() => void sendContract(c.id)}>
                    Send
                  </button>
                  <a href={c.publicPath} target="_blank" rel="noreferrer" className="underline">
                    Open
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "launch" ? (
        <div className="space-y-4">
          <p className="text-xs leading-relaxed" style={{ color: KEBU.muted }}>
            Popup launch strategy: save copy here, then in Builder add an <strong>Email popup</strong> section on
            your site with the same heading / body / CTA. Checklist tracks press, assets, events, and contracts.
          </p>
          <ul className="space-y-2">
            {checklist.map((item, idx) => (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={item.done}
                  onChange={(e) => {
                    const next = [...checklist];
                    next[idx] = { ...item, done: e.target.checked };
                    setChecklist(next);
                  }}
                />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          <input
            value={popupHeading}
            onChange={(e) => setPopupHeading(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="Popup heading"
          />
          <textarea
            value={popupBody}
            onChange={(e) => setPopupBody(e.target.value)}
            className="w-full min-h-[80px] rounded-xl border px-3 py-2 text-sm"
            placeholder="Popup body"
          />
          <input
            value={popupCta}
            onChange={(e) => setPopupCta(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="Popup CTA"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveLaunch()}
            className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: KEBU.black }}
          >
            Save launch plan
          </button>
        </div>
      ) : null}
    </div>
  );
}
