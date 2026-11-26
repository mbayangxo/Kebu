"use client";

import { useState } from "react";
import Link from "next/link";
import { useKebuAccountContext } from "@/app/hooks/use-kebu-account-context";
import { KEBU } from "@/lib/kebu-brand";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";

/** Personal Kebu ↔ Business Kebu (Kebu ID) switcher — server-persisted. */
export function KebuAccountContextSwitcher({ compact = false }: { compact?: boolean }) {
  const { context, loading, switchContext } = useKebuAccountContext();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (loading && !context) {
    return (
      <p className="text-[10px] text-white/40 px-3" aria-live="polite">
        Loading account…
      </p>
    );
  }

  if (!context) return null;

  async function pickPersonal() {
    if (context?.mode === "personal" || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await switchContext({ mode: "personal" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Switch failed.");
    } finally {
      setBusy(false);
    }
  }

  async function pickBusiness(businessId: string) {
    if (context?.activeBusinessId === businessId || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await switchContext({ mode: "business", businessId });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Switch failed.");
    } finally {
      setBusy(false);
    }
  }

  const label =
    context.mode === "business" && context.activeBusiness
      ? context.activeBusiness.name
      : "Personal Kebu";

  if (compact) {
    return (
      <div className="px-3">
        <p className="text-[9px] font-semibold text-white/45 mb-1">Account</p>
        <p className="text-[11px] font-semibold text-white truncate" title={label}>
          {label}
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 pb-4" style={{ borderBottom: "1px solid rgba(255,85,0,0.15)" }}>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: KEBU.orange }}>
        Current space
      </p>
      <p className="text-[10px] text-white/50 mb-2 leading-snug">
        Personal and business work stay separate. Switch without changing accounts.
      </p>

      <div className="space-y-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => void pickPersonal()}
          className="flex w-full items-center gap-2.5 text-left rounded-lg px-2.5 py-2 text-[12px] font-semibold transition-colors disabled:opacity-60"
          style={{
            background: context.mode === "personal" ? "rgba(255,85,0,0.25)" : "transparent",
            color: context.mode === "personal" ? KEBU.white : "rgba(255,255,255,0.75)",
            border:
              context.mode === "personal" ? `1px solid ${KEBU.orange}` : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10"><KebuIcon name="people" size={14}/></span><span className="min-w-0 flex-1"><span className="block truncate">Personal</span><span className="block text-[9px] font-normal text-white/45">Only your work</span></span>
        </button>

        {context.businesses.map((b) => (
          <button
            key={b.id}
            type="button"
            disabled={busy}
            onClick={() => void pickBusiness(b.id)}
            className="flex w-full items-center gap-2.5 text-left rounded-lg px-2.5 py-2 text-[12px] font-semibold transition-colors disabled:opacity-60"
            style={{
              background: context.activeBusinessId === b.id ? "rgba(255,85,0,0.25)" : "transparent",
              color: context.activeBusinessId === b.id ? KEBU.white : "rgba(255,255,255,0.75)",
              border:
                context.activeBusinessId === b.id
                  ? `1px solid ${KEBU.orange}`
                  : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10"><KebuIcon name="spaces" size={14}/></span><span className="min-w-0 flex-1"><span className="block truncate">{b.name}</span><span className="block text-[9px] font-normal text-white/45 truncate">{b.publicKebuId}</span></span>
          </button>
        ))}
      </div>

      {context.businesses.length === 0 ? (
        <Link
          href="/business/register"
          className="mt-2 inline-block text-[10px] font-semibold text-white/55 hover:text-[#FF5500]"
        >
          Create a business →
        </Link>
      ) : context.mode === "business" && context.activeBusiness ? (
        <Link
          href={`/business/${context.activeBusiness.id}`}
          className="mt-2 inline-block text-[10px] font-semibold text-white/55 hover:text-[#FF5500]"
        >
          Open business dashboard →
        </Link>
      ) : null}

      {err ? (
        <p className="mt-2 text-[10px]" style={{ color: KEBU.red }} role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
