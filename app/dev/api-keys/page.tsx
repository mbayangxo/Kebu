"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

const T = { border: KEBU.border } as const;

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsed: string | null;
  createdAt: string;
};

const MOCK_KEYS: ApiKey[] = [];

function KeyRow({ apiKey }: { apiKey: ApiKey }) {
  return (
    <div
      className="group flex items-center gap-4 px-5 py-3.5 transition-colors"
      style={{ borderBottom: `1px solid ${T.border}` }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(10,10,10,0.025)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: KEBU.black }}>{apiKey.name}</p>
        <p className="text-xs mt-0.5 font-mono" style={{ color: KEBU.muted, letterSpacing: "0.04em" }}>
          {apiKey.prefix}••••••••••••••••
        </p>
      </div>
      <div className="hidden sm:flex flex-wrap gap-1 shrink-0">
        {apiKey.scopes.slice(0, 3).map((s) => (
          <span
            key={s}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(10,10,10,0.06)", color: KEBU.muted }}
          >
            {s}
          </span>
        ))}
        {apiKey.scopes.length > 3 && (
          <span className="text-[10px]" style={{ color: KEBU.faint }}>+{apiKey.scopes.length - 3}</span>
        )}
      </div>
      <p className="shrink-0 text-[11px] w-28 text-right" style={{ color: KEBU.muted }}>
        {apiKey.lastUsed ? `Used ${apiKey.lastUsed}` : "Never used"}
      </p>
      <div className="shrink-0 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" className="text-[11px] font-semibold" style={{ color: KEBU.orange }}>
          Rename
        </button>
        <span style={{ color: T.border }}>·</span>
        <button type="button" className="text-[11px] font-semibold" style={{ color: "#EF4444" }}>
          Revoke
        </button>
      </div>
    </div>
  );
}

export default function DevApiKeysPage() {
  return (
    <AppShell
      title="API Keys"
      actions={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-[0.97] hover:brightness-105 opacity-50 cursor-not-allowed"
          style={{ background: KEBU.orange, color: KEBU.white }}
          title="Coming soon — API key schema not yet configured"
          disabled
        >
          + Create Key
        </button>
      }
    >
      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Info banner */}
        <div
          className="flex items-start gap-4 rounded-2xl px-5 py-4 mb-8"
          style={{ background: KEBU.white, border: `1px solid ${T.border}` }}
        >
          <span className="text-xl shrink-0">🔑</span>
          <div>
            <p className="text-sm font-bold mb-0.5" style={{ color: KEBU.black }}>
              API Keys let your apps talk to Kebu
            </p>
            <p className="text-xs leading-relaxed" style={{ color: KEBU.muted }}>
              Each key has a scope (read-only, site management, commerce, messaging) and can be rotated or revoked at any time.
              Keys are shown once — copy them immediately.
            </p>
            <p className="text-[11px] mt-2 font-semibold" style={{ color: KEBU.orange }}>
              API key management requires database setup — contact support to enable.
            </p>
          </div>
        </div>

        {/* Keys list */}
        {MOCK_KEYS.length > 0 ? (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${T.border}`, background: KEBU.white }}
          >
            <div
              className="flex items-center gap-4 px-5 py-2.5"
              style={{ borderBottom: `1px solid ${T.border}`, background: "rgba(10,10,10,0.03)" }}
            >
              {["Key", "Scopes", "Last used", ""].map((h) => (
                <p key={h} className="text-[10px] font-bold uppercase tracking-[0.14em] flex-1" style={{ color: KEBU.muted }}>
                  {h}
                </p>
              ))}
            </div>
            {MOCK_KEYS.map((k) => <KeyRow key={k.id} apiKey={k} />)}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-2xl text-center"
            style={{ border: `1.5px dashed ${T.border}`, background: KEBU.white }}
          >
            <span className="text-4xl mb-4">🔐</span>
            <p className="text-base font-bold mb-1" style={{ color: KEBU.black }}>No API keys yet</p>
            <p className="text-sm mb-2 max-w-xs" style={{ color: KEBU.muted }}>
              Create a key to connect your app to Kebu&apos;s APIs — sites, commerce, messages, Opportunity OS.
            </p>
            <p className="text-xs" style={{ color: KEBU.faint }}>
              Available once developer account is activated.{" "}
              <Link href="/dev" className="underline" style={{ color: KEBU.orange }}>
                Learn more
              </Link>
            </p>
          </div>
        )}

        {/* Docs link */}
        <div className="flex items-center justify-between mt-6 pt-5" style={{ borderTop: `1px solid ${T.border}` }}>
          <p className="text-xs" style={{ color: KEBU.muted }}>
            Need help?{" "}
            <Link href="/dev/docs" className="font-semibold underline" style={{ color: KEBU.orange }}>
              Read the API documentation
            </Link>
          </p>
          <p className="text-[11px]" style={{ color: KEBU.faint }}>Kebu API v1</p>
        </div>

      </div>
    </AppShell>
  );
}
