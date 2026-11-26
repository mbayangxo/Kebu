"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authCallbackUrl, isEmailNotConfirmed } from "@/lib/auth/email-confirm";

type CommunityPost = {
  id: string;
  parentId: string | null;
  role: "creator" | "member";
  displayName: string;
  body: string;
  isHidden: boolean;
  isMine: boolean;
  createdAt: string;
  replies: CommunityPost[];
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

/** Fan/member community board for a published site — sign up, post, reply. Works on any project, not just Shop-enabled ones. */
export function PublicSiteCommunity({
  subdomain,
  heading,
  subheading,
  signInPrompt,
}: {
  subdomain: string;
  heading: string;
  subheading: string;
  signInPrompt: string;
}) {
  // Never create the browser Supabase client in the render body — this component
  // is "use client" but Next.js still server-renders it for the initial HTML
  // (SSR of a published site page), and createClient() throws when it runs
  // outside a browser. Every real usage below is already inside an effect,
  // callback, or event handler (client-only), so each creates its own
  // reference to the module-level singleton on demand instead.
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [composer, setComposer] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await createClient().auth.getUser();
      if (!user) {
        setUserEmail(null);
        setPosts([]);
        return;
      }
      setUserEmail(user.email ?? null);
      const res = await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/community`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setUserEmail(null);
        setPosts([]);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load the community.");
        return;
      }
      setPosts(Array.isArray(data.posts) ? data.posts : []);
      setIsOwner(Boolean(data.isOwner));
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [subdomain]);

  useEffect(() => {
    void load();
  }, [load]);

  async function authSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setConfirmPending(false);
    setNote(null);
    try {
      if (mode === "signin") {
        const { error: err } = await createClient().auth.signInWithPassword({ email, password });
        if (err) {
          if (isEmailNotConfirmed(err.message)) {
            setConfirmPending(true);
            setError("Confirm your email first, then sign in.");
          } else {
            setError(err.message);
          }
          return;
        }
      } else {
        const { error: err } = await createClient().auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: authCallbackUrl(window.location.pathname),
            data: { full_name: name.trim() || undefined },
          },
        });
        if (err) {
          setError(err.message);
          return;
        }
        setNote("Check your email to confirm, then sign in.");
        setMode("signin");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await createClient().auth.signOut();
    setUserEmail(null);
    setPosts([]);
    setNote(null);
  }

  async function submitPost(e: React.FormEvent, parentId: string | null, text: string) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/community`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim(), parentId, displayName: name.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not post.");
        return;
      }
      if (parentId) {
        setReplyBody("");
        setReplyTo(null);
      } else {
        setComposer("");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function moderate(postId: string, isHidden: boolean) {
    setBusy(true);
    try {
      await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/community/${postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removePost(postId: string) {
    setBusy(true);
    try {
      await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/community/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  function PostRow({ post, isReply }: { post: CommunityPost; isReply?: boolean }) {
    return (
      <li className={`rounded-xl border border-black/10 bg-white px-3 py-3 text-sm ${isReply ? "ml-6" : ""}`}>
        <div className="flex items-center gap-2">
          <p className="font-semibold">{post.displayName}</p>
          {post.role === "creator" ? (
            <span className="rounded-full bg-black px-2 py-0.5 text-[9px] font-bold uppercase text-white">
              Creator
            </span>
          ) : null}
          {post.isHidden ? (
            <span className="text-[9px] font-bold uppercase opacity-50">Hidden</span>
          ) : null}
          <span className="text-[10px] opacity-40">· {timeAgo(post.createdAt)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap">{post.body}</p>
        <div className="mt-2 flex gap-3 text-[10px] font-bold uppercase tracking-wider opacity-60">
          {!isReply ? (
            <button type="button" onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}>
              Reply
            </button>
          ) : null}
          {post.isMine ? (
            <button type="button" onClick={() => void removePost(post.id)}>
              Delete
            </button>
          ) : null}
          {isOwner && !post.isMine ? (
            <button type="button" onClick={() => void moderate(post.id, !post.isHidden)}>
              {post.isHidden ? "Unhide" : "Hide"}
            </button>
          ) : null}
        </div>
        {!isReply && replyTo === post.id ? (
          <form onSubmit={(e) => void submitPost(e, post.id, replyBody)} className="mt-3 flex gap-2">
            <input
              value={replyBody}
              onChange={(ev) => setReplyBody(ev.target.value)}
              placeholder="Write a reply…"
              maxLength={2000}
              className="flex-1 rounded-full border px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-black px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              Reply
            </button>
          </form>
        ) : null}
        {post.replies.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {post.replies.map((r) => (
              <PostRow key={r.id} post={r} isReply />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <section className="kebu-section mx-auto max-w-2xl px-5 py-10">
      <h2 className="text-2xl font-bold tracking-tight">{heading}</h2>
      <p className="mt-1 text-sm opacity-70">{subheading}</p>

      {loading ? (
        <p className="mt-6 text-sm opacity-60">Loading…</p>
      ) : !userEmail ? (
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-sm opacity-70">{signInPrompt}</p>
          <form onSubmit={(e) => void authSubmit(e)} className="mt-3 space-y-3">
            <div className="flex gap-2 text-xs font-bold">
              <button
                type="button"
                className={mode === "signup" ? "underline" : "opacity-50"}
                onClick={() => setMode("signup")}
              >
                Join
              </button>
              <span className="opacity-30">·</span>
              <button
                type="button"
                className={mode === "signin" ? "underline" : "opacity-50"}
                onClick={() => setMode("signin")}
              >
                Sign in
              </button>
            </div>
            {mode === "signup" ? (
              <input
                placeholder="Your name"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            ) : null}
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <input
              required
              type="password"
              minLength={8}
              placeholder="Password (8+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            {error ? <p className="text-xs" style={{ color: "#8B1E1E" }}>{error}</p> : null}
            {confirmPending ? (
              <p className="text-xs opacity-70">Open the confirmation link we emailed you.</p>
            ) : null}
            {note ? <p className="text-xs opacity-70">{note}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? "…" : mode === "signup" ? "Create account & join" : "Sign in"}
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 text-xs">
            <span className="opacity-70">Signed in as {userEmail}</span>
            <button type="button" className="font-bold underline" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>

          <form onSubmit={(e) => void submitPost(e, null, composer)} className="space-y-2">
            <textarea
              required
              maxLength={2000}
              rows={3}
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              placeholder={isOwner ? "Post an update for your fans…" : "Say something to the community…"}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
            {error ? <p className="text-xs" style={{ color: "#8B1E1E" }}>{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Post
            </button>
          </form>

          {posts.length === 0 ? (
            <p className="text-sm opacity-60">No posts yet — be the first to say something.</p>
          ) : (
            <ul className="space-y-3">
              {posts.map((p) => (
                <PostRow key={p.id} post={p} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
