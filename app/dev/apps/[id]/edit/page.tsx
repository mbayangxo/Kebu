"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";
import { toast } from "@/app/components/kebu/toast";

const T = { border: KEBU.border } as const;

const CATEGORIES = [
  { id: "site_template",   label: "Site Template",    desc: "Sell in Aesthetic Gallery" },
  { id: "business_tool",   label: "Business Tool",    desc: "CRM, inventory, booking" },
  { id: "mobile_money",    label: "Mobile Money",     desc: "Wave, Orange Money, MTN" },
  { id: "ai_plugin",       label: "AI Plugin",        desc: "Extends Yande AI" },
  { id: "studio_template", label: "Studio Template",  desc: "Posters, flyers, brand kits" },
  { id: "logistics",       label: "Logistics",        desc: "Delivery & shipping" },
] as const;

const PRICING = [
  { id: "free",      label: "Free",         desc: "Anyone can install at no cost" },
  { id: "paid",      label: "Paid",         desc: "Set a one-time price in XOF" },
  { id: "recurring", label: "Subscription", desc: "Monthly or annual plan" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];
type PricingId = (typeof PRICING)[number]["id"];

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: KEBU.muted }}>
      {children}
      {required && <span style={{ color: KEBU.orange }}> *</span>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
      style={{
        background: KEBU.white,
        border: `1.5px solid ${T.border}`,
        color: KEBU.black,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = KEBU.orange; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = T.border; }}
    />
  );
}

function OptionCard({
  active,
  onClick,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl p-3.5 transition-all active:scale-[0.98]"
      style={{
        background: active ? "rgba(255,85,0,0.05)" : KEBU.white,
        border: `1.5px solid ${active ? KEBU.orange : T.border}`,
        boxShadow: active ? "0 0 0 3px rgba(255,85,0,0.08)" : "none",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>{label}</p>
          <p className="text-[11px] mt-0.5" style={{ color: KEBU.muted }}>{desc}</p>
        </div>
        <div
          className="w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center"
          style={{
            borderColor: active ? KEBU.orange : T.border,
            background: active ? KEBU.orange : "transparent",
          }}
        >
          {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  );
}

export default function EditAppPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState<CategoryId | "">("");
  const [pricing, setPricing] = useState<PricingId | "">("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    fetch(`/api/dev/apps/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((j) => {
        if (!j?.app) return;
        const a = j.app;
        if (a.status === "published") { setLocked(true); return; }
        setName(a.name ?? "");
        setTagline(a.tagline ?? "");
        setCategory(a.category ?? "");
        setPricing(a.pricing ?? "");
        setPrice(a.price_xof ? String(a.price_xof) : "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const canSubmit = name.trim().length >= 2 && category && pricing;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);

    const price_xof =
      (pricing === "paid" || pricing === "recurring") && price
        ? parseInt(price, 10)
        : undefined;

    const res = await fetch(`/api/dev/apps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), tagline: tagline.trim() || null, category, pricing, price_xof }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast(json.error ?? "Could not save app.", "error");
      setSaving(false);
      return;
    }

    toast("App saved.", "success");
    router.push(`/dev/apps/${id}`);
  }

  if (loading) {
    return (
      <AppShell title="Edit App">
        <div className="flex justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: KEBU.orange, borderTopColor: "transparent" }} />
        </div>
      </AppShell>
    );
  }

  if (notFound) {
    return (
      <AppShell title="App not found">
        <div className="max-w-xl mx-auto px-5 py-20 text-center">
          <p className="text-base font-bold mb-2" style={{ color: KEBU.black }}>App not found</p>
          <Link href="/dev/apps" className="text-sm font-semibold underline" style={{ color: KEBU.orange }}>← Back to Apps</Link>
        </div>
      </AppShell>
    );
  }

  if (locked) {
    return (
      <AppShell title="Edit App">
        <div className="max-w-xl mx-auto px-5 py-20 text-center">
          <p className="text-base font-bold mb-2" style={{ color: KEBU.black }}>Published apps cannot be edited</p>
          <p className="text-sm mb-6" style={{ color: KEBU.muted }}>Contact support to make changes to a published app.</p>
          <Link href={`/dev/apps/${id}`} className="text-sm font-semibold underline" style={{ color: KEBU.orange }}>← Back to app</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit App">
      <div className="max-w-xl mx-auto px-5 sm:px-8 lg:px-10 py-8">

        <div className="mb-7">
          <Link href={`/dev/apps/${id}`} className="text-xs font-semibold mb-3 inline-flex items-center gap-1" style={{ color: KEBU.muted }}>
            ← Back to App
          </Link>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
            Edit App
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">

          <div>
            <FieldLabel required>App name</FieldLabel>
            <TextInput value={name} onChange={setName} placeholder="e.g. Wave Pay Connector" maxLength={60} />
          </div>

          <div>
            <FieldLabel>Tagline</FieldLabel>
            <TextInput value={tagline} onChange={setTagline} placeholder="One sentence — what does this app do?" maxLength={120} />
          </div>

          <div>
            <FieldLabel required>Category</FieldLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <OptionCard
                  key={c.id}
                  active={category === c.id}
                  onClick={() => setCategory(c.id)}
                  label={c.label}
                  desc={c.desc}
                />
              ))}
            </div>
          </div>

          <div>
            <FieldLabel required>Pricing</FieldLabel>
            <div className="space-y-2">
              {PRICING.map((p) => (
                <OptionCard
                  key={p.id}
                  active={pricing === p.id}
                  onClick={() => setPricing(p.id)}
                  label={p.label}
                  desc={p.desc}
                />
              ))}
            </div>
          </div>

          {(pricing === "paid" || pricing === "recurring") && (
            <div>
              <FieldLabel required>
                {pricing === "paid" ? "Price (XOF)" : "Monthly price (XOF)"}
              </FieldLabel>
              <TextInput value={price} onChange={setPrice} placeholder="e.g. 2500" type="number" />
              <p className="text-[11px] mt-1.5" style={{ color: KEBU.muted }}>
                Kebu takes a 15% platform fee. You keep 85%.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="rounded-xl px-6 py-2.5 text-sm font-bold transition-all active:scale-[0.97] hover:brightness-105 disabled:opacity-40"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <Link href={`/dev/apps/${id}`} className="text-sm font-semibold" style={{ color: KEBU.muted }}>
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </AppShell>
  );
}
