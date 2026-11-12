"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { contactReplyLinks, type SiteContactMessage } from "@/lib/create/site-contact-inbox";

export function SiteContactInbox({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<SiteContactMessage[]>([]);
  const [title, setTitle] = useState("Website");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const load = useCallback(async (offset = 0, signal?: AbortSignal) => {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/form-submissions?offset=${offset}`, { credentials: "include", cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load contact messages.");
      if (!Array.isArray(data.submissions)) throw new Error("Contact messages could not be confirmed. Try again.");
      if (signal?.aborted) return;
      setMessages(current => offset === 0 ? data.submissions : [...current, ...data.submissions.filter((item: SiteContactMessage) => !current.some(existing => existing.id === item.id))]);
      setTitle(data.projectTitle || "Website"); setNextOffset(typeof data.nextOffset === "number" ? data.nextOffset : null);
    } catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Could not load contact messages."); }
    finally { if (!signal?.aborted) setBusy(false); }
  }, [projectId]);
  useEffect(() => { const controller = new AbortController(); void load(0, controller.signal); return () => controller.abort(); }, [load]);
  const visible = messages.filter(message => `${message.submitter_name ?? ""} ${message.submitter_email ?? ""} ${Object.values(message.payload).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="min-h-screen bg-[#fffaf6] px-4 py-8 text-[#211b18] sm:px-8"><div className="mx-auto max-w-4xl space-y-6">
    <Link href={`/create/${projectId}`} className="text-sm underline">← Back to editor</Link>
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-widest">{title}</p><h1 className="mt-2 text-3xl font-bold">Contact inbox</h1></div><button type="button" disabled={busy} className="min-h-11 rounded-full border px-5 text-sm disabled:opacity-50" onClick={() => void load()}>Refresh messages</button></header>
    <p className="max-w-2xl text-sm leading-relaxed">Messages sent through your website’s forms are saved here privately. Reply in Kebu Mail using a configured mailbox, or open your email app and choose your business account. A message is sent only after you review it and press Send.</p>
    <label className="block text-sm">Search loaded messages<input type="search" className="mt-2 w-full rounded-xl border bg-white p-3" value={query} onChange={event => setQuery(event.target.value)} /></label>
    {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm"><p>{error}</p><button type="button" disabled={busy} className="mt-2 underline" onClick={() => void load()}>Retry loading messages</button></div> : null}
    {busy ? <p role="status">Loading messages…</p> : null}
    {!busy && !error && !messages.length ? <p className="rounded-xl border bg-white p-6">No contact messages yet. Publish a form on your site to receive enquiries here.</p> : null}
    {!busy && messages.length > 0 && !visible.length ? <p>No loaded messages match your search.</p> : null}
    <div className="space-y-4">{visible.map(message => { const reply = contactReplyLinks(message); return <article key={message.id} className="rounded-2xl border bg-white p-5 sm:p-6">
      <header className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{message.submitter_name || "Website visitor"}</h2><p className="mt-1 break-all text-sm">{message.submitter_email || "No reply email supplied"}</p></div><time className="text-xs opacity-60" dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time></header>
      <p className="mt-3 text-xs uppercase tracking-wide opacity-60">{message.form_name}</p>
      <dl className="mt-4 space-y-3">{Object.entries(message.payload).map(([name,value]) => <div key={name}><dt className="text-xs font-semibold capitalize opacity-60">{name.replace(/_/g," ")}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{value}</dd></div>)}</dl>
      {reply ? <div className="mt-5 flex flex-wrap gap-3 text-sm"><Link href={reply.kebu} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-[#211b18] px-5 text-white">Reply in Kebu Mail ↗</Link><a href={reply.email} className="inline-flex min-h-11 items-center rounded-full border px-5">Reply in email app</a></div> : null}
    </article>; })}</div>
    {nextOffset !== null ? <button type="button" disabled={busy} className="min-h-11 rounded-full border px-5 text-sm" onClick={() => void load(nextOffset)}>Load older messages</button> : null}
  </div></main>;
}
