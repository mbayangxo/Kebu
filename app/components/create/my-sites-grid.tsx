"use client";

import Link from "next/link";
import { liveSiteUrl, kebuSitePreviewPath } from "@/lib/create/site-urls";
import { KEBU } from "@/lib/kebu-brand";

type Project = {
  id: string;
  title: string;
  status: string;
  subdomain?: string | null;
  project_type: string;
  updated_at: string;
  published_at?: string | null;
};

export function MySitesGrid({ projects }: { projects: Project[] }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
            Kebu Builder
          </p>
          <h1 className="font-display text-3xl font-bold">My sites</h1>
          <p className="text-sm text-muted mt-2 max-w-xl">
            Each site has its own editor, domain connection, and SEO — all inside Kebu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/create/domains"
            className="inline-flex rounded-full px-5 py-2.5 text-sm font-bold border"
            style={{ borderColor: KEBU.border }}
          >
            Kebu Domains
          </Link>
          <Link
            href="/create/new"
            className="inline-flex rounded-full px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: KEBU.orange }}
          >
            + New site
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/15 p-12 text-center bg-white">
          <p className="text-lg font-semibold mb-2">No sites yet</p>
          <p className="text-sm text-muted mb-6">Pick a template or start blank — your first site takes a few minutes.</p>
          <Link href="/create/new" className="font-bold underline" style={{ color: KEBU.orange }}>
            Create your first site
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {projects.map((p) => {
            const preview = kebuSitePreviewPath(p.subdomain) ?? null;
            const live = liveSiteUrl(p.subdomain);
            const published = Boolean(p.published_at) || p.status === "published";
            return (
              <article
                key={p.id}
                className="rounded-2xl border border-black/10 bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  className="h-28 flex items-center justify-center text-white font-display text-xl font-bold px-4 text-center"
                  style={{
                    background: `linear-gradient(135deg, ${KEBU.black} 0%, ${KEBU.orange} 100%)`,
                  }}
                >
                  {p.title}
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{
                        background: published ? "rgba(0,200,81,0.15)" : "rgba(0,0,0,0.06)",
                        color: published ? "#009E40" : KEBU.muted,
                      }}
                    >
                      {published ? "Published" : "Draft"}
                    </span>
                    <span className="text-muted">{p.project_type}</span>
                  </div>
                  {preview ? (
                    <p className="text-xs font-mono text-muted truncate">{preview}</p>
                  ) : (
                    <p className="text-xs text-muted">Set site address in Domain &amp; SEO</p>
                  )}
                  <p className="text-[10px] text-muted">
                    Updated {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      href={`/create/${p.id}`}
                      className="rounded-full px-4 py-2 text-xs font-bold text-white"
                      style={{ background: KEBU.black }}
                    >
                      Edit site
                    </Link>
                    <Link
                      href={`/create/sites/${p.id}`}
                      className="rounded-full px-4 py-2 text-xs font-bold"
                      style={{ background: KEBU.orange, color: KEBU.white }}
                    >
                      Domain &amp; SEO
                    </Link>
                    {live ? (
                      <a
                        href={live}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full px-4 py-2 text-xs font-bold border border-black/15"
                      >
                        View live
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
