"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { SiteFormSectionProps } from "@/lib/create/site-forms";

const subscribeToReadiness = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

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
  const ready = useSyncExternalStore(subscribeToReadiness, clientReady, serverReady);
  const [values, setValues] = useState<Record<string, string>>({});
  const pendingSubmission = useRef<{ id: string; signature: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (preview || !subdomain) {
      setError("Publish the site to accept real form submissions.");
      return;
    }
    const signature = JSON.stringify(values);
    if (!pendingSubmission.current || pendingSubmission.current.signature !== signature) pendingSubmission.current = { id: crypto.randomUUID(), signature };
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/public/sites/${encodeURIComponent(subdomain)}/forms/${sectionId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionId: pendingSubmission.current.id,
            values,
            submitterName: values.name,
            submitterEmail: values.email,
            submitterPhone: values.phone,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) pendingSubmission.current = null;
        setError(typeof data.error === "string" ? data.error : "Could not send.");
        return;
      }
      setDone(typeof data.message === "string" ? data.message : formProps.successMessage);
      pendingSubmission.current = null;
      setValues({});
    } catch {
      setError("Could not reach the site. Your message is still here; please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p role="status" className="text-sm opacity-80 mt-4">{done}</p>;
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3 max-w-lg">
      <fieldset disabled={busy || !ready} className="space-y-3">
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
              maxLength={2000}
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
              maxLength={field.type === "email" ? 254 : field.type === "phone" ? 24 : 2000}
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
      </fieldset>
      {error ? <p role="alert" className="text-sm" style={{ color: "#8B1E1E" }}>{error}</p> : null}
      <button
        type="submit"
        disabled={busy || !ready}
        className="kebu-cta rounded-full px-5 py-2 text-sm font-bold disabled:opacity-50"
      >
        {!ready ? "Loading form…" : busy ? "Sending…" : formProps.buttonLabel}
      </button>
    </form>
  );
}
