"use client";

import { useCallback, useEffect, useState } from "react";
import { BUILDER } from "@/lib/create/builder-ui";
import { slugifyBlogTitle } from "@/lib/create/site-blog";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverUrl: string;
  authorName: string;
  status: string;
};

export function BuilderBlogPanel({ projectId }: { projectId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    authorName: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/blog-posts`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load blog posts.");
        return;
      }
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    const slug = draft.slug.trim() || slugifyBlogTitle(title);
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/blog-posts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          excerpt: draft.excerpt,
          body: draft.body,
          authorName: draft.authorName,
          status: "published",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create post.");
        return;
      }
      setDraft({ title: "", slug: "", excerpt: "", body: "", authorName: "" });
      setShowNewPost(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(post: Post) {
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/blog-posts`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          patch: { status: post.status === "published" ? "draft" : "published" },
        }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removePost(postId: string) {
    if (!window.confirm("Delete this post?")) return;
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/blog-posts`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: BUILDER.muted }}>
        Add a <strong>Blog</strong> section to your page — published posts appear automatically.
      </p>

      {loading ? <p className="text-xs">Loading…</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <ul className="space-y-2">
        {posts.map((post) => (
          <li
            key={post.id}
            className="rounded-xl border px-3 py-2 flex items-center justify-between gap-2"
            style={{ borderColor: BUILDER.border }}
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{post.title}</p>
              <p className="text-[10px] font-mono opacity-60">/blog/{post.slug}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                disabled={busy}
                className="text-[10px] font-bold px-2 py-1 rounded"
                style={{ border: `1px solid ${BUILDER.border}` }}
                onClick={() => void toggleStatus(post)}
              >
                {post.status === "published" ? "Unpublish" : "Publish"}
              </button>
              <button
                type="button"
                disabled={busy}
                className="text-[10px] font-bold text-red-600 px-2 py-1"
                onClick={() => void removePost(post.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setShowNewPost((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
        style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.muted }}
      >
        <span>+ New post</span>
        <span>{showNewPost ? "▲" : "▼"}</span>
      </button>

      {showNewPost ? (
        <form onSubmit={(e) => void createPost(e)} className="space-y-2 rounded-xl border p-3" style={{ borderColor: BUILDER.border }}>
          <input
            className="w-full text-sm rounded-lg px-2 py-1.5"
            style={{ border: `1px solid ${BUILDER.border}` }}
            placeholder="Title"
            value={draft.title}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                title: e.target.value,
                slug: d.slug || slugifyBlogTitle(e.target.value),
              }))
            }
          />
          <input
            className="w-full text-sm rounded-lg px-2 py-1.5 font-mono"
            style={{ border: `1px solid ${BUILDER.border}` }}
            placeholder="slug"
            value={draft.slug}
            onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
          />
          <textarea
            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[60px]"
            style={{ border: `1px solid ${BUILDER.border}` }}
            placeholder="Excerpt"
            value={draft.excerpt}
            onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))}
          />
          <textarea
            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[80px]"
            style={{ border: `1px solid ${BUILDER.border}` }}
            placeholder="Body (markdown-style plain text)"
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          />
          <button
            type="submit"
            disabled={busy || !draft.title.trim()}
            className="rounded-full px-4 py-2 text-[10px] font-bold uppercase text-white disabled:opacity-50"
            style={{ background: BUILDER.ink }}
          >
            Publish post
          </button>
        </form>
      ) : null}
    </div>
  );
}
