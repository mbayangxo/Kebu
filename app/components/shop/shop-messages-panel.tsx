"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Thread = {
  id: string;
  subject: string;
  status: string;
  last_message_at: string;
  customer_user_id: string;
};

type Msg = {
  id: string;
  sender_role: string;
  body: string;
  created_at: string;
};

export function ShopMessagesPanel({
  projectId,
  embedded = false,
}: {
  projectId: string;
  embedded?: boolean;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load messages.");
        setThreads([]);
        return;
      }
      setThreads(Array.isArray(data.threads) ? data.threads : []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  async function openThread(id: string) {
    setActiveId(id);
    setMessages([]);
    const res = await fetch(`/api/projects/${projectId}/messages?threadId=${encodeURIComponent(id)}`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setMessages(Array.isArray(data.messages) ? data.messages : []);
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !reply.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: activeId, body: reply.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not reply.");
        return;
      }
      setReply("");
      await openThread(activeId);
      await loadThreads();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={embedded ? "" : "mt-10"}>
      {!embedded ? (
        <>
          <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
            Messages
          </h2>
          <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
            Customers message you from their shop account. Reply here — this is not WhatsApp and not paid
            checkout.
          </p>
        </>
      ) : (
        <p className="mb-4 text-sm" style={{ color: KEBU.muted }}>
          In-app messages from signed-in shoppers. Reply in plain language.
        </p>
      )}
      {loading ? (
        <p className="mt-3 text-sm" style={{ color: KEBU.muted }}>
          Loading…
        </p>
      ) : error ? (
        <p className="mt-3 text-sm" style={{ color: "#8B1E1E" }}>{error}</p>
      ) : threads.length === 0 ? (
        <p className="mt-3 text-sm" style={{ color: KEBU.muted }}>
          No messages yet. When a shopper signs in and writes from My account → Message store, threads
          appear here.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ul className="space-y-2">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => void openThread(t.id)}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm"
                  style={{
                    border: `1px solid ${KEBU.border}`,
                    background: activeId === t.id ? "#fff" : KEBU.cream,
                  }}
                >
                  <p className="font-semibold truncate">{t.subject || "Conversation"}</p>
                  <p className="text-[10px] opacity-50">
                    {new Date(t.last_message_at).toLocaleString()} · {t.status}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          <div className="rounded-xl border p-3" style={{ borderColor: KEBU.border, background: "#fff" }}>
            {!activeId ? (
              <p className="text-sm opacity-60">Select a conversation.</p>
            ) : (
              <>
                <ul className="max-h-56 space-y-2 overflow-auto text-sm">
                  {messages.map((m) => (
                    <li
                      key={m.id}
                      className={`rounded-lg px-2 py-1.5 ${
                        m.sender_role === "merchant" ? "bg-black/5 ml-4" : "bg-orange-50 mr-4"
                      }`}
                    >
                      <p className="text-[9px] font-bold uppercase opacity-50">
                        {m.sender_role === "merchant" ? "You" : "Customer"}
                      </p>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </li>
                  ))}
                </ul>
                <form onSubmit={(e) => void sendReply(e)} className="mt-3 space-y-2">
                  <textarea
                    required
                    maxLength={2000}
                    rows={3}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write a reply…"
                    className="w-full rounded-lg border px-2 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-full px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: KEBU.orange }}
                  >
                    {busy ? "…" : "Send reply"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
