"use client";

import Link from "next/link";
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
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.context) setContext(data.context);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function switchPersonal() {
    if (busy || context?.mode === "personal") return;
    setBusy(true);
    try {
      const res = await fetch("/api/me/workspace", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "personal" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.context) {
        setContext(data.context);
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function switchBusiness(businessId: string) {
    if (busy || !businessId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/me/workspace", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "business", businessId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.context) {
        setContext(data.context);
        router.push("/business");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const businesses = context?.businesses ?? [];
  const businessMode = context?.mode === "business";

  return (
    <div className={compact ? "space-y-2" : "px-2 pb-3"}>
      <p className="mb-1.5 px-1 text-[9px] font-black uppercase tracking-[.15em]" style={{ color: KEBU.faint }}>
        Kebu mode
      </p>

      <div
        className="grid grid-cols-2 rounded-[12px] border bg-[#F8F6F3] p-1"
        style={{ borderColor: KEBU.borders.default }}
        aria-label="Switch between Personal and Business Kebu"
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => void switchPersonal()}
          className="flex min-h-9 items-center justify-center gap-1.5 rounded-[9px] px-2 text-[10px] font-black transition disabled:opacity-50"
          style={{
            background: !businessMode ? KEBU.white : "transparent",
            color: !businessMode ? KEBU.black : KEBU.muted,
            boxShadow: !businessMode ? "0 1px 5px rgba(10,10,10,.07)" : undefined,
          }}
        >
          <KebuIcon name="people" size={13} />
          Personal
        </button>

        {businesses.length ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void switchBusiness(context?.activeBusinessId ?? businesses[0]!.id)}
            className="flex min-h-9 items-center justify-center gap-1.5 rounded-[9px] px-2 text-[10px] font-black transition disabled:opacity-50"
            style={{
              background: businessMode ? KEBU.white : "transparent",
              color: businessMode ? KEBU.black : KEBU.muted,
              boxShadow: businessMode ? "0 1px 5px rgba(10,10,10,.07)" : undefined,
            }}
          >
            <KebuIcon name="spaces" size={13} />
            Business
          </button>
        ) : (
          <Link
            href="/business/register"
            className="flex min-h-9 items-center justify-center gap-1.5 rounded-[9px] px-2 text-[10px] font-black"
            style={{ color: KEBU.muted }}
          >
            <KebuIcon name="spaces" size={13} />
            Activate
          </Link>
        )}
      </div>

      {businessMode && businesses.length > 1 ? (
        <label className="block">
          <span className="sr-only">Active business</span>
          <select
            value={context?.activeBusinessId ?? ""}
            disabled={busy}
            onChange={(event) => void switchBusiness(event.target.value)}
            className="mt-1 min-h-9 w-full rounded-xl border bg-white px-3 text-[10px] font-bold outline-none focus:ring-2 focus:ring-[#FF6A00]"
            style={{ borderColor: KEBU.borders.default, color: KEBU.black }}
          >
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </label>
      ) : businessMode && context?.activeBusiness ? (
        <p className="truncate px-1 text-[9px] font-semibold" style={{ color: KEBU.muted }}>
          {context.activeBusiness.name}
        </p>
      ) : null}
    </div>
  );
}
