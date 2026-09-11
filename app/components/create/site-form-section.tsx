"use client";

import { useState } from "react";
import type { SiteFormSectionProps } from "@/lib/create/site-forms";

export function SiteFormSection({
  sectionId,
  subdomain,
  props: formProps,
  preview = false,
}: {
  sectionId: string;
  subdomain?: string;
  props: SiteFormSectionProps;
  preview?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview || !subdomain) {
      setError("Publish the site to accept real form submissions.");
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
        setError(typeof data.error === "string" ? data.error : "Could not send.");
        return;
      }
      setDone(typeof data.message === "string" ? data.message : formProps.successMessage);
      setValues({});
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="text-sm opacity-80 mt-4">{done}</p>;
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3 max-w-lg">
      {formProps.fields.map((field) => (
        <label key={field.id} className="block text-sm">
          <span className="font-medium">
            {field.label}
            {field.required ? " *" : ""}
          </span>
          {field.type === "textarea" ? (
            <textarea
              required={field.required}
              value={values[field.id] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
              placeholder={field.placeholder}
              rows={4}
              className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-sm"
            />
          ) : field.type === "select" ? (
            <select
              required={field.required}
              value={values[field.id] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-sm"
            >
              <option value="">Choose…</option>
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
              onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
              placeholder={field.placeholder}
              className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-sm"
            />
          )}
        </label>
      ))}
      {error ? <p className="text-sm" style={{ color: "#8B1E1E" }}>{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="kebu-cta rounded-full px-5 py-2 text-sm font-bold disabled:opacity-50"
      >
        {busy ? "Sending…" : formProps.buttonLabel}
      </button>
    </form>
  );
}
