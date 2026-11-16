"use client";
import { useRef, useState, type ReactNode, type FormEvent } from "react";
export type SaveCompanyAction = (
  action: string,
  data: Record<string, unknown>,
  id: string,
) => Promise<void>;
export function ActionForm({
  action,
  build,
  save,
  label,
  children,
}: {
  action: string;
  build: (form: FormData) => Record<string, unknown>;
  save: SaveCompanyAction;
  label: string;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const pending = useRef<{ signature: string; id: string } | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const form = e.currentTarget;
    try {
      const payload = build(new FormData(form)),
        signature = JSON.stringify(payload);
      if (pending.current?.signature !== signature)
        pending.current = { signature, id: crypto.randomUUID() };
      await save(action, payload, pending.current.id);
      pending.current = null;
      form.reset();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save. Your input is kept.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <fieldset disabled={busy} className="space-y-3">
        {children}
        <button
          className="min-h-11 rounded-full bg-[#FF5500] px-5 py-2 font-semibold text-white disabled:opacity-50"
          type="submit"
        >
          {busy ? "Saving…" : label}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">
          {error}
        </p>
      )}
    </form>
  );
}
export function Field({
  label,
  name,
  type = "text",
  required = true,
  maxLength = 160,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="mt-1 block min-h-11 w-full rounded-lg border border-black/20 bg-white px-3 py-2 font-normal"
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        step={type === "number" ? "any" : undefined}
      />
    </label>
  );
}
export function TextArea({
  label,
  name,
  maxLength = 4000,
}: {
  label: string;
  name: string;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea
        className="mt-1 block w-full rounded-lg border border-black/20 bg-white p-3 font-normal"
        name={name}
        required
        rows={4}
        maxLength={maxLength}
      />
    </label>
  );
}
export const formText = (f: FormData, name: string) =>
  String(f.get(name) ?? "");
