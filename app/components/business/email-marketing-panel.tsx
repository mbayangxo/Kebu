"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Subscriber = { id: string; email: string; name: string | null; source: string; created_at: string };
type Campaign = {
  id: string;
  subject: string;
  status: string;
  recipient_count: number;
  sent_at: string | null;
  create_design_id: string | null;
  created_at: string;
};
type Design = { id: string; title: string };

export function EmailMarketingPanel({ businessId }: { businessId: string }) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualEmail, setManualEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [designId, setDesignId] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [subRes, campRes, designRes] = await Promise.all([
      fetch(`/api/businesses/${businessId}/subscribers`, { credentials: "include" }),
      fetch(`/api/businesses/${businessId}/campaigns`, { credentials: "include" }),
      fetch("/api/create/designs", { credentials: "include" }),
    ]);
    const subData = (await subRes.json().catch(() => ({}))) as { subscribers?: Subscriber[] };
    const campData = (await campRes.json().catch(() => ({}))) as { campaigns?: Campaign[] };
    const designData = (await designRes.json().catch(() => ({}))) as { designs?: Design[] };
    if (subRes.ok) setSubscribers(subData.subscribers ?? []);
    if (campRes.ok) setCampaigns(campData.campaigns ?? []);
    if (designRes.ok) setDesigns((designData.designs ?? []).map((d) => ({ id: d.id, title: d.title })));
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addSubscriber(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/businesses/${businessId}/subscribers`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: manualEmail }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add email.");
      return;
    }
    setManualEmail("");
    setNote("Subscriber added.");
    void load();
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/businesses/${businessId}/campaigns`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        bodyHtml: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
        bodyText: body,
        createDesignId: designId || null,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; campaign?: { id: string } };
    setBusy(false);
    if (!res.ok || !data.campaign) {
      setError(data.error ?? "Could not create campaign.");
      return;
    }
    setSubject("");
    setBody("");
    setDesignId("");
    setNote("Draft campaign saved. Send when ready.");
    void load();
  }

  async function sendCampaign(campaignId: string) {
    if (!confirm("Send this email to all active subscribers? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/businesses/${businessId}/campaigns/${campaignId}/send`, {
      method: "POST",
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; sent?: number; failed?: number };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Send failed.");
      return;
    }
    setNote(`Sent to ${data.sent ?? 0} subscribers${data.failed ? ` (${data.failed} failed)` : ""}.`);
    void load();
  }

  if (loading) return <p className="text-sm opacity-60">Loading email tools…</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-5" style={{ borderColor: KEBU.border }}>
        <h3 className="text-sm font-bold mb-1">Customer emails</h3>
        <p className="text-xs opacity-70 mb-4">
          Emails captured from your published site newsletter block, plus ones you add here. Use campaigns to reach
          them — attach a poster from{" "}
          <Link href="/studio" className="underline font-semibold">
            Kebu Create
          </Link>
          .
        </p>

        <form onSubmit={(e) => void addSubscriber(e)} className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="email"
            required
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            placeholder="customer@email.com"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            style={{ background: KEBU.orange }}
          >
            Add email
          </button>
        </form>

        {subscribers.length === 0 ? (
          <p className="text-xs opacity-60">
            No subscribers yet. Add a Newsletter section in Kebu Builder and publish your site.
          </p>
        ) : (
          <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
            {subscribers.map((s) => (
              <li key={s.id} className="flex justify-between gap-2 border-b border-black/5 py-1">
                <span>{s.email}</span>
                <span className="opacity-50">{s.source}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: KEBU.border }}>
        <h3 className="text-sm font-bold mb-1">New campaign</h3>
        <form onSubmit={(e) => void createCampaign(e)} className="space-y-3">
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={4}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          {designs.length > 0 ? (
            <select
              value={designId}
              onChange={(e) => setDesignId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">No Kebu Create design</option>
              {designs.map((d) => (
                <option key={d.id} value={d.id}>
                  Attach: {d.title}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs opacity-60">
              No Create designs yet —{" "}
              <Link href="/studio/new" className="underline">
                make a poster
              </Link>{" "}
              to embed in emails.
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            style={{ background: KEBU.black }}
          >
            Save draft campaign
          </button>
        </form>
      </div>

      {campaigns.length > 0 ? (
        <div className="rounded-2xl border p-5" style={{ borderColor: KEBU.border }}>
          <h3 className="text-sm font-bold mb-3">Campaigns</h3>
          <ul className="space-y-3">
            {campaigns.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-black/5 pb-2">
                <div>
                  <p className="font-semibold">{c.subject}</p>
                  <p className="text-xs opacity-60">
                    {c.status}
                    {c.sent_at ? ` · ${c.recipient_count} sent` : ""}
                  </p>
                </div>
                {c.status === "draft" ? (
                  <button
                    type="button"
                    disabled={busy || subscribers.length === 0}
                    onClick={() => void sendCampaign(c.id)}
                    className="text-xs font-bold px-3 py-1.5 rounded-full text-white disabled:opacity-50"
                    style={{ background: KEBU.orange }}
                  >
                    Send now
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {note ? <p className="text-xs font-semibold text-green-700">{note}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
