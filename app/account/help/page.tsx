"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

type Reply = {
  id: string;
  author_type: "customer" | "team";
  author_name: string;
  body: string;
  created_at: string;
};

type HelpRequest = {
  id: string;
  subject: string;
  body: string;
  status: string;
  source: string;
  created_at: string;
  helped_at: string | null;
  replies: Reply[];
};

export default function AccountHelpPage() {
  const [requests, setRequests] = useState<HelpRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/account/help", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Could not load your requests.");
      return;
    }
    setError(null);
    setRequests(json.requests ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitNewRequest(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/account/help", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not send.");
        return;
      }
      setSubject("");
      setBody("");
      await load();
    } finally {
      setSending(false);
    }
  }

  async function sendReply(id: string) {
    const text = (replyDrafts[id] ?? "").trim();
    if (!text) return;
    setReplyBusyId(id);
    try {
      const res = await fetch(`/api/account/help/${id}/replies`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not send your reply.");
        return;
      }
      setReplyDrafts((prev) => ({ ...prev, [id]: "" }));
      await load();
    } finally {
      setReplyBusyId(null);
    }
  }

  return (
    <AppShell title="Get help">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-2" style={{ color: KEBU.orange }}>
            Support
          </p>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
            Get help
          </h1>
          <p className="text-sm" style={{ color: KEBU.muted }}>
            Tied to your Kebu account, so the team can see your account context. We reply by email — you can also
            reply right here.
          </p>
        </div>

        {error ? (
          <p className="text-sm rounded-xl border px-4 py-3" style={{ borderColor: KEBU.border, color: "#8B1E1E" }}>
            {error}
          </p>
        ) : null}

        <form onSubmit={(e) => void submitNewRequest(e)} className="rounded-2xl border p-5 space-y-3" style={{ borderColor: KEBU.border }}>
          <h2 className="text-sm font-bold uppercase tracking-wider">New request</h2>
          <input
            required
            maxLength={120}
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
            style={{ borderColor: KEBU.border }}
          />
          <textarea
            required
            maxLength={4000}
            rows={4}
            placeholder="How can we help?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
            style={{ borderColor: KEBU.border }}
          />
          <button
            type="submit"
            disabled={sending || !subject.trim() || !body.trim()}
            className="rounded-full px-6 py-3 text-xs font-bold uppercase text-white disabled:opacity-50"
            style={{ background: KEBU.orange }}
          >
            {sending ? "Sending…" : "Send request"}
          </button>
        </form>

        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider">Your requests</h2>
          {requests === null ? (
            <p className="text-sm" style={{ color: KEBU.muted }}>
              Loading…
            </p>
          ) : requests.length === 0 ? (
            <p className="text-sm" style={{ color: KEBU.muted }}>
              No requests yet.
            </p>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="rounded-2xl border p-4" style={{ borderColor: KEBU.border }}>
                <button type="button" className="w-full text-left" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                  <p className="font-bold text-sm">{r.subject}</p>
                  <p className="text-xs mt-0.5" style={{ color: KEBU.muted }}>
                    {r.status} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </button>
                {openId === r.id ? (
                  <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: KEBU.border }}>
                    <p className="text-sm">{r.body}</p>
                    {r.replies.map((reply) => (
                      <div key={reply.id} className="text-xs border-t pt-2" style={{ borderColor: KEBU.border }}>
                        <span className="font-bold">{reply.author_type === "team" ? "Kebu team" : "You"}</span>{" "}
                        <span style={{ color: KEBU.muted }}>{new Date(reply.created_at).toLocaleString()}</span>
                        <p className="mt-0.5">{reply.body}</p>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <textarea
                        className="flex-1 rounded-lg border px-2 py-1.5 text-xs"
                        rows={2}
                        placeholder="Reply"
                        value={replyDrafts[r.id] ?? ""}
                        onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      />
                      <button
                        type="button"
                        disabled={replyBusyId === r.id || !(replyDrafts[r.id] ?? "").trim()}
                        className="self-start rounded-full px-3 py-1.5 text-[10px] font-bold uppercase text-white disabled:opacity-50"
                        style={{ background: KEBU.orange }}
                        onClick={() => void sendReply(r.id)}
                      >
                        {replyBusyId === r.id ? "Sending…" : "Send"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </section>

        <Link href="/account" className="text-sm underline" style={{ color: KEBU.orange }}>
          Back to account
        </Link>
      </div>
    </AppShell>
  );
}
