"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import type { AccountWorkspaceContext } from "@/lib/account/workspace-context";

type Channel = {
  id: string;
  created_by: string;
  business_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  channel_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export default function ChatPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [workspace, setWorkspace] = useState<AccountWorkspaceContext | null>(null);
  const [newName, setNewName] = useState("");
  const [composer, setComposer] = useState("");
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    setError(null);
    const workspaceRes = await fetch("/api/me/workspace", { credentials: "include" });
    const workspaceData = await workspaceRes.json().catch(() => ({}));
    const context = workspaceRes.ok && workspaceData.context ? workspaceData.context as AccountWorkspaceContext : null;
    setWorkspace(context);
    const params = new URLSearchParams();
    if (context?.activeBusinessId) params.set("businessId", context.activeBusinessId);
    else params.set("personal", "1");
    const channelsRes = await fetch("/api/chat?" + params.toString(), { credentials: "include" });
    const channelsData = await channelsRes.json().catch(() => ({}));
    if (!channelsRes.ok) {
      setError(channelsData.error || "Could not load chat.");
      return;
    }
    const list = Array.isArray(channelsData.channels) ? channelsData.channels as Channel[] : [];
    setChannels(list);
    setSelectedId((current) => current && list.some((channel) => channel.id === current) ? current : list[0]?.id ?? null);
    setLoadingChannels(false);
  }, []);

  const loadMessages = useCallback(async (channelId: string) => {
    setLoadingMessages(true);
    setError(null);
    const res = await fetch("/api/chat?channelId=" + encodeURIComponent(channelId), { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setLoadingMessages(false);
    if (!res.ok) {
      setError(data.error || "Could not load messages.");
      return;
    }
    setMessages(Array.isArray(data.messages) ? data.messages : []);
    setProfiles(Array.isArray(data.profiles) ? data.profiles : []);
  }, []);

  useEffect(() => { void loadChannels(); }, [loadChannels]);
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setProfiles([]);
      return;
    }
    void loadMessages(selectedId);
  }, [loadMessages, selectedId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const selected = useMemo(() => channels.find((channel) => channel.id === selectedId) ?? null, [channels, selectedId]);
  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);

  async function createChannel() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/chat", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_channel",
        name: newName.trim(),
        businessId: workspace?.activeBusinessId ?? null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok || !data.channel) {
      setError(data.error || "Could not create chat.");
      return;
    }
    setChannels((current) => [data.channel as Channel, ...current]);
    setSelectedId(data.channel.id);
    setNewName("");
  }

  async function sendMessage() {
    const body = composer.trim();
    if (!selectedId || !body || sending) return;
    setSending(true);
    setError(null);
    const res = await fetch("/api/chat", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_message", channelId: selectedId, body }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok || !data.message) {
      setError(data.error || "Could not send message.");
      return;
    }
    setMessages((current) => [...current, data.message as Message]);
    setComposer("");
    setChannels((current) => current.map((channel) => channel.id === selectedId ? { ...channel, updated_at: new Date().toISOString() } : channel));
  }

  return (
    <AppShell title="Chat">
      <div className="mx-auto flex min-h-[calc(100vh-112px)] max-w-[1500px] flex-col px-3 py-4 sm:px-5 lg:flex-row lg:gap-4">
        <aside className="w-full shrink-0 overflow-hidden rounded-[22px] border bg-white lg:w-[320px]" style={{ borderColor: KEBU.borders.default }}>
          <div className="border-b p-4" style={{ borderColor: KEBU.borders.default }}>
            <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Space chat</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <h1 className="text-xl font-black" style={{ fontFamily: "var(--font-fraunces)" }}>Chat</h1>
              <span className="rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wide" style={{ background: KEBU.cream, color: KEBU.muted }}>
                {workspace?.activeBusiness ? workspace.activeBusiness.name : "Personal"}
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>
              Personal chats stay personal. Business chats are visible to active members of that business space.
            </p>
          </div>

          <form
            className="flex gap-1.5 border-b p-3"
            style={{ borderColor: KEBU.borders.default }}
            onSubmit={(event) => { event.preventDefault(); void createChannel(); }}
          >
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="New channel"
              maxLength={80}
              className="min-h-9 min-w-0 flex-1 rounded-xl border bg-white px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#FF6A00]"
              style={{ borderColor: KEBU.borders.default }}
            />
            <button type="submit" disabled={!newName.trim() || creating} className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white disabled:opacity-35" aria-label="Create channel">
              <KebuIcon name="create" size={15} />
            </button>
          </form>

          <div className="max-h-[310px] overflow-y-auto lg:max-h-[calc(100vh-300px)]">
            {loadingChannels ? (
              <div className="space-y-px p-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl" style={{ background: "rgba(0,0,0,0.04)" }} />
                ))}
              </div>
            ) : channels.length ? channels.map((channel) => {
              const active = channel.id === selectedId;
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setSelectedId(channel.id)}
                  className="flex min-h-14 w-full items-center gap-3 border-b px-3.5 text-left outline-none transition hover:bg-black/[.02] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6A00]"
                  style={{ borderColor: KEBU.borders.subtle, background: active ? "rgba(255,106,0,.07)" : undefined }}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: active ? KEBU.orange : KEBU.cream, color: active ? "white" : KEBU.black }}>#</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-black">{channel.name}</span>
                    <span className="mt-0.5 block text-[8px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{channel.business_id ? "Business space" : "Personal space"}</span>
                  </span>
                </button>
              );
            }) : (
              <div className="p-7 text-center">
                <KebuIcon name="message" size={26} className="mx-auto" style={{ color: KEBU.faint }} />
                <p className="mt-3 text-[11px] font-black">No channels yet.</p>
                <p className="mt-1 text-[9px]" style={{ color: KEBU.muted }}>Create one above when you need a room.</p>
              </div>
            )}
          </div>
        </aside>

        <main className="mt-3 flex min-h-[560px] min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] border bg-white lg:mt-0" style={{ borderColor: KEBU.borders.default }}>
          {selected ? (
            <>
              <header className="flex min-h-16 items-center justify-between border-b px-4" style={{ borderColor: KEBU.borders.default }}>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>{selected.business_id ? "Business channel" : "Personal channel"}</p>
                  <h2 className="mt-0.5 text-[14px] font-black"># {selected.name}</h2>
                </div>
                <button type="button" onClick={() => void loadMessages(selected.id)} className="rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wide" style={{ borderColor: KEBU.borders.default }}>Refresh</button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
                {loadingMessages ? (
                  <p className="text-xs" style={{ color: KEBU.muted }}>Loading conversation…</p>
                ) : messages.length ? messages.map((message) => {
                  const profile = profileById.get(message.author_id);
                  const name = profile?.name || "Kebu member";
                  return (
                    <article key={message.id} className="flex items-start gap-3">
                      {profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: "linear-gradient(135deg,#FF6A00,#FF1F1F)" }}>{initials(name)}</span>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <p className="text-[11px] font-black">{name}</p>
                          <time className="text-[8px]" style={{ color: KEBU.faint }}>{new Date(message.created_at).toLocaleString()}</time>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-black/80">{message.body}</p>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                    <KebuIcon name="message" size={28} style={{ color: KEBU.faint }} />
                    <p className="mt-3 text-sm font-black">Start the conversation.</p>
                    <p className="mt-1 max-w-xs text-[10px]" style={{ color: KEBU.muted }}>Messages here are persisted in this Kebu space.</p>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <form
                className="border-t p-3 sm:p-4"
                style={{ borderColor: KEBU.borders.default }}
                onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}
              >
                <div className="flex items-end gap-2 rounded-[16px] border bg-[#FFFCF8] p-2" style={{ borderColor: KEBU.borders.default }}>
                  <textarea
                    value={composer}
                    onChange={(event) => setComposer(event.target.value)}
                    rows={2}
                    maxLength={5000}
                    placeholder={"Message #" + selected.name}
                    className="min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                  <button type="submit" disabled={!composer.trim() || sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-35" style={{ background: KEBU.black }} aria-label="Send message">
                    <KebuIcon name="arrowRight" size={17} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <KebuIcon name="message" size={32} style={{ color: KEBU.faint }} />
              <h2 className="mt-4 text-xl font-black" style={{ fontFamily: "var(--font-fraunces)" }}>Pick a channel, or make one.</h2>
              <p className="mt-2 max-w-sm text-[11px] leading-relaxed" style={{ color: KEBU.muted }}>Kebu Chat is for the people inside your spaces. Customer site messages remain in Messages.</p>
            </div>
          )}
        </main>

        {error ? <div className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-red-700 px-4 py-2 text-[10px] font-bold text-white shadow-lg">{error}</div> : null}
      </div>
    </AppShell>
  );
}
