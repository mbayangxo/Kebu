"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import { BusinessMailSetup } from "@/app/components/mail/business-mail-setup";

type Folder = "inbox" | "sent" | "drafts" | "archive" | "spam" | "trash";
type Mailbox = {
  id: string;
  address: string;
  display_name: string;
  mailbox_type: string;
  business_id: string | null;
};
type Message = {
  id: string;
  mailbox_id: string;
  thread_id: string;
  direction: "inbound" | "outbound";
  folder: Folder;
  from_address: string;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string;
  body_text: string;
  status: string;
  read_at: string | null;
  in_reply_to_message_id: string | null;
  created_at: string;
};
type Attachment = {
  id: string;
  message_id: string;
  file_name: string;
  mime: string;
  byte_size: number;
  downloadUrl: string | null;
};
type ThreadPayload = {
  thread: { id: string; subject: string; last_message_at: string };
  messages: Message[];
  attachments: Attachment[];
};

const FOLDERS: Array<{ id: Folder; label: string; icon: "message" | "work" | "library" }> = [
  { id: "inbox", label: "Inbox", icon: "message" },
  { id: "sent", label: "Sent", icon: "message" },
  { id: "drafts", label: "Drafts", icon: "work" },
  { id: "archive", label: "Archive", icon: "library" },
  { id: "spam", label: "Spam", icon: "message" },
  { id: "trash", label: "Trash", icon: "message" },
];

function splitAddresses(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function formatBytes(value: number) {
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return Math.round(value / 1024) + " KB";
  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

export default function EmailPage() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [mailboxId, setMailboxId] = useState("");
  const [folder, setFolder] = useState<Folder>("inbox");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadPayload | null>(null);
  const [compose, setCompose] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [replyThreadId, setReplyThreadId] = useState<string | null>(null);
  const [inReplyToMessageId, setInReplyToMessageId] = useState<string | null>(null);
  const [composeAttachments, setComposeAttachments] = useState<Attachment[]>([]);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mailContext, setMailContext] = useState<"personal" | "business">("personal");
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [showBusinessSetup, setShowBusinessSetup] = useState(false);

  const activeMailbox = useMemo(() => mailboxes.find((item) => item.id === mailboxId) ?? null, [mailboxes, mailboxId]);
  const selected = useMemo(() => messages.find((item) => item.id === selectedId) ?? null, [messages, selectedId]);
  const unread = useMemo(() => messages.filter((item) => !item.read_at && item.folder === "inbox").length, [messages]);

  const loadMailboxes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/mail/mailboxes", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not load mail.");
      setLoading(false);
      return;
    }
    const list = Array.isArray(data.mailboxes) ? data.mailboxes as Mailbox[] : [];
    setMailboxes(list);
    setMailContext(data.context === "business" ? "business" : "personal");
    setBusinessName(typeof data.businessName === "string" ? data.businessName : null);
    if (data.context !== "business") setShowBusinessSetup(false);
    setMailboxId((current) => current && list.some((item) => item.id === current) ? current : list[0]?.id ?? "");
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async () => {
    if (!mailboxId) {
      setMessages([]);
      return;
    }
    setError(null);
    const params = new URLSearchParams({ mailboxId, folder });
    const res = await fetch("/api/mail/messages?" + params.toString(), { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not load messages.");
      return;
    }
    setMessages(Array.isArray(data.messages) ? data.messages : []);
    setSelectedId(null);
    setThread(null);
  }, [folder, mailboxId]);

  const loadThread = useCallback(async (threadId: string) => {
    setThreadLoading(true);
    const res = await fetch("/api/mail/thread/" + encodeURIComponent(threadId), { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setThreadLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not load conversation.");
      return;
    }
    setThread(data as ThreadPayload);
  }, []);

  useEffect(() => { void loadMailboxes(); }, [loadMailboxes]);
  useEffect(() => { void loadMessages(); }, [loadMessages]);

  function resetComposer() {
    setDraftId(null);
    setReplyThreadId(null);
    setInReplyToMessageId(null);
    setTo("");
    setCc("");
    setSubject("");
    setBody("");
    setComposeAttachments([]);
  }

  async function openMessage(message: Message) {
    setSelectedId(message.id);
    void loadThread(message.thread_id);
    if (!message.read_at && message.folder === "inbox") {
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, read_at: new Date().toISOString() } : item));
      await fetch("/api/mail/messages", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: message.id, read: true }),
      }).catch(() => {});
    }
  }

  async function moveSelected(nextFolder: Folder) {
    if (!selected) return;
    const res = await fetch("/api/mail/messages", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, folder: nextFolder }),
    });
    if (!res.ok) {
      setError("Could not move that message.");
      return;
    }
    setMessages((current) => current.filter((item) => item.id !== selected.id));
    setSelectedId(null);
    setThread(null);
  }

  async function ensureDraft() {
    if (draftId) return draftId;
    if (!mailboxId) throw new Error("Mailbox is not ready.");

    const res = await fetch("/api/mail/messages", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mailboxId,
        threadId: replyThreadId ?? undefined,
        inReplyToMessageId: inReplyToMessageId ?? undefined,
        to: splitAddresses(to),
        cc: splitAddresses(cc),
        subject,
        text: body,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.draft) throw new Error(data.error || "Draft was not saved.");
    setDraftId(data.draft.id);
    return data.draft.id as string;
  }

  async function saveDraft() {
    if (!mailboxId || sending) return;
    setSending(true);
    setError(null);
    try {
      const id = await ensureDraft();
      const res = await fetch("/api/mail/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailboxId,
          id,
          threadId: replyThreadId ?? undefined,
          inReplyToMessageId: inReplyToMessageId ?? undefined,
          to: splitAddresses(to),
          cc: splitAddresses(cc),
          subject,
          text: body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.draft) throw new Error(data.error || "Draft was not saved.");
      if (folder === "drafts") await loadMessages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft was not saved.");
    } finally {
      setSending(false);
    }
  }

  async function uploadAttachments(files: FileList | File[]) {
    if (!files.length) return;
    setAttachmentBusy(true);
    setError(null);
    try {
      const id = await ensureDraft();
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("messageId", id);
        form.set("file", file);
        const res = await fetch("/api/mail/attachments", { method: "POST", credentials: "include", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.attachment) throw new Error(data.error || "Could not attach " + file.name + ".");
        setComposeAttachments((current) => [...current, data.attachment]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Attachment upload failed.");
    } finally {
      setAttachmentBusy(false);
    }
  }

  async function removeAttachment(id: string) {
    const previous = composeAttachments;
    setComposeAttachments((current) => current.filter((item) => item.id !== id));
    const res = await fetch("/api/mail/attachments?id=" + encodeURIComponent(id), { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      setComposeAttachments(previous);
      setError("Could not remove attachment.");
    }
  }

  async function loadDraftAttachments(messageId: string) {
    const res = await fetch("/api/mail/attachments?messageId=" + encodeURIComponent(messageId), { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setComposeAttachments(res.ok && Array.isArray(data.attachments) ? data.attachments : []);
  }

  async function send() {
    if (!mailboxId || !to.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      let id = draftId;
      if (composeAttachments.length && !id) id = await ensureDraft();
      const res = await fetch("/api/mail/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailboxId,
          to: splitAddresses(to),
          cc: splitAddresses(cc),
          subject,
          text: body,
          draftId: id ?? undefined,
          threadId: replyThreadId ?? undefined,
          inReplyToMessageId: inReplyToMessageId ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Email was not sent.");

      setCompose(false);
      resetComposer();
      if (folder === "sent") await loadMessages();
      if (data.threadId) void loadThread(data.threadId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Email was not sent.");
    } finally {
      setSending(false);
    }
  }

  function reply(message: Message) {
    resetComposer();
    setCompose(true);
    setReplyThreadId(message.thread_id);
    setInReplyToMessageId(message.id);
    setTo(message.from_address);
    setSubject(message.subject.toLowerCase().startsWith("re:") ? message.subject : "Re: " + message.subject);
  }

  return (
    <AppShell title="Mail">
      <div className="min-h-[calc(100vh-60px)] bg-[#FFFCF8] p-3 sm:p-4">
        <div className="mx-auto grid min-h-[calc(100vh-92px)] max-w-[1560px] overflow-hidden rounded-[24px] border bg-white lg:grid-cols-[220px_360px_minmax(0,1fr)]" style={{ borderColor: KEBU.borders.default }}>
          <aside className="border-b p-3 lg:border-b-0 lg:border-r" style={{ borderColor: KEBU.borders.default }}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>{mailContext === "business" ? (businessName ? businessName + " · Business Mail" : "Business Mail") : "Personal Mail"}</p>
                <select value={mailboxId} onChange={(event) => setMailboxId(event.target.value)} className="mt-1 w-full max-w-[180px] bg-transparent text-[11px] font-black outline-none">
                  {mailboxes.map((mailbox) => <option key={mailbox.id} value={mailbox.id}>{mailbox.address}</option>)}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { resetComposer(); setCompose(true); }}
              disabled={!mailboxId}
              className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] text-xs font-black text-white disabled:opacity-35"
              style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}
            >
              <KebuIcon name="create" size={16} /> Compose
            </button>

            <nav className="grid grid-cols-3 gap-1 lg:block lg:space-y-1">
              {FOLDERS.map((item) => {
                const active = folder === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => setFolder(item.id)} className="flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-[10px] font-bold outline-none transition hover:bg-black/[.025] focus-visible:ring-2 focus-visible:ring-[#FF6A00] lg:w-full" style={{ background: active ? "rgba(255,106,0,.08)" : undefined, color: active ? KEBU.black : KEBU.muted }}>
                    <KebuIcon name={item.icon} size={15} />
                    <span className="truncate">{item.label}</span>
                    {item.id === "inbox" && unread > 0 ? <span className="ml-auto rounded-full bg-[#FF1F1F] px-1.5 py-0.5 text-[8px] font-black text-white">{unread}</span> : null}
                  </button>
                );
              })}
            </nav>

            <div className="mt-5 hidden rounded-[14px] bg-black/[.025] p-3 lg:block">
              <p className="text-[9px] font-black uppercase tracking-[.12em]" style={{ color: KEBU.muted }}>Mailbox</p>
              <p className="mt-1 break-all text-[10px] font-bold">{activeMailbox?.address ?? "Provisioning…"}</p>
              <p className="mt-2 text-[9px] leading-relaxed" style={{ color: KEBU.faint }}>{mailContext === "business" ? "This mailbox belongs only to the active Business Kebu. Your personal @kebu.africa mail stays separate." : "This is your personal Kebu mailbox. Business-domain mail only appears after you switch into that Business Kebu."}</p>
            </div>
            {mailContext === "business" ? (
              <button type="button" onClick={() => setShowBusinessSetup((value) => !value)} className="mt-3 hidden text-[9px] font-black uppercase tracking-wide lg:inline-flex" style={{ color: KEBU.orange }}>{showBusinessSetup ? "Back to mailbox ←" : "Business mail settings →"}</button>
            ) : (
              <Link href="/business" className="mt-3 hidden text-[9px] font-black uppercase tracking-wide lg:inline-flex" style={{ color: KEBU.orange }}>Switch to a Business Kebu →</Link>
            )}
          </aside>

          <section className="border-b lg:border-b-0 lg:border-r" style={{ borderColor: KEBU.borders.default }}>
            <header className="flex h-14 items-center justify-between border-b px-3.5" style={{ borderColor: KEBU.borders.default }}>
              <div><p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>{folder}</p><p className="text-[11px] font-bold">{messages.length} message{messages.length === 1 ? "" : "s"}</p></div>
              <button type="button" onClick={() => void loadMessages()} className="rounded-full border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.borders.default }}>Refresh</button>
            </header>
            <div className="max-h-[340px] overflow-y-auto lg:max-h-[calc(100vh-150px)]">
              {loading ? <p className="p-4 text-xs" style={{ color: KEBU.muted }}>Loading mailbox…</p> : messages.length ? messages.map((message) => {
                const active = selectedId === message.id;
                const counterpart = message.direction === "inbound" ? message.from_address : message.to_addresses.join(", ");
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => {
                      if (message.folder === "drafts") {
                        setSelectedId(message.id);
                        setDraftId(message.id);
                        setReplyThreadId(message.thread_id);
                        setInReplyToMessageId(message.in_reply_to_message_id);
                        setTo(message.to_addresses.join(", "));
                        setCc(message.cc_addresses.join(", "));
                        setSubject(message.subject);
                        setBody(message.body_text);
                        setCompose(true);
                        void loadDraftAttachments(message.id);
                      } else {
                        void openMessage(message);
                      }
                    }}
                    className="w-full border-b px-3.5 py-3 text-left outline-none transition hover:bg-black/[.02] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6A00]"
                    style={{ borderColor: KEBU.borders.subtle, background: active ? "rgba(255,106,0,.06)" : !message.read_at && message.folder === "inbox" ? "rgba(255,106,0,.025)" : undefined }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: !message.read_at && message.folder === "inbox" ? KEBU.orange : "transparent" }} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[10px] font-black">{counterpart}</span>
                          <time className="shrink-0 text-[8px]" style={{ color: KEBU.faint }}>{new Date(message.created_at).toLocaleDateString()}</time>
                        </span>
                        <span className="mt-1 block truncate text-[11px] font-bold">{message.subject || "(no subject)"}</span>
                        <span className="mt-1 block truncate text-[9px]" style={{ color: KEBU.muted }}>{message.body_text || message.status}</span>
                      </span>
                    </div>
                  </button>
                );
              }) : (
                <div className="p-8 text-center"><KebuIcon name="message" size={26} className="mx-auto" style={{ color: KEBU.faint }} /><p className="mt-3 text-[11px] font-black">No mail here.</p><p className="mt-1 text-[9px]" style={{ color: KEBU.muted }}>This folder only shows messages that really exist.</p></div>
              )}
            </div>
          </section>

          <main className="min-h-[420px]">
            {mailContext === "business" && (showBusinessSetup || mailboxes.length === 0) ? (
              <div className="h-full overflow-y-auto p-5 sm:p-7">
                <BusinessMailSetup onMailboxCreated={() => { setShowBusinessSetup(false); void loadMailboxes(); }} />
              </div>
            ) : selected && thread ? (
              <article className="flex h-full flex-col">
                <header className="border-b px-5 py-4" style={{ borderColor: KEBU.borders.default }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>Conversation · {thread.messages.length} message{thread.messages.length === 1 ? "" : "s"}</p>
                      <h1 className="mt-1 text-xl font-black leading-tight" style={{ fontFamily: "var(--font-fraunces)" }}>{thread.thread.subject || "(no subject)"}</h1>
                    </div>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => reply(thread.messages[thread.messages.length - 1] ?? selected)} className="rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.borders.default }}>Reply</button>
                      {folder !== "archive" ? <button type="button" onClick={() => void moveSelected("archive")} className="rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.borders.default }}>Archive</button> : null}
                      {folder !== "trash" ? <button type="button" onClick={() => void moveSelected("trash")} className="rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.borders.default }}>Trash</button> : null}
                    </div>
                  </div>
                </header>
                <div className="flex-1 space-y-3 overflow-y-auto bg-[#FFFCF8] px-4 py-4 sm:px-5">
                  {thread.messages.map((message) => {
                    const attachments = thread.attachments.filter((attachment) => attachment.message_id === message.id);
                    return (
                      <section key={message.id} className="rounded-[18px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-black">{message.direction === "inbound" ? message.from_address : activeMailbox?.address}</p>
                            <p className="mt-0.5 text-[9px]" style={{ color: KEBU.muted }}>To {message.to_addresses.join(", ")}{message.cc_addresses.length ? " · Cc " + message.cc_addresses.join(", ") : ""}</p>
                          </div>
                          <div className="text-right"><p className="text-[8px] uppercase tracking-wide" style={{ color: KEBU.faint }}>{message.status}</p><time className="mt-0.5 block text-[8px]" style={{ color: KEBU.faint }}>{new Date(message.created_at).toLocaleString()}</time></div>
                        </div>
                        <div className="mt-4 whitespace-pre-wrap text-[12px] leading-7 text-black/80">{message.body_text || "No plain-text body."}</div>
                        {attachments.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {attachments.map((attachment) => attachment.downloadUrl ? (
                              <a key={attachment.id} href={attachment.downloadUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border bg-[#FFFCF8] px-3 py-2 text-[9px] font-bold" style={{ borderColor: KEBU.borders.default }}>
                                <KebuIcon name="library" size={14} style={{ color: KEBU.orange }} />
                                <span className="max-w-[220px] truncate">{attachment.file_name}</span>
                                <span style={{ color: KEBU.faint }}>{formatBytes(attachment.byte_size)}</span>
                              </a>
                            ) : null)}
                          </div>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              </article>
            ) : threadLoading ? (
              <div className="flex min-h-[420px] h-full items-center justify-center"><p className="text-xs" style={{ color: KEBU.muted }}>Loading conversation…</p></div>
            ) : (
              <div className="flex min-h-[420px] h-full flex-col items-center justify-center p-8 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-[18px]" style={{ background: KEBU.cream, color: KEBU.orange }}><KebuIcon name="message" size={24} /></span><p className="mt-4 text-sm font-black">Select a conversation.</p><p className="mt-1 max-w-sm text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>Threads, attachments, drafts and reply context stay inside the mailbox rather than being simulated in the interface.</p></div>
            )}
          </main>
        </div>
      </div>

      {compose ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center" onMouseDown={(event) => { if (event.currentTarget === event.target) setCompose(false); }}>
          <section className="w-full max-w-2xl overflow-hidden rounded-[24px] border bg-white shadow-2xl" style={{ borderColor: KEBU.borders.default }}>
            <header className="flex items-center justify-between bg-black px-4 py-3 text-white">
              <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-white/40">{inReplyToMessageId ? "Reply from" : "Compose from"}</p><p className="text-[11px] font-bold">{activeMailbox?.address}</p></div>
              <button type="button" onClick={() => setCompose(false)} className="text-lg text-white/60">×</button>
            </header>
            <div className="space-y-2 p-4">
              <label className="block"><span className="sr-only">To</span><input value={to} onChange={(event) => setTo(event.target.value)} placeholder="To — separate multiple addresses with commas" className="min-h-11 w-full border-b bg-transparent px-1 text-sm outline-none" style={{ borderColor: KEBU.borders.default }} /></label>
              <label className="block"><span className="sr-only">Cc</span><input value={cc} onChange={(event) => setCc(event.target.value)} placeholder="Cc" className="min-h-10 w-full border-b bg-transparent px-1 text-xs outline-none" style={{ borderColor: KEBU.borders.default }} /></label>
              <label className="block"><span className="sr-only">Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" className="min-h-11 w-full border-b bg-transparent px-1 text-sm font-bold outline-none" style={{ borderColor: KEBU.borders.default }} /></label>
              <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={10} placeholder="Write your email…" className="w-full resize-y px-1 py-3 text-sm leading-relaxed outline-none" />

              {composeAttachments.length ? (
                <div className="flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: KEBU.borders.subtle }}>
                  {composeAttachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-2 rounded-xl border bg-[#FFFCF8] px-3 py-2" style={{ borderColor: KEBU.borders.default }}>
                      <KebuIcon name="library" size={14} style={{ color: KEBU.orange }} />
                      <span className="max-w-[180px] truncate text-[9px] font-bold">{attachment.file_name}</span>
                      <span className="text-[8px]" style={{ color: KEBU.faint }}>{formatBytes(attachment.byte_size)}</span>
                      <button type="button" onClick={() => void removeAttachment(attachment.id)} className="text-[10px] text-red-600">×</button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.borders.default }}>
                    {attachmentBusy ? "Uploading…" : "Attach"}
                    <input type="file" multiple className="sr-only" disabled={attachmentBusy} onChange={(event) => { if (event.target.files) void uploadAttachments(event.target.files); event.currentTarget.value = ""; }} />
                  </label>
                  <p className="hidden text-[8px] sm:block" style={{ color: KEBU.faint }}>25 MB per file · private storage</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={sending} onClick={() => void saveDraft()} className="rounded-full border px-4 py-2.5 text-[9px] font-black uppercase tracking-wide disabled:opacity-40" style={{ borderColor: KEBU.borders.default }}>{sending ? "Saving…" : "Save draft"}</button>
                  <button type="button" disabled={!to.trim() || sending || attachmentBusy} onClick={() => void send()} className="rounded-full px-5 py-2.5 text-xs font-black text-white disabled:opacity-40" style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}>{sending ? "Working…" : "Send →"}</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {error ? <div className="fixed bottom-20 left-1/2 z-[90] max-w-[90vw] -translate-x-1/2 rounded-full bg-red-700 px-4 py-2 text-[10px] font-bold text-white shadow-lg">{error}</div> : null}
    </AppShell>
  );
}
