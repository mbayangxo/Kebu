"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  authorName: string;
  publishedAt: string | null;
};

export function SiteBlogSection({
  heading,
  subheading,
  postsPerPage,
  siteBase,
  subdomain,
  preview,
}: {
  heading: string;
  subheading: string;
  postsPerPage: number;
  siteBase: string;
  subdomain?: string;
  preview?: boolean;
}) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subdomain) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void fetch(`/api/public/sites/${subdomain}/blog`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setPosts(Array.isArray(d.posts) ? d.posts.slice(0, postsPerPage) : []);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subdomain, postsPerPage]);

  return (
    <section className="px-4 sm:px-6 py-12 max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2">{heading}</h2>
      {subheading ? <p className="text-sm opacity-70 mb-8">{subheading}</p> : null}

      {loading ? (
        <p className="text-sm opacity-60">Loading posts…</p>
      ) : posts.length === 0 ? (
        <p className="text-sm opacity-60 rounded-xl border border-dashed p-6 text-center">
          {preview ? "No published posts yet — add posts in the builder Blog panel." : "No posts yet."}
        </p>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.id} className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: "#E8E6DF" }}>
              {post.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.coverUrl} alt="" className="mb-4 w-full max-h-48 object-cover rounded-xl" />
              ) : null}
              <h3 className="text-lg font-semibold">
                <Link href={`${siteBase}/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </h3>
              {post.excerpt ? <p className="mt-2 text-sm opacity-75 line-clamp-3">{post.excerpt}</p> : null}
              <p className="mt-3 text-[11px] uppercase tracking-wider opacity-50">
                {post.authorName || "Team"}
                {post.publishedAt ? ` · ${new Date(post.publishedAt).toLocaleDateString()}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
