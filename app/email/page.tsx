"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import { BusinessMailSetup } from "@/app/components/mail/business-mail-setup";

type Folder = "inbox" | "sent" | "drafts" | "archive" | "spam" | "trash";
type MailView = Folder | "priority" | "waiting" | "starred";
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
  priority: boolean;
  starred_at: string | null;
  waiting_until: string | null;
  scheduled_at: string | null;
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

const MAIL_VIEWS: Array<{ id: MailView; label: string; icon: "message" | "work" | "library" }> = [
  { id: "inbox", label: "Inbox", icon: "message" },
  { id: "priority", label: "Priority", icon: "work" },
  { id: "waiting", label: "Waiting", icon: "work" },
  { id: "sent", label: "Sent", icon: "message" },
  { id: "drafts", label: "Drafts", icon: "work" },
  { id: "starred", label: "Starred", icon: "work" },
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
  const [folder, setFolder] = useState<MailView>("inbox");
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
  const [needsPersonalSetup, setNeedsPersonalSetup] = useState(false);
  const [mailDomain, setMailDomain] = useState("kebu.africa");
  const [mailSuggestions, setMailSuggestions] = useState<string[]>([]);
  const [setupLocalPart, setSetupLocalPart] = useState("");
  const [setupDisplayName, setSetupDisplayName] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);
  const [showPersonalMailboxSetup, setShowPersonalMailboxSetup] = useState(false);
  const [mailSearch, setMailSearch] = useState("");
  const [listFilter, setListFilter] = useState<"all" | "unread">("all");

  const activeMailbox = useMemo(() => mailboxes.find((item) => item.id === mailboxId) ?? null, [mailboxes, mailboxId]);
  const selected = useMemo(() => messages.find((item) => item.id === selectedId) ?? null, [messages, selectedId]);
  const unread = useMemo(() => messages.filter((item) => !item.read_at && item.folder === "inbox").length, [messages]);
  const visibleMessages = useMemo(() => {
    const q = mailSearch.trim().toLowerCase();
    return messages.filter((item) => {
      if (listFilter === "unread" && item.read_at) return false;
      if (!q) return true;
      return [item.from_address, item.to_addresses.join(" "), item.subject, item.body_text]
        .join(" ").toLowerCase().includes(q);
    });
  }, [messages, mailSearch, listFilter]);
  const threadParticipants = useMemo(() => {
    if (!thread) return [];
    const values = new Set<string>();
    for (const message of thread.messages) {
      values.add(message.from_address);
      message.to_addresses.forEach((address) => values.add(address));
      message.cc_addresses.forEach((address) => values.add(address));
    }
    if (activeMailbox?.address) values.delete(activeMailbox.address);
    return [...values].slice(0, 12);
  }, [thread, activeMailbox?.address]);
  const threadAttachmentCount = thread?.attachments.length ?? 0;

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
    const personalSetup = data.context !== "business" && Boolean(data.needsSetup);
    setNeedsPersonalSetup(personalSetup);
    if (typeof data.domain === "string") setMailDomain(data.domain);
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions.filter((item: unknown): item is string => typeof item === "string") : [];
    setMailSuggestions(suggestions);
    setSetupLocalPart((current) => current || suggestions[0] || "");
    setSetupDisplayName((current) => current || (typeof data.displayName === "string" ? data.displayName : ""));
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
    const params = new URLSearchParams({ mailboxId, view: folder });
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

  async function patchSelectedState(patch: { priority?: boolean; starred?: boolean; waitingUntil?: string | null }) {
    if (!selected) return;
    const res = await fetch("/api/mail/messages", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, ...patch }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.message) {
      setError(data.error || "Could not update this message.");
      return;
    }
    setMessages((current) => current.map((item) => item.id === selected.id ? { ...item, ...data.message } : item));
    setSelectedId(data.message.id);
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

  async function activatePersonalMail(event: React.FormEvent) {
    event.preventDefault();
    if (setupBusy || !setupLocalPart.trim() || !setupDisplayName.trim()) return;
    setSetupBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mail/mailboxes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localPart: setupLocalPart.trim(),
          displayName: setupDisplayName.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not activate Kebu Mail.");
      setNeedsPersonalSetup(false);
      setShowPersonalMailboxSetup(false);
      setSetupLocalPart("");
      await loadMailboxes();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not activate Kebu Mail.");
    } finally {
      setSetupBusy(false);
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

  if (!loading && mailContext === "personal" && needsPersonalSetup && mailboxes.length === 0) {
    return (
      <AppShell title="Mail" immersive>
        <main className="min-h-[calc(100vh-60px)] bg-[#FFFCF8] px-4 py-10 sm:px-6">
          <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[28px] border bg-white lg:grid-cols-[1fr_420px]" style={{ borderColor: KEBU.borders.default }}>
            <section className="p-6 sm:p-9 lg:p-12">
              <p className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: KEBU.orange }}>Kebu Mail</p>
              <h1 className="mt-3 max-w-xl text-4xl font-black tracking-[-.045em] sm:text-6xl" style={{ fontFamily: "var(--font-fraunces)" }}>
                Create your email when you want it.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7" style={{ color: KEBU.muted }}>
                Mail is optional. Your Kebu account does not silently create an inbox. Choose an address now, or come back whenever you actually need email.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ["01", "Choose", "Pick the Kebu address people will know you by."],
                  ["02", "Confirm", "Your address is created only after you approve it."],
                  ["03", "Use Mail", "Send, receive, draft, attach files and keep conversations together."],
                ].map(([n, title, body]) => (
                  <div key={n} className="rounded-[18px] border p-4" style={{ borderColor: KEBU.borders.default }}>
                    <p className="text-[9px] font-black" style={{ color: KEBU.orange }}>{n}</p>
                    <p className="mt-4 text-sm font-black">{title}</p>
                    <p className="mt-1 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>{body}</p>
                  </div>
                ))}
              </div>
            </section>

            <aside className="border-t bg-[#F4EFE9] p-6 sm:p-8 lg:border-l lg:border-t-0" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-black/40">Activate Personal Mail</p>
              <form onSubmit={(event) => void activatePersonalMail(event)} className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-[10px] font-black">Display name</span>
                  <input
                    value={setupDisplayName}
                    onChange={(event) => setSetupDisplayName(event.target.value)}
                    required
                    maxLength={120}
                    className="mt-1.5 min-h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#FF6A00]"
                    style={{ borderColor: KEBU.borders.default }}
                    placeholder="Your name"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-black">Email address</span>
                  <div className="mt-1.5 flex min-h-11 items-center rounded-xl border bg-white" style={{ borderColor: KEBU.borders.default }}>
                    <input
                      value={setupLocalPart}
                      onChange={(event) => setSetupLocalPart(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                      required
                      minLength={2}
                      maxLength={48}
                      className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                      aria-label="Kebu email name"
                    />
                    <span className="pr-3 text-xs font-bold" style={{ color: KEBU.muted }}>@{mailDomain}</span>
                  </div>
                </label>

                {mailSuggestions.length ? (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.12em] text-black/35">Suggestions</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {mailSuggestions.slice(0, 3).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setSetupLocalPart(suggestion)}
                          className="rounded-full border bg-white px-3 py-1.5 text-[9px] font-bold"
                          style={{ borderColor: KEBU.borders.default }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={setupBusy || setupLocalPart.trim().length < 2 || !setupDisplayName.trim()}
                  className="min-h-12 w-full rounded-full text-[10px] font-black uppercase tracking-[.12em] text-white disabled:opacity-40"
                  style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}
                >
                  {setupBusy ? "Creating address…" : "Create my Kebu email"}
                </button>
              </form>

              <p className="mt-4 text-[9px] leading-relaxed" style={{ color: KEBU.muted }}>
                Business Mail is activated separately inside a Business Kebu and can use that business's verified domain.
              </p>
              {error ? <p className="mt-3 text-xs font-semibold" style={{ color: KEBU.red }}>{error}</p> : null}
            </aside>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell title="Mail" immersive>
      <div className="min-h-[calc(100vh-60px)] bg-[#F6F2EC] p-2 sm:p-3">
        <div className="mx-auto min-h-[calc(100vh-84px)] max-w-[1740px] overflow-hidden rounded-[22px] border border-black/[.08] bg-[#FFFCF8] shadow-[0_12px_40px_rgba(20,15,10,.06)]">
          <header className="flex h-14 items-center gap-3 border-b border-black/[.07] px-4 lg:pl-[300px]">
            <label className="mx-auto flex min-h-9 w-full max-w-[720px] items-center gap-2 rounded-full border border-black/[.08] bg-white px-3">
              <span className="text-black/35" aria-hidden>⌕</span>
              <input
                value={mailSearch}
                onChange={(event) => setMailSearch(event.target.value)}
                placeholder="Search conversations, people, or mail…"
                className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-black/30"
              />
              <span className="hidden rounded-md bg-black/[.04] px-1.5 py-1 text-[8px] font-semibold text-black/35 sm:inline">⌘ K</span>
            </label>
            <button type="button" disabled title="EVA AI — coming soon" className="hidden cursor-not-allowed rounded-full bg-black/40 px-4 py-2 text-[10px] font-semibold text-white/50 lg:inline-flex">✦ Ask EVA</button>
            <button type="button" onClick={() => { resetComposer(); setCompose(true); }} className="hidden rounded-full border border-black/10 px-4 py-2 text-[10px] font-semibold sm:inline-flex">+ New message</button>
          </header>

          <div className="grid min-h-[calc(100vh-140px)] lg:grid-cols-[58px_224px_360px_minmax(420px,1fr)_260px]">
            <aside className="hidden flex-col items-center border-r border-white/[.08] bg-[#08090B] py-3 text-white lg:flex">
              <Link href="/dashboard" className="mb-4 text-[22px] font-black tracking-[-.08em]"><span className="text-[#FF6A00]">K</span></Link>
              <nav className="flex flex-1 flex-col gap-2">{[["/dashboard","⌂"],["/search","⌕"],["/email","✉"],["/people","◉"],["/rooms","◎"],["/calendar","▦"],["/library","▣"]].map(([href,icon],index)=><Link key={href} href={href} className="flex h-9 w-9 items-center justify-center rounded-[9px] text-[13px]" style={{background:index===2?"#C74417":"transparent",color:index===2?"white":"rgba(255,255,255,.68)"}}>{icon}</Link>)}</nav>
              <Link href="/account" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[8px]">ME</Link>
            </aside>
            <aside className="border-r border-black/[.07] bg-[#FFFCF8] p-3">
              <div className="px-1 pb-3">
                <div className="flex items-baseline gap-2"><p className="text-[28px] font-semibold tracking-[-.04em]" style={{ fontFamily:"var(--font-fraunces)" }}>EVA</p><span className="text-[7px] font-semibold uppercase text-[#E85B2A]">beta</span></div>
                <p className="mt-0.5 text-[9px] text-black/40">{mailContext === "business" ? businessName || "Business Mail" : "More than email. It’s your communication space."}</p>
              </div>

              <button type="button" onClick={() => { resetComposer(); setCompose(true); }} disabled={!mailboxId} className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-black text-[10px] font-semibold text-white disabled:opacity-35">+ New message</button>

              <nav className="space-y-0.5">
                {MAIL_VIEWS.map((item) => {
                  const active = folder === item.id;
                  return (
                    <button key={item.id} type="button" onClick={() => setFolder(item.id)} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-[10px] font-semibold transition hover:bg-black/[.025]" style={{ background: active ? "rgba(255,106,0,.09)" : undefined, color: active ? "#B53D00" : "#292522" }}>
                      <KebuIcon name={item.icon} size={14} />
                      <span>{item.label}</span>
                      {item.id === "inbox" && unread > 0 ? <span className="ml-auto text-[9px] font-bold text-[#E44813]">{unread}</span> : null}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-5 border-t border-black/[.07] pt-3">
                <div className="flex items-center justify-between px-2"><p className="text-[9px] font-semibold uppercase tracking-[.12em] text-black/35">Mailboxes</p>{mailContext === "personal" ? <button type="button" onClick={()=>setShowPersonalMailboxSetup(v=>!v)} className="text-sm text-black/35">+</button> : null}</div>
                <div className="mt-1 space-y-0.5">
                  {mailboxes.map((mailbox) => (
                    <button key={mailbox.id} type="button" onClick={()=>setMailboxId(mailbox.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-black/[.025]">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-[9px] font-semibold text-white">{(mailbox.display_name||mailbox.address).slice(0,1).toUpperCase()}</span>
                      <span className="min-w-0"><span className="block truncate text-[9px] font-semibold">{mailbox.display_name}</span><span className="block truncate text-[8px] text-black/35">{mailbox.address}</span></span>
                    </button>
                  ))}
                </div>
              </div>

              {showPersonalMailboxSetup && mailContext === "personal" ? (
                <form onSubmit={(event)=>void activatePersonalMail(event)} className="mt-3 border-t border-black/[.07] pt-3">
                  <input value={setupDisplayName} onChange={e=>setSetupDisplayName(e.target.value)} placeholder="Display name" className="min-h-9 w-full rounded-lg border border-black/10 px-2.5 text-[10px] outline-none"/>
                  <div className="mt-2 flex min-h-9 rounded-lg border border-black/10 bg-white"><input value={setupLocalPart} onChange={e=>setSetupLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g,""))} placeholder="address" className="min-w-0 flex-1 bg-transparent px-2.5 text-[10px] outline-none"/><span className="self-center pr-2 text-[8px] text-black/40">@{mailDomain}</span></div>
                  <button type="submit" disabled={setupBusy} className="mt-2 min-h-9 w-full rounded-lg bg-black text-[9px] font-semibold text-white disabled:opacity-40">{setupBusy?"Creating…":"Create address"}</button>
                </form>
              ) : null}

              <div className="mt-5 border-t border-black/[.07] pt-3"><p className="px-2 text-[8px] font-semibold uppercase tracking-[.12em] text-black/30">Spaces</p><div className="mt-2 space-y-1">{mailboxes.slice(0,5).map((mailbox)=><button key={"space-"+mailbox.id} type="button" onClick={()=>setMailboxId(mailbox.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[8px] hover:bg-black/[.03]"><span className="h-5 w-5 rounded-[6px] bg-[#FFF0E8]"/><span className="truncate">{mailbox.display_name}</span></button>)}</div></div>
              {mailContext === "business" ? <button type="button" onClick={()=>setShowBusinessSetup(v=>!v)} className="mt-4 px-2 text-[9px] font-semibold text-[#C95000]">{showBusinessSetup?"Back to inbox":"Business mail settings"}</button> : <Link href="/business" className="mt-4 block px-2 text-[9px] font-semibold text-black/40">Business Mail →</Link>}
              <div className="mt-auto hidden rounded-[12px] bg-black p-3 text-white lg:block"><p className="text-[9px] font-semibold">✦ Let EVA help</p><p className="mt-1 text-[8px] leading-relaxed text-white/45">Summarize, draft, schedule or find anything.</p></div>
            </aside>

            <section className="border-r border-black/[.07] bg-white">
              <div className="border-b border-black/[.07] px-3 py-3">
                <div className="flex items-center gap-4">
                  <button type="button" onClick={()=>setListFilter("all")} className={`text-[10px] font-semibold ${listFilter==="all"?"text-black":"text-black/35"}`}>All</button>
                  <button type="button" onClick={()=>setListFilter("unread")} className={`text-[10px] font-semibold ${listFilter==="unread"?"text-black":"text-black/35"}`}>Unread {unread || ""}</button>
                  <button type="button" onClick={()=>void loadMessages()} className="ml-auto text-[9px] font-semibold text-black/35">Refresh</button>
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[18px] font-semibold tracking-[-.025em]" style={{fontFamily:"var(--font-fraunces)"}}>{folder === "inbox" ? "Needs your attention" : MAIL_VIEWS.find(item=>item.id===folder)?.label}</p>
                    <p className="mt-0.5 text-[8px] text-black/35">{visibleMessages.length} message{visibleMessages.length===1?"":"s"}</p>
                  </div>
                </div>
              </div>

              <div className="max-h-[calc(100vh-214px)] overflow-y-auto">
                {loading ? <p className="p-4 text-xs text-black/40">Loading mailbox…</p> : visibleMessages.length ? visibleMessages.map((message) => {
                  const active = selectedId === message.id;
                  const counterpart = message.direction === "inbound" ? message.from_address : message.to_addresses.join(", ");
                  return (
                    <button key={message.id} type="button" onClick={() => {
                      if(message.folder==="drafts"){setSelectedId(message.id);setDraftId(message.id);setReplyThreadId(message.thread_id);setInReplyToMessageId(message.in_reply_to_message_id);setTo(message.to_addresses.join(", "));setCc(message.cc_addresses.join(", "));setSubject(message.subject);setBody(message.body_text);setCompose(true);void loadDraftAttachments(message.id)}
                      else void openMessage(message);
                    }} className="w-full border-b border-black/[.055] px-3 py-3 text-left transition hover:bg-black/[.018]" style={{background:active?"#FFF1E9":!message.read_at&&message.folder==="inbox"?"#FFFAF6":undefined}}>
                      <div className="flex gap-2.5">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[.055] text-[9px] font-semibold">{counterpart.slice(0,1).toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5"><span className="truncate text-[10px] font-semibold">{counterpart}</span>{message.priority?<span className="h-1.5 w-1.5 rounded-full bg-[#FF6A00]"/>:null}<time className="ml-auto shrink-0 text-[8px] text-black/30">{new Date(message.created_at).toLocaleDateString()}</time></span>
                          <span className="mt-0.5 block truncate text-[10px] font-medium">{message.subject||"(no subject)"}</span>
                          <span className="mt-0.5 block truncate text-[9px] text-black/38">{message.body_text||message.status}</span>
                        </span>
                      </div>
                    </button>
                  );
                }) : <div className="p-8 text-center"><p className="text-[11px] font-semibold">Nothing here yet.</p><p className="mt-1 text-[9px] text-black/35">This view only shows mail that really exists.</p></div>}
              </div>
            </section>

            <main className="min-w-0 bg-[#FFFCF8]">
              {mailContext === "business" && (showBusinessSetup || mailboxes.length===0) ? (
                <div className="h-full overflow-y-auto p-6"><BusinessMailSetup onMailboxCreated={()=>{setShowBusinessSetup(false);void loadMailboxes()}}/></div>
              ) : selected && thread ? (
                <article className="flex h-full flex-col">
                  <header className="border-b border-black/[.07] bg-white px-6 py-5">
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <h1 className="text-[26px] leading-tight tracking-[-.035em]" style={{fontFamily:"var(--font-fraunces)"}}>{thread.thread.subject||"(no subject)"}</h1>
                        <p className="mt-2 text-[9px] text-black/38">{thread.messages.length} message{thread.messages.length===1?"":"s"} · {threadParticipants.length} participant{threadParticipants.length===1?"":"s"}</p>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={()=>reply(thread.messages[thread.messages.length-1]??selected)} className="rounded-full border border-black/10 px-3 py-2 text-[9px] font-semibold">Reply</button>
                        {folder!=="archive"?<button type="button" onClick={()=>void moveSelected("archive")} className="rounded-full border border-black/10 px-3 py-2 text-[9px] font-semibold">Archive</button>:null}
                        {folder!=="trash"?<button type="button" onClick={()=>void moveSelected("trash")} className="rounded-full border border-black/10 px-3 py-2 text-[9px] font-semibold">Trash</button>:null}
                      </div>
                    </div>
                  </header>

                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    {thread.messages.map((message) => {
                      const attachments=thread.attachments.filter(a=>a.message_id===message.id);
                      return <section key={message.id} className="border-b border-black/[.06] py-5 last:border-b-0">
                        <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white">{(message.direction==="inbound"?message.from_address:activeMailbox?.address||"K").slice(0,1).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex items-baseline gap-2"><p className="truncate text-[10px] font-semibold">{message.direction==="inbound"?message.from_address:activeMailbox?.address}</p><time className="ml-auto shrink-0 text-[8px] text-black/30">{new Date(message.created_at).toLocaleString()}</time></div><p className="mt-0.5 text-[8px] text-black/35">to {message.to_addresses.join(", ")}{message.cc_addresses.length?" · cc "+message.cc_addresses.join(", "):""}</p></div></div>
                        <div className="ml-12 mt-4 whitespace-pre-wrap text-[12px] leading-7 text-black/78">{message.body_text||"No plain-text body."}</div>
                        {attachments.length?<div className="ml-12 mt-4 flex flex-wrap gap-2">{attachments.map(a=>a.downloadUrl?<a key={a.id} href={a.downloadUrl} target="_blank" rel="noreferrer" className="min-w-[150px] rounded-xl border border-black/[.08] bg-white px-3 py-2"><span className="block truncate text-[9px] font-semibold">{a.file_name}</span><span className="text-[8px] text-black/35">{formatBytes(a.byte_size)}</span></a>:null)}</div>:null}
                      </section>;
                    })}
                  </div>
                  <div className="border-t border-black/[.07] bg-white p-4"><button type="button" onClick={()=>reply(thread.messages[thread.messages.length-1]??selected)} className="w-full rounded-full border border-black/10 px-4 py-3 text-left text-[10px] text-black/35">Reply to this conversation…</button></div>
                </article>
              ) : threadLoading ? <div className="flex h-full items-center justify-center text-xs text-black/40">Loading conversation…</div> : <div className="flex h-full items-center justify-center p-8 text-center"><div><p className="text-[17px] font-semibold" style={{fontFamily:"var(--font-fraunces)"}}>Open a conversation</p><p className="mt-1 text-[9px] text-black/35">Messages, files and context stay together here.</p></div></div>}
            </main>

            <aside className="hidden border-l border-black/[.07] bg-white p-4 lg:block">
              {selected && thread ? (
                <div className="space-y-5">
                  <section>
                    <div className="flex items-center justify-between"><p className="text-[10px] font-semibold">People</p><span className="text-[9px] text-black/35">{threadParticipants.length}</span></div>
                    <div className="mt-3 space-y-2">{threadParticipants.map(address=><div key={address} className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/[.06] text-[9px] font-semibold">{address.slice(0,1).toUpperCase()}</span><span className="min-w-0 truncate text-[9px]">{address}</span></div>)}</div>
                  </section>
                  <section className="border-t border-black/[.07] pt-4">
                    <p className="text-[10px] font-semibold">About this conversation</p>
                    <div className="mt-3 space-y-1.5">
                      <button type="button" onClick={()=>void patchSelectedState({priority:!selected.priority})} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[9px] hover:bg-black/[.025]"><span>{selected.priority?"Remove priority":"Mark priority"}</span><span>{selected.priority?"●":"○"}</span></button>
                      <button type="button" onClick={()=>void patchSelectedState({starred:!selected.starred_at})} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[9px] hover:bg-black/[.025]"><span>{selected.starred_at?"Unstar":"Star"}</span><span>{selected.starred_at?"★":"☆"}</span></button>
                      <button type="button" onClick={()=>void patchSelectedState({waitingUntil:new Date(Date.now()+24*60*60*1000).toISOString()})} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[9px] hover:bg-black/[.025]"><span>Waiting until tomorrow</span><span>→</span></button>
                    </div>
                  </section>
                  <section className="border-t border-black/[.07] pt-4">
                    <p className="text-[10px] font-semibold">Conversation facts</p>
                    <div className="mt-3 space-y-2 text-[9px] text-black/45"><p>{thread.messages.length} messages</p><p>{threadAttachmentCount} attachments</p><p>Last activity {new Date(thread.thread.last_message_at).toLocaleString()}</p></div>
                  </section>
                  {threadAttachmentCount ? <section className="border-t border-black/[.07] pt-4"><p className="text-[10px] font-semibold">Related files</p><div className="mt-2 space-y-1.5">{thread.attachments.slice(0,6).map(a=><div key={a.id} className="truncate rounded-lg bg-black/[.025] px-2.5 py-2 text-[9px]">{a.file_name}</div>)}</div></section>:null}
                </div>
              ) : <p className="text-[9px] leading-relaxed text-black/35">Conversation context appears here when you open a message.</p>}
            </aside>
          </div>
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
