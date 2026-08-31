"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { CreateShell } from "@/app/components/create/create-shell";
import { buildDefinitionFromProjectParts } from "@/lib/create/editor-definition";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

export default function ProjectPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [definition, setDefinition] = useState<WebsiteDefinition | null>(null);
  const [pages, setPages] = useState<Array<{ id: string; slug: string; title: string; sort_order: number }>>([]);
  const [previewPageSlug, setPreviewPageSlug] = useState("home");
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/projects/${id}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/create/${id}/preview`);
        return;
      }
      if (!res.ok) {
        if (!cancelled) setError(data.error ?? "Could not load preview.");
        return;
      }
      const pageRows = Array.isArray(data.pages) ? data.pages : [];
      const sections = Array.isArray(data.sections) ? data.sections : [];
      if (!cancelled) {
        setPages(pageRows);
        setSubdomain(data.project?.subdomain ?? null);
        setDefinition(buildDefinitionFromProjectParts(data.project, pageRows, sections));
        if (pageRows[0]?.slug) setPreviewPageSlug(pageRows[0].slug);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  return (
    <div className="min-h-screen" style={{ background: "#111" }}>
      <CreateShell
        step="preview"
        projectId={id}
        title="Preview"
        actions={
          <>
            {pages.length > 1 &&
              pages
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: previewPageSlug === p.slug ? "#00C851" : "#1C1A45",
                      color: previewPageSlug === p.slug ? "#0F0D33" : "#fff",
                    }}
                    onClick={() => setPreviewPageSlug(p.slug)}
                  >
                    {p.title}
                  </button>
                ))}
            <button
              type="button"
              className="rounded-full px-3 py-1 text-[10px] uppercase"
              style={{ background: "#1C1A45", color: "#fff" }}
              onClick={() => setDevice(device === "desktop" ? "mobile" : "desktop")}
            >
              {device}
            </button>
            <Link
              href={`/create/${id}`}
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "#00C851", color: "#0F0D33" }}
            >
              Back to editor
            </Link>
          </>
        }
      />

      {subdomain ? (
        <p className="text-center text-[10px] py-2 text-white/50">
          Live address after publish:{" "}
          <span className="text-[#00C851]">https://{subdomain}.kebu.africa</span>
        </p>
      ) : null}

      {error && <p className="p-6 text-sm text-white/70">{error}</p>}

      <div className="mx-auto py-6 px-2" style={{ maxWidth: device === "mobile" ? 390 : 960 }}>
        {definition && (
          <SiteRenderer
            definition={definition}
            mode="preview"
            pageSlug={previewPageSlug}
            siteBase={subdomain ? `/sites/${subdomain}` : undefined}
          />
        )}
      </div>
    </div>
  );
}
