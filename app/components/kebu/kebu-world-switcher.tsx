"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import type { AccountWorkspaceContext } from "@/lib/account/workspace-context";

export function KebuWorldSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [context, setContext] = useState<AccountWorkspaceContext | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/workspace", { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (!cancelled && data?.context) setContext(data.context); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function switchTo(value: string) {
    if (busy) return;
    setBusy(true);
    const body = value === "personal" ? { mode: "personal" } : { mode: "business", businessId: value };
    const res = await fetch("/api/me/workspace", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && data.context) {
      setContext(data.context);
      router.refresh();
    }
  }

  return (
    <label className={compact ? "block" : "block px-2 pb-2"}>
      <span className="sr-only">Current Kebu space</span>
      <div className="relative">
        <KebuIcon name="spaces" size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: KEBU.orange }} />
        <select
          value={context?.activeBusinessId ?? "personal"}
          disabled={busy}
          onChange={(event) => void switchTo(event.target.value)}
          className="min-h-9 w-full appearance-none rounded-xl border bg-white pl-8 pr-7 text-[11px] font-bold outline-none focus:ring-2 focus:ring-[#FF6A00]"
          style={{ borderColor: KEBU.borders.default, color: KEBU.black }}
        >
          <option value="personal">Personal Kebu</option>
          {(context?.businesses ?? []).map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-black/35">▾</span>
      </div>
    </label>
  );
}
