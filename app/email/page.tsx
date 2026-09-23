"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import { BusinessMailSetup } from "@/app/components/mail/business-mail-setup";

type Folder = "inbox" | "sent" | "drafts" | "archive" | "spam" | "trash";
type NavLabel = "Inbox" | "Primary" | "Important" | "Promotions" | "Unsubscribed" | "Sent" | "Drafts" | "Spam" | "Archive" | "Trash";
type Mailbox = {
  id: string;
  address: string;
  display_name: string;
  mailbox_type: string;
  business_id: string | null;
  is_default: boolean;
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

type CenterTab = "all" | "unread" | "mentions" | "attachments" | "newsletters";

const SPACES = [
  { label: "Nia", count: 3 },
  { label: "May Lécor", count: 5 },
  { label: "DKLN Agency", count: 2 },
  { label: "Creative Grants", count: 1 },
  { label: "Personal", count: 0 },
];

const POST_INSIGHTS = [
  "3 unread messages need a response within 24h",
  "Summer Campaign thread has 4 participants",
  "2 emails contain attachments not yet downloaded",
];

const QUICK_REPLIES = ["Looks great!", "A few changes", "Let's discuss", "On my way", "Will review soon"];

function splitAddresses(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function formatBytes(value: number) {
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return Math.round(value / 1024) + " KB";
  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return d.toLocaleDateString();
}

const border = KEBU.borders.default;

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
  const [messagesLoading, setMessagesLoading] = useState(false);
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
  const [activeNavLabel, setActiveNavLabel] = useState<NavLabel>("Inbox");
  const [centerTab, setCenterTab] = useState<CenterTab>("all");
  const [replyText, setReplyText] = useState("");
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newLocalPart, setNewLocalPart] = useState("");
  const [addingAccount, setAddingAccount] = useState(false);
  const [addAccountError, setAddAccountError] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [availability, setAvailability] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeMailbox = useMemo(() => mailboxes.find((m) => m.id === mailboxId) ?? null, [mailboxes, mailboxId]);
  const selected = useMemo(() => messages.find((item) => item.id === selectedId) ?? null, [messages, selectedId]);
  const unread = useMemo(() => messages.filter((item) => !item.read_at && item.folder === "inbox" && item.mailbox_id === mailboxId).length, [messages, mailboxId]);

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
    if (!mailboxId) { setMessages([]); return; }
    setError(null);
    setMessagesLoading(true);
    const params = new URLSearchParams({ mailboxId, folder });
    const res = await fetch("/api/mail/messages?" + params.toString(), { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setMessagesLoading(false);
    if (!res.ok) { setError(data.error || "Could not load messages."); return; }
    setMessages(Array.isArray(data.messages) ? data.messages : []);
    setSelectedId(null);
    setThread(null);
  }, [folder, mailboxId]);

  const loadThread = useCallback(async (threadId: string) => {
    setThreadLoading(true);
    const res = await fetch("/api/mail/thread/" + encodeURIComponent(threadId), { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setThreadLoading(false);
    if (!res.ok) { setError(data.error || "Could not load conversation."); return; }
    setThread(data as ThreadPayload);
  }, []);

  useEffect(() => { void loadMailboxes(); }, [loadMailboxes]);
  useEffect(() => { void loadMessages(); }, [loadMessages]);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  function resetComposer() {
    setDraftId(null); setReplyThreadId(null); setInReplyToMessageId(null);
    setTo(""); setCc(""); setSubject(""); setBody(""); setComposeAttachments([]);
  }

  async function openMessage(message: Message) {
    setSelectedId(message.id);
    void loadThread(message.thread_id);
    if (!message.read_at && message.folder === "inbox") {
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, read_at: new Date().toISOString() } : item));
      await fetch("/api/mail/messages", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: message.id, read: true }),
      }).catch(() => {});
    }
  }

  async function moveSelected(nextFolder: Folder) {
    if (!selected) return;
    const res = await fetch("/api/mail/messages", {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, folder: nextFolder }),
    });
    if (!res.ok) { setError("Could not move that message."); return; }
    setMessages((current) => current.filter((item) => item.id !== selected.id));
    setSelectedId(null); setThread(null);
  }

  async function ensureDraft() {
    if (draftId) return draftId;
    if (!mailboxId) throw new Error("Mailbox is not ready.");
    const res = await fetch("/api/mail/messages", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mailboxId, threadId: replyThreadId ?? undefined, inReplyToMessageId: inReplyToMessageId ?? undefined, to: splitAddresses(to), cc: splitAddresses(cc), subject, text: body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.draft) throw new Error(data.error || "Draft was not saved.");
    setDraftId(data.draft.id);
    return data.draft.id as string;
  }

  async function saveDraft() {
    if (!mailboxId || sending) return;
    setSending(true); setError(null);
    try {
      const id = await ensureDraft();
      const res = await fetch("/api/mail/messages", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mailboxId, id, threadId: replyThreadId ?? undefined, inReplyToMessageId: inReplyToMessageId ?? undefined, to: splitAddresses(to), cc: splitAddresses(cc), subject, text: body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.draft) throw new Error(data.error || "Draft was not saved.");
      if (folder === "drafts") await loadMessages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft was not saved.");
    } finally { setSending(false); }
  }

  async function uploadAttachments(files: FileList | File[]) {
    if (!files.length) return;
    setAttachmentBusy(true); setError(null);
    try {
      const id = await ensureDraft();
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("messageId", id); form.set("file", file);
        const res = await fetch("/api/mail/attachments", { method: "POST", credentials: "include", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.attachment) throw new Error(data.error || "Could not attach " + file.name + ".");
        setComposeAttachments((current) => [...current, data.attachment]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Attachment upload failed.");
    } finally { setAttachmentBusy(false); }
  }

  async function removeAttachment(id: string) {
    const previous = composeAttachments;
    setComposeAttachments((current) => current.filter((item) => item.id !== id));
    const res = await fetch("/api/mail/attachments?id=" + encodeURIComponent(id), { method: "DELETE", credentials: "include" });
    if (!res.ok) { setComposeAttachments(previous); setError("Could not remove attachment."); }
  }

  async function loadDraftAttachments(messageId: string) {
    const res = await fetch("/api/mail/attachments?messageId=" + encodeURIComponent(messageId), { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setComposeAttachments(res.ok && Array.isArray(data.attachments) ? data.attachments : []);
  }

  async function send() {
    if (!mailboxId || !to.trim() || sending) return;
    setSending(true); setError(null);
    try {
      let id = draftId;
      if (composeAttachments.length && !id) id = await ensureDraft();
      const res = await fetch("/api/mail/send", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mailboxId, to: splitAddresses(to), cc: splitAddresses(cc), subject, text: body, draftId: id ?? undefined, threadId: replyThreadId ?? undefined, inReplyToMessageId: inReplyToMessageId ?? undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Email was not sent.");
      setCompose(false); resetComposer();
      if (folder === "sent") await loadMessages();
      if (data.threadId) void loadThread(data.threadId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Email was not sent.");
    } finally { setSending(false); }
  }

  function reply(message: Message, initialBody?: string) {
    resetComposer(); setCompose(true);
    setReplyThreadId(message.thread_id); setInReplyToMessageId(message.id);
    setTo(message.from_address);
    setSubject(message.subject.toLowerCase().startsWith("re:") ? message.subject : "Re: " + message.subject);
    if (initialBody) setBody(initialBody);
  }

  const filteredMessages = messages.filter(m => {
    if (centerTab === "unread") return !m.read_at;
    if (centerTab === "attachments") return false;
    return true;
  });

  const attentionMessages = filteredMessages.filter(m => !m.read_at && m.folder === "inbox");
  const otherMessages = filteredMessages.filter(m => m.read_at || m.folder !== "inbox");

  function triggerCheck(local: string) {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    const clean = local.trim().toLowerCase();
    if (!clean) { setAvailability("idle"); setSuggestions([]); return; }
    setAvailability("checking"); setSuggestions([]);
    checkTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/mail/mailboxes/check?local=" + encodeURIComponent(clean), { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setAvailability("idle"); return; }
        setAvailability(data.available ? "available" : "taken");
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions as string[] : []);
      } catch { setAvailability("idle"); }
    }, 380);
  }

  async function addAccount(localOverride?: string) {
    const local = (localOverride ?? newLocalPart).trim().toLowerCase();
    if (!local) return;
    if (availability === "taken" && !localOverride) { setAddAccountError("That address is taken — pick one of the suggestions below."); return; }
    setAddingAccount(true); setAddAccountError(null);
    const res = await fetch("/api/mail/mailboxes", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localPart: local }),
    });
    const data = await res.json().catch(() => ({}));
    setAddingAccount(false);
    if (!res.ok) {
      setAddAccountError(data.error || "Could not create address.");
      if (res.status === 409) { setAvailability("taken"); triggerCheck(local); }
      return;
    }
    setShowAddAccount(false); setNewLocalPart(""); setAddAccountError(null);
    setAvailability("idle"); setSuggestions([]);
    await loadMailboxes();
    if (data.mailbox?.id) setMailboxId(data.mailbox.id);
  }

  return (
    <AppShell title="Mail">
      <div className="min-h-[calc(100vh-60px)] bg-[#F5F3EF] p-3 sm:p-4">
        <div className="mx-auto grid min-h-[calc(100vh-92px)] max-w-[1600px] overflow-hidden rounded-[24px] border bg-white lg:grid-cols-[240px_380px_minmax(0,1fr)]" style={{ borderColor: border }}>

          {/* Left sidebar — POST */}
          <aside className="flex flex-col border-r" style={{ borderColor: border, background: "#0A0A0A" }}>
            {/* POST branding + account switcher */}
            <div className="border-b px-5 py-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[.2em]" style={{ color: KEBU.orange }}>POST</span>
                  <span className="rounded-full px-2 py-0.5 text-[8px] font-black uppercase" style={{ background: "rgba(255,85,0,.2)", color: KEBU.orange }}>BETA</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAccountMenu(v => !v)}
                  className="rounded-full p-1 text-[10px] transition hover:bg-white/[.08]"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  title="Manage accounts"
                >
                  ⋯
                </button>
              </div>

              {/* Account list — always visible, Gmail style */}
              <div className="space-y-1">
                {mailboxes.map((m) => {
                  const mUnread = messages.filter(msg => msg.mailbox_id === m.id && !msg.read_at && msg.folder === "inbox").length;
                  const active = m.id === mailboxId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setMailboxId(m.id); setShowAccountMenu(false); }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition"
                      style={{
                        background: active ? "rgba(255,85,0,.15)" : "rgba(255,255,255,0.04)",
                        border: active ? "1px solid rgba(255,85,0,.3)" : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-black"
                        style={{ background: active ? KEBU.orange : "rgba(255,255,255,0.12)", color: active ? "#fff" : "rgba(255,255,255,0.6)" }}
                      >
                        {m.address.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10px] font-bold" style={{ color: active ? "#fff" : "rgba(255,255,255,0.7)" }}>
                          {m.address.split("@")[0]}
                        </span>
                        <span className="block truncate text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                          @{m.address.split("@")[1]}
                          {m.is_default ? " · default" : ""}
                        </span>
                      </span>
                      {mUnread > 0 && (
                        <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black" style={{ background: active ? "rgba(255,255,255,.25)" : "rgba(255,85,0,.25)", color: active ? "#fff" : KEBU.orange }}>
                          {mUnread}
                        </span>
                      )}
                    </button>
                  );
                })}
                {mailboxes.length === 0 && (
                  <p className="px-2 py-2 text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>No accounts yet.</p>
                )}
              </div>

              {/* Add account */}
              {!showAddAccount ? (
                <button
                  type="button"
                  onClick={() => setShowAddAccount(true)}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[10px] font-bold transition hover:bg-white/[.06]"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  <span style={{ color: KEBU.orange }}>+</span> Add POST account
                </button>
              ) : (
                <div className="mt-2 space-y-2">
                  {/* Input row */}
                  <div
                    className="flex items-center rounded-xl overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: availability === "taken"
                        ? "1px solid rgba(239,68,68,.6)"
                        : availability === "available"
                        ? "1px solid rgba(52,211,153,.5)"
                        : "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <input
                      autoFocus
                      value={newLocalPart}
                      onChange={e => { setNewLocalPart(e.target.value); setAddAccountError(null); triggerCheck(e.target.value); }}
                      onKeyDown={e => { if (e.key === "Enter" && availability === "available") void addAccount(); if (e.key === "Escape") { setShowAddAccount(false); setNewLocalPart(""); setAddAccountError(null); setAvailability("idle"); setSuggestions([]); } }}
                      placeholder="yourname"
                      className="flex-1 bg-transparent px-2.5 py-2 text-[10px] font-bold outline-none"
                      style={{ color: "rgba(255,255,255,0.8)" }}
                    />
                    {/* Availability indicator */}
                    {availability === "checking" && (
                      <span className="shrink-0 px-2 text-[8px] animate-pulse" style={{ color: "rgba(255,255,255,0.35)" }}>checking…</span>
                    )}
                    {availability === "available" && (
                      <span className="shrink-0 px-2 text-[8px] font-black" style={{ color: "rgba(52,211,153,.9)" }}>✓ free</span>
                    )}
                    {availability === "taken" && (
                      <span className="shrink-0 px-2 text-[8px] font-black" style={{ color: "rgba(239,68,68,.9)" }}>✗ taken</span>
                    )}
                    <span className="shrink-0 border-l pr-2.5 pl-2 text-[8px]" style={{ color: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.08)" }}>@kebu.africa</span>
                  </div>

                  {/* Taken message + suggestions */}
                  {availability === "taken" && (
                    <div>
                      <p className="px-1 mb-1.5 text-[9px]" style={{ color: "rgba(239,68,68,.85)" }}>
                        That address is taken.
                        {suggestions.length > 0 ? " Try one of these:" : " Try a different name."}
                      </p>
                      {suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 px-0.5">
                          {suggestions.map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setNewLocalPart(s);
                                setAddAccountError(null);
                                triggerCheck(s);
                              }}
                              className="rounded-lg px-2.5 py-1.5 text-[9px] font-bold transition hover:brightness-110"
                              style={{ background: "rgba(255,85,0,.18)", color: KEBU.orange, border: "1px solid rgba(255,85,0,.3)" }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* General error */}
                  {addAccountError && <p className="px-1 text-[9px] text-red-400">{addAccountError}</p>}

                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={!newLocalPart.trim() || addingAccount || availability === "taken" || availability === "checking"}
                      onClick={() => void addAccount()}
                      className="flex-1 rounded-xl py-2 text-[10px] font-black text-white disabled:opacity-40 transition hover:brightness-110"
                      style={{ background: KEBU.orange }}
                    >
                      {addingAccount ? "Creating…" : "Create address"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddAccount(false); setNewLocalPart(""); setAddAccountError(null); setAvailability("idle"); setSuggestions([]); }}
                      className="rounded-xl px-3 py-2 text-[10px] font-bold transition hover:bg-white/[.08]"
                      style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* New message */}
            <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                type="button"
                onClick={() => { resetComposer(); setCompose(true); }}
                disabled={!mailboxId}
                className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[11px] font-black text-white disabled:opacity-40 transition hover:brightness-110 active:scale-95"
                style={{ background: KEBU.orange, boxShadow: "0 2px 12px rgba(255,85,0,0.35)" }}
              >
                <span className="text-base leading-none">+</span>
                New message
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {([
                { id: "inbox" as Folder, label: "Inbox" as NavLabel, badge: unread || null },
                { id: "inbox" as Folder, label: "Primary" as NavLabel, badge: null },
                { id: "inbox" as Folder, label: "Important" as NavLabel, badge: null },
                { id: "inbox" as Folder, label: "Promotions" as NavLabel, badge: null },
                { id: "inbox" as Folder, label: "Unsubscribed" as NavLabel, badge: null },
                { id: "sent" as Folder, label: "Sent" as NavLabel, badge: null },
                { id: "drafts" as Folder, label: "Drafts" as NavLabel, badge: messages.filter(m => m.folder === "drafts").length || null },
                { id: "spam" as Folder, label: "Spam" as NavLabel, badge: null },
                { id: "archive" as Folder, label: "Archive" as NavLabel, badge: null },
                { id: "trash" as Folder, label: "Trash" as NavLabel, badge: null },
              ]).map(({ id, label, badge }) => {
                const active = activeNavLabel === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { setFolder(id); setActiveNavLabel(label); }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[11px] font-bold transition-colors"
                    style={{
                      background: active ? "rgba(255,85,0,.12)" : "transparent",
                      color: active ? KEBU.orange : "rgba(255,255,255,0.55)",
                    }}
                  >
                    <span>{label}</span>
                    {badge ? (
                      <span className="rounded-full px-2 py-0.5 text-[8px] font-black" style={{ background: "rgba(255,85,0,.2)", color: KEBU.orange }}>{badge}</span>
                    ) : null}
                  </button>
                );
              })}

              {/* SPACES */}
              <div className="mt-4 mb-2 px-3">
                <p className="text-[9px] font-black uppercase tracking-[.2em]" style={{ color: "rgba(255,255,255,0.25)" }}>Spaces</p>
              </div>
              {SPACES.map(s => (
                <button
                  key={s.label}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[11px] transition-colors hover:bg-white/[.04]"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-black text-white" style={{ background: "rgba(255,85,0,.4)" }}>
                      {s.label.charAt(0)}
                    </span>
                    {s.label}
                  </span>
                  {s.count > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[8px] font-black" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>{s.count}</span>
                  )}
                </button>
              ))}
              <button type="button" className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[10px] transition-colors hover:bg-white/[.04]" style={{ color: "rgba(255,255,255,0.3)" }}>
                <span>+</span> Add space
              </button>
            </nav>

            {/* Let POST help */}
            <div className="m-3 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #1a0800, #150800)" }}>
              <div className="p-4">
                <p className="text-[9px] font-black uppercase tracking-[.16em] mb-1" style={{ color: KEBU.orange }}>Let POST help</p>
                <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  POST can prioritize your inbox, draft replies, and surface what needs your attention.
                </p>
                <button type="button" className="mt-3 text-[10px] font-black" style={{ color: KEBU.orange }}>Ask POST →</button>
              </div>
            </div>

            {/* Business mail settings */}
            {mailContext === "business" ? (
              <button type="button" onClick={() => setShowBusinessSetup(v => !v)} className="px-5 pb-4 text-left text-[9px] font-black uppercase tracking-wide" style={{ color: KEBU.orange }}>
                {showBusinessSetup ? "← Back" : "Business mail settings →"}
              </button>
            ) : (
              <Link href="/business" className="px-5 pb-4 text-[9px] font-black uppercase tracking-wide" style={{ color: KEBU.orange }}>
                Switch to Business →
              </Link>
            )}
          </aside>

          {/* Center panel — message list */}
          <section className="flex flex-col border-r" style={{ borderColor: border }}>
            {/* Filter tabs */}
            <div className="border-b" style={{ borderColor: border }}>
              <div className="flex gap-0 overflow-x-auto scrollbar-none px-1">
                {(["all", "unread", "mentions", "attachments", "newsletters"] as CenterTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCenterTab(tab)}
                    className="shrink-0 px-4 py-3.5 text-[10px] font-black uppercase tracking-wide transition-colors capitalize"
                    style={{
                      color: centerTab === tab ? KEBU.black : KEBU.muted,
                      borderBottom: centerTab === tab ? `2px solid ${KEBU.orange}` : "2px solid transparent",
                    }}
                  >
                    {tab}
                    {tab === "unread" && unread > 0 && (
                      <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-black text-white" style={{ background: KEBU.orange }}>{unread}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {(loading || messagesLoading) ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4].map(n => <div key={n} className="h-16 animate-pulse rounded-xl" style={{ background: KEBU.cream }} />)}
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-8 text-center">
                  <KebuIcon name="message" size={26} className="mx-auto" style={{ color: KEBU.faint }} />
                  <p className="mt-3 text-[11px] font-black">No mail here.</p>
                  <p className="mt-1 text-[9px]" style={{ color: KEBU.muted }}>This folder only shows messages that really exist.</p>
                </div>
              ) : (
                <>
                  {/* Needs your attention */}
                  {attentionMessages.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 px-4 py-2" style={{ background: "rgba(255,248,242,0.95)" }}>
                        <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Needs your attention</p>
                      </div>
                      {attentionMessages.map(message => (
                        <MessageRow key={message.id} message={message} active={selectedId === message.id} activeMailbox={activeMailbox} onClick={() => void openMessage(message)} onDraftOpen={() => {
                          setSelectedId(message.id);
                          setDraftId(message.id); setReplyThreadId(message.thread_id);
                          setInReplyToMessageId(message.in_reply_to_message_id);
                          setTo(message.to_addresses.join(", ")); setCc(message.cc_addresses.join(", "));
                          setSubject(message.subject); setBody(message.body_text);
                          setCompose(true); void loadDraftAttachments(message.id);
                        }} />
                      ))}
                    </div>
                  )}

                  {/* Other messages */}
                  {otherMessages.length > 0 && (
                    <div>
                      {attentionMessages.length > 0 && (
                        <div className="sticky top-0 z-10 px-4 py-2" style={{ background: "rgba(255,255,255,0.95)" }}>
                          <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.muted }}>Earlier</p>
                        </div>
                      )}
                      {otherMessages.map(message => (
                        <MessageRow key={message.id} message={message} active={selectedId === message.id} activeMailbox={activeMailbox} onClick={() => void openMessage(message)} onDraftOpen={() => {
                          setSelectedId(message.id);
                          setDraftId(message.id); setReplyThreadId(message.thread_id);
                          setInReplyToMessageId(message.in_reply_to_message_id);
                          setTo(message.to_addresses.join(", ")); setCc(message.cc_addresses.join(", "));
                          setSubject(message.subject); setBody(message.body_text);
                          setCompose(true); void loadDraftAttachments(message.id);
                        }} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Right panel — thread + metadata */}
          <main className="flex flex-col min-h-[420px]">
            {mailContext === "business" && (showBusinessSetup || mailboxes.length === 0) ? (
              <div className="h-full overflow-y-auto p-5 sm:p-7">
                <BusinessMailSetup onMailboxCreated={() => { setShowBusinessSetup(false); void loadMailboxes(); }} />
              </div>
            ) : selected && thread ? (
              <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
                {/* Thread column */}
                <div className="flex flex-1 flex-col overflow-hidden">
                  {/* Thread header */}
                  <header className="border-b px-5 py-4" style={{ borderColor: border }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>
                          Conversation · {thread.messages.length} message{thread.messages.length === 1 ? "" : "s"}
                        </p>
                        <h1 className="mt-1 text-lg font-black leading-tight" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
                          {thread.thread.subject || "(no subject)"}
                        </h1>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button type="button" onClick={() => reply(thread.messages[thread.messages.length - 1] ?? selected)} className="rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wide transition hover:bg-black/[.04]" style={{ borderColor: border }}>Reply</button>
                        {folder !== "archive" && <button type="button" onClick={() => void moveSelected("archive")} className="rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wide transition hover:bg-black/[.04]" style={{ borderColor: border }}>Archive</button>}
                        {folder !== "trash" && <button type="button" onClick={() => void moveSelected("trash")} className="rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wide transition hover:bg-black/[.04]" style={{ borderColor: border }}>Trash</button>}
                      </div>
                    </div>
                  </header>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto bg-[#F5F3EF] px-4 py-4">
                    <div className="space-y-3">
                      {thread.messages.map((message) => {
                        const attachments = thread.attachments.filter((a) => a.message_id === message.id);
                        return (
                          <section key={message.id} className="overflow-hidden rounded-[18px] border bg-white" style={{ borderColor: border }}>
                            <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${border}` }}>
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ background: KEBU.orange }}>
                                  {(message.direction === "inbound" ? message.from_address : activeMailbox?.address ?? "?").charAt(0).toUpperCase()}
                                </span>
                                <div>
                                  <p className="text-[11px] font-black">{message.direction === "inbound" ? message.from_address : activeMailbox?.address}</p>
                                  <p className="mt-0.5 text-[9px]" style={{ color: KEBU.muted }}>
                                    To {message.to_addresses.join(", ")}{message.cc_addresses.length ? " · Cc " + message.cc_addresses.join(", ") : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[8px] uppercase tracking-wide" style={{ color: KEBU.faint }}>{message.status}</p>
                                <time className="mt-0.5 block text-[8px]" style={{ color: KEBU.faint }}>{new Date(message.created_at).toLocaleString()}</time>
                              </div>
                            </div>
                            <div className="px-4 py-4 whitespace-pre-wrap text-[12px] leading-7" style={{ color: "rgba(0,0,0,0.75)" }}>
                              {message.body_text || "No plain-text body."}
                            </div>
                            {attachments.length > 0 && (
                              <div className="border-t px-4 py-3" style={{ borderColor: border }}>
                                <p className="mb-2 text-[9px] font-black uppercase tracking-[.12em]" style={{ color: KEBU.muted }}>Attachments</p>
                                <div className="flex flex-wrap gap-2">
                                  {attachments.map(a => a.downloadUrl ? (
                                    <a key={a.id} href={a.downloadUrl} target="_blank" rel="noreferrer"
                                      className="flex items-center gap-2 rounded-xl border bg-[#F5F3EF] px-3 py-2 text-[9px] font-bold transition hover:bg-black/[.06]"
                                      style={{ borderColor: border }}>
                                      <KebuIcon name="library" size={14} style={{ color: KEBU.orange }} />
                                      <span className="max-w-[180px] truncate">{a.file_name}</span>
                                      <span className="shrink-0" style={{ color: KEBU.faint }}>{formatBytes(a.byte_size)}</span>
                                    </a>
                                  ) : null)}
                                </div>
                              </div>
                            )}
                          </section>
                        );
                      })}
                    </div>

                    {/* Quick reply chips */}
                    <div className="mt-4">
                      <p className="mb-2 text-[9px] font-black uppercase tracking-[.12em]" style={{ color: KEBU.muted }}>Quick reply</p>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_REPLIES.map(qr => (
                          <button key={qr} type="button" onClick={() => { const lastMsg = thread.messages[thread.messages.length - 1]; if (lastMsg) reply(lastMsg, qr); }}
                            className="rounded-full border px-3 py-2 text-[10px] font-bold transition hover:bg-black/[.05]"
                            style={{ borderColor: border, color: KEBU.black }}>
                            {qr}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reply bar */}
                  <div className="border-t px-4 py-3" style={{ borderColor: border }}>
                    <div className="flex items-end gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: border }}>
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Write a reply…"
                        rows={2}
                        className="min-w-0 flex-1 resize-none bg-transparent text-sm outline-none"
                        style={{ color: KEBU.black }}
                      />
                      <button
                        type="button"
                        disabled={!replyText.trim()}
                        onClick={() => {
                          const lastMsg = thread.messages[thread.messages.length - 1];
                          if (lastMsg) { setReplyText(""); reply(lastMsg, replyText); }
                        }}
                        className="shrink-0 rounded-xl px-4 py-2 text-[10px] font-black text-white disabled:opacity-40 transition hover:brightness-110"
                        style={{ background: KEBU.orange }}
                      >
                        Send →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Metadata panel */}
                <aside className="hidden w-[220px] shrink-0 border-l xl:flex xl:flex-col" style={{ borderColor: border }}>
                  <div className="overflow-y-auto p-4 space-y-5">
                    {/* People */}
                    <div>
                      <p className="mb-2 text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>People</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {Array.from(new Set(thread.messages.flatMap(m => [m.from_address, ...m.to_addresses]))).slice(0, 5).map((addr, i) => (
                          <span key={addr} className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: (["#FF5500", "#6C63FF", "#0E9F6E", "#0EA5E9", "#F4B400"] as const)[i % 5] }}>
                            {addr.charAt(0).toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* About */}
                    <div>
                      <p className="mb-2 text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>About this conversation</p>
                      <div className="space-y-1.5 text-[10px]" style={{ color: "rgba(0,0,0,0.6)" }}>
                        <p>{thread.messages.length} message{thread.messages.length === 1 ? "" : "s"}</p>
                        <p>{thread.attachments.length} attachment{thread.attachments.length === 1 ? "" : "s"}</p>
                        <p>Started {formatDate(thread.thread.last_message_at)}</p>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div>
                      <p className="mb-2 text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Actions</p>
                      <div className="space-y-1.5">
                        {["Add to task", "Schedule meeting", "Create from this"].map(action => (
                          <button key={action} type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-bold text-left transition hover:bg-black/[.04]" style={{ border: `1px solid ${border}` }}>
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: KEBU.orange }} />
                            {action}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* POST Insights */}
                    <div className="rounded-2xl p-3" style={{ background: "#0A0A0A" }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>POST Insights</p>
                        <span className="rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase" style={{ background: "rgba(255,85,0,.2)", color: KEBU.orange }}>BETA</span>
                      </div>
                      <ul className="space-y-1.5">
                        {POST_INSIGHTS.slice(0, 2).map(insight => (
                          <li key={insight} className="flex items-start gap-1.5 text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ background: KEBU.orange }} />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </aside>
              </div>
            ) : threadLoading ? (
              <div className="flex h-full items-center justify-center min-h-[420px]">
                <p className="text-xs" style={{ color: KEBU.muted }}>Loading conversation…</p>
              </div>
            ) : (
              <div className="flex min-h-[420px] h-full flex-col items-center justify-center p-8 text-center">
                <div className="mb-5 overflow-hidden rounded-2xl" style={{ background: "#0A0A0A", width: 240 }}>
                  <div className="relative h-20 overflow-hidden" style={{ background: "linear-gradient(135deg, #1a0800, #0A0A0A)" }}>
                    <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(255,85,0,.35), transparent 60%)" }} />
                    <div className="absolute left-5 top-5">
                      <p className="text-[8px] font-black uppercase tracking-[.18em]" style={{ color: KEBU.orange }}>POST</p>
                      <p className="mt-0.5 text-sm font-black text-white" style={{ fontFamily: "var(--font-fraunces)" }}>Your inbox, elevated.</p>
                    </div>
                  </div>
                  <div className="px-5 py-3 text-left">
                    <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>Select a conversation to view it here.</p>
                  </div>
                </div>
                <p className="text-sm font-black" style={{ color: KEBU.black }}>Select a conversation</p>
                <p className="mt-1 max-w-xs text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>
                  Threads, attachments, drafts and reply context stay inside the mailbox.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Compose modal */}
      {compose ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center"
          onMouseDown={(e) => { if (e.currentTarget === e.target) setCompose(false); }}
        >
          <section className="w-full max-w-2xl overflow-hidden rounded-[24px] border bg-white shadow-2xl" style={{ borderColor: border }}>
            <header className="flex items-center justify-between bg-black px-4 py-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.14em] text-white/40">{inReplyToMessageId ? "Reply from" : "Compose from"}</p>
                <p className="text-[11px] font-bold text-white">{activeMailbox?.address}</p>
              </div>
              <button type="button" onClick={() => setCompose(false)} className="text-lg text-white/60">×</button>
            </header>
            <div className="space-y-2 p-4">
              <label className="block"><span className="sr-only">To</span><input value={to} onChange={e => setTo(e.target.value)} placeholder="To — separate multiple addresses with commas" className="min-h-11 w-full border-b bg-transparent px-1 text-sm outline-none" style={{ borderColor: border }} /></label>
              <label className="block"><span className="sr-only">Cc</span><input value={cc} onChange={e => setCc(e.target.value)} placeholder="Cc" className="min-h-10 w-full border-b bg-transparent px-1 text-xs outline-none" style={{ borderColor: border }} /></label>
              <label className="block"><span className="sr-only">Subject</span><input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="min-h-11 w-full border-b bg-transparent px-1 text-sm font-bold outline-none" style={{ borderColor: border }} /></label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={10} placeholder="Write your email…" className="w-full resize-y px-1 py-3 text-sm leading-relaxed outline-none" />
              {composeAttachments.length ? (
                <div className="flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: KEBU.borders.subtle }}>
                  {composeAttachments.map(a => (
                    <div key={a.id} className="flex items-center gap-2 rounded-xl border bg-[#F5F3EF] px-3 py-2" style={{ borderColor: border }}>
                      <KebuIcon name="library" size={14} style={{ color: KEBU.orange }} />
                      <span className="max-w-[180px] truncate text-[9px] font-bold">{a.file_name}</span>
                      <span className="text-[8px]" style={{ color: KEBU.faint }}>{formatBytes(a.byte_size)}</span>
                      <button type="button" onClick={() => void removeAttachment(a.id)} className="text-[10px] text-red-600">×</button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wide" style={{ borderColor: border }}>
                    {attachmentBusy ? "Uploading…" : "Attach"}
                    <input type="file" multiple className="sr-only" disabled={attachmentBusy} onChange={e => { if (e.target.files) void uploadAttachments(e.target.files); e.currentTarget.value = ""; }} />
                  </label>
                  <p className="hidden text-[8px] sm:block" style={{ color: KEBU.faint }}>25 MB per file</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={sending} onClick={() => void saveDraft()} className="rounded-full border px-4 py-2.5 text-[9px] font-black uppercase tracking-wide disabled:opacity-40" style={{ borderColor: border }}>{sending ? "Saving…" : "Save draft"}</button>
                  <button type="button" disabled={!to.trim() || sending || attachmentBusy} onClick={() => void send()} className="rounded-full px-5 py-2.5 text-xs font-black text-white disabled:opacity-40 transition hover:brightness-110" style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}>{sending ? "Working…" : "Send →"}</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {error ? (
        <button
          type="button"
          onClick={() => setError(null)}
          className="fixed bottom-20 left-1/2 z-[90] flex items-center gap-2.5 -translate-x-1/2 rounded-full bg-red-700 px-4 py-2 text-[10px] font-bold text-white shadow-lg max-w-[90vw] hover:bg-red-800 transition"
        >
          <span className="truncate">{error}</span>
          <span className="shrink-0 opacity-60">×</span>
        </button>
      ) : null}
    </AppShell>
  );
}

function MessageRow({ message, active, activeMailbox, onClick, onDraftOpen }: {
  message: Message;
  active: boolean;
  activeMailbox: Mailbox | null;
  onClick: () => void;
  onDraftOpen: () => void;
}) {
  const counterpart = message.direction === "inbound" ? message.from_address : message.to_addresses.join(", ");
  const initials = counterpart.charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => { if (message.folder === "drafts") onDraftOpen(); else onClick(); }}
      className="w-full border-b px-4 py-3 text-left transition hover:bg-black/[.02] focus-visible:ring-2 focus-visible:ring-inset"
      style={{
        borderColor: KEBU.borders.subtle,
        background: active ? "rgba(255,85,0,.06)" : !message.read_at && message.folder === "inbox" ? "rgba(255,85,0,.025)" : undefined,
      }}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white mt-0.5" style={{ background: !message.read_at ? KEBU.orange : KEBU.cream, color: !message.read_at ? "#fff" : KEBU.muted }}>
          {initials}
        </div>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[11px] font-black" style={{ color: KEBU.black }}>{counterpart}</span>
            <time className="shrink-0 text-[8px]" style={{ color: KEBU.faint }}>{formatDate(message.created_at)}</time>
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-bold">{message.subject || "(no subject)"}</span>
          <span className="mt-0.5 block truncate text-[9px]" style={{ color: KEBU.muted }}>{message.body_text || message.status}</span>
        </span>
      </div>
    </button>
  );
}
