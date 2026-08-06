"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

export default function ProjectPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [definition, setDefinition] = useState<WebsiteDefinition | null>(null);
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
      const sections = Array.isArray(data.sections) ? data.sections : [];
      if (!cancelled) {
        setDefinition({
          schemaVersion: "website-v1",
          title: data.project.title,
          theme: data.project.theme ?? {
            primary: "#0F0D33",
            accent: "#00C851",
            background: "#FAFAF8",
            text: "#0F0D33",
            fontDisplay: "Fraunces",
            fontBody: "system-ui",
            spacing: "comfortable",
          },
          pages: [
            {
              slug: "home",
              title: "Home",
              sections: sections
                .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
                .map((s: { id: string; section_type: string; props: Record<string, unknown> }) => ({
                  id: s.id,
                  type: s.section_type,
                  props: s.props,
                })),
            },
          ],
        });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  return (
    <div className="min-h-screen" style={{ background: "#E8E6DF" }}>
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 h-12" style={{ background: "#0F0D33", color: "#fff" }}>
        <Link href={`/create/${id}`} className="text-sm">
          ← Editor
        </Link>
        <button type="button" className="text-xs" onClick={() => setDevice(device === "desktop" ? "mobile" : "desktop")}>
          {device} preview
        </button>
      </div>
      {error && (
        <p className="p-6 text-sm" style={{ color: "#8B1E1E" }}>
          {error}
        </p>
      )}
      <div className="mx-auto py-6" style={{ maxWidth: device === "mobile" ? 390 : 960 }}>
        {definition && <SiteRenderer definition={definition} mode="preview" />}
      </div>
    </div>
  );
}
