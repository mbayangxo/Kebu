"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type ShopRow = { id: string; title: string; subdomain?: string | null };

/** Switch between storefronts without hunting the hub. */
export function ShopStoreSwitcher({
  currentProjectId,
  currentTitle,
}: {
  currentProjectId: string;
  currentTitle?: string;
}) {
  const router = useRouter();
  const [shops, setShops] = useState<ShopRow[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const rows = (Array.isArray(data.projects) ? data.projects : []) as {
        id: string;
        title: string;
        project_type: string;
        subdomain?: string | null;
      }[];
      setShops(
        rows
          .filter((p) => p.project_type === "website")
          .map((p) => ({ id: p.id, title: p.title, subdomain: p.subdomain })),
      );
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (shops.length <= 1) return null;

  return (
    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
      Switch store
      <select
        className="rounded-full px-3 py-2 text-xs font-semibold normal-case tracking-normal"
        style={{ border: `1px solid ${KEBU.border}`, background: "#fff", color: KEBU.black }}
        value={currentProjectId}
        onChange={(e) => {
          const id = e.target.value;
          if (id && id !== currentProjectId) router.push(`/shop/${id}?tab=overview`);
        }}
        aria-label="Switch store"
      >
        {shops.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
            {s.subdomain ? ` · ${s.subdomain}` : ""}
            {s.id === currentProjectId && currentTitle ? "" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
