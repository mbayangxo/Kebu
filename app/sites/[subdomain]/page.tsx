"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

export default function PublicSitePage() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [definition, setDefinition] = useState<WebsiteDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/sites/${subdomain}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(typeof data.error === "string" ? data.error : "Site not found.");
          return;
        }
        if (!cancelled) setDefinition(data.definition);
      } catch {
        if (!cancelled) setError("Network error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [subdomain]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: "#6B5B45" }}>
        Loading site…
      </div>
    );
  }

  if (error || !definition) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div role="alert" className="text-center">
          <p className="font-semibold mb-2">Site unavailable</p>
          <p className="text-sm" style={{ color: "#6B5B45" }}>
            {error ?? "Not found"}
          </p>
        </div>
      </div>
    );
  }

  return <SiteRenderer definition={definition} mode="live" />;
}
