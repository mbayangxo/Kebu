"use client";

import { useState } from "react";
import type { SiteFormSectionProps } from "@/lib/create/site-forms";

type FormStyle = "standard" | "card" | "dark" | "split" | "booking";

function fieldClass(style: FormStyle) {
  const base =
    "mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2";
  if (style === "dark") {
    return `${base} border-white/15 bg-white/10 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-white/20`;
  }
  if (style === "card" || style === "booking" || style === "split") {
    return `${base} border-black/10 bg-white text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:border-[#FF5500]/50 focus:ring-[#FF5500]/10`;
  }
  return `${base} border-black/15 bg-transparent text-inherit placeholder:text-inherit/40 focus:border-[#FF5500]/60 focus:ring-[#FF5500]/10`;
}

function labelClass(style: FormStyle) {
  if (style === "dark") return "block text-sm font-medium text-white/80";
  return "block text-sm font-medium";
}

function FormFields({
  formProps,
  values,
  onChange,
  style,
}: {
  formProps: SiteFormSectionProps;
  values: Record<string, string>;
  onChange: (id: string, val: string) => void;
  style: FormStyle;
}) {
  return (
    <>
      {formProps.fields.map((field) => (
        <label key={field.id} className={labelClass(style)}>
          <span>
            {field.label}
            {field.required ? " *" : ""}
          </span>
          {field.type === "textarea" ? (
            <textarea
              required={field.required}
              value={values[field.id] ?? ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className={fieldClass(style)}
            />
          ) : field.type === "select" ? (
            <select
              required={field.required}
              value={values[field.id] ?? ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              className={fieldClass(style)}
            >
              <option value="">Choisir…</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
              required={field.required}
              value={values[field.id] ?? ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={fieldClass(style)}
            />
          )}
        </label>
      ))}
    </>
  );
}

export function SiteFormSection({
  sectionId,
  subdomain,
  props: formProps,
  preview = false,
  accent,
}: {
  sectionId: string;
  subdomain?: string;
  props: SiteFormSectionProps & { formStyle?: FormStyle };
  preview?: boolean;
  accent?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const style: FormStyle = formProps.formStyle ?? "standard";
  const accentColor = accent ?? "#FF5500";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview || !subdomain) {
      setError("Publiez le site pour recevoir des vrais envois.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/public/sites/${encodeURIComponent(subdomain)}/forms/${sectionId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            values,
            submitterName: values.name,
            submitterEmail: values.email,
            submitterPhone: values.phone,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Envoi impossible.");
        return;
      }
      setDone(typeof data.message === "string" ? data.message : formProps.successMessage);
      setValues({});
    } finally {
      setBusy(false);
    }
  }

  function updateField(id: string, val: string) {
    setValues((v) => ({ ...v, [id]: val }));
  }

  const submitBtn = (
    <button
      type="submit"
      disabled={busy}
      className="kebu-cta mt-2 rounded-xl px-6 py-3 text-sm font-bold w-full sm:w-auto disabled:opacity-50 transition-opacity"
      style={{ background: accentColor, color: "#fff" }}
    >
      {busy ? "Envoi…" : formProps.buttonLabel}
    </button>
  );

  if (done) {
    return (
      <div className="mt-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: `${accentColor}15`, color: accentColor }}>
        ✓ {done}
      </div>
    );
  }

  /* ── Standard ─────────────────────────────────── */
  if (style === "standard") {
    return (
      <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3 max-w-lg">
        <FormFields formProps={formProps} values={values} onChange={updateField} style={style} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {submitBtn}
      </form>
    );
  }

  /* ── Card ─────────────────────────────────── */
  if (style === "card") {
    return (
      <form
        onSubmit={(e) => void submit(e)}
        className="mt-4 rounded-2xl p-6 sm:p-8 space-y-4 max-w-lg shadow-lg"
        style={{ background: "#fff", border: "1px solid #E8E6DF" }}
      >
        <FormFields formProps={formProps} values={values} onChange={updateField} style={style} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {submitBtn}
      </form>
    );
  }

  /* ── Dark ─────────────────────────────────── */
  if (style === "dark") {
    return (
      <form
        onSubmit={(e) => void submit(e)}
        className="mt-4 rounded-2xl p-6 sm:p-8 space-y-4 max-w-lg"
        style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <FormFields formProps={formProps} values={values} onChange={updateField} style={style} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-xl px-6 py-3 text-sm font-bold w-full sm:w-auto disabled:opacity-50"
          style={{ background: accentColor, color: "#fff" }}
        >
          {busy ? "Envoi…" : formProps.buttonLabel}
        </button>
      </form>
    );
  }

  /* ── Split (accent panel left + form right) ─── */
  if (style === "split") {
    return (
      <div
        className="mt-4 overflow-hidden rounded-2xl max-w-2xl shadow-lg"
        style={{ border: "1px solid #E8E6DF" }}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Accent panel */}
          <div
            className="sm:w-2/5 p-6 sm:p-8 flex flex-col justify-center"
            style={{ background: accentColor }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70 mb-2">
              {formProps.heading || "Contactez-nous"}
            </p>
            {formProps.subheading && (
              <p className="text-sm text-white/80 leading-relaxed">{formProps.subheading}</p>
            )}
            {/* WhatsApp hint */}
            <p className="mt-6 text-xs text-white/60">Réponse en moins d'1h sur WhatsApp</p>
          </div>
          {/* Form panel */}
          <form
            onSubmit={(e) => void submit(e)}
            className="flex-1 bg-white p-6 sm:p-8 space-y-4"
          >
            <FormFields formProps={formProps} values={values} onChange={updateField} style={style} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {submitBtn}
          </form>
        </div>
      </div>
    );
  }

  /* ── Booking (appointment feel) ─────────────── */
  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="mt-4 max-w-lg space-y-0"
    >
      {/* Top header strip */}
      <div
        className="rounded-t-2xl px-5 py-4"
        style={{ background: accentColor }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
          {formProps.heading || "Réserver un créneau"}
        </p>
        {formProps.subheading && (
          <p className="text-sm text-white/70 mt-0.5">{formProps.subheading}</p>
        )}
      </div>
      <div
        className="rounded-b-2xl p-5 space-y-4 shadow-lg"
        style={{ background: "#fff", border: "1px solid #E8E6DF", borderTop: 0 }}
      >
        <FormFields formProps={formProps} values={values} onChange={updateField} style={style} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-50"
          style={{ background: accentColor, color: "#fff" }}
        >
          {busy ? "Envoi…" : formProps.buttonLabel}
        </button>
      </div>
    </form>
  );
}
