"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
export function EmployerVerificationPanel({
  businessId,
}: {
  businessId: string;
}) {
  const [status, setStatus] = useState("Loading…"),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(`/api/liguey/employers/${businessId}/verification`),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setStatus(
        d.review
          ? `${d.review.status}${d.review.review_note ? `: ${d.review.review_note}` : ""}`
          : "Not submitted",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load review.");
    }
  }, [businessId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch(
          `/api/liguey/employers/${businessId}/verification`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(f)),
          },
        ),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit review.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto max-w-2xl space-y-6 p-6">
      <Link href={`/business/${businessId}/liguey`} className="underline">
        Back to hiring
      </Link>
      <h1 className="text-3xl font-semibold">Company and recruiter review</h1>
      <p>
        Before you publish jobs or arrange interviews, Kebu checks your company
        registration and authority to recruit. An office must be reviewed before
        an in-person interview. This does not guarantee anyone’s safety.
      </p>
      <p role="status">Review: {status}</p>
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => void load()} className="underline">
            Retry
          </button>
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          {[
            ["country", "Country code (for example SN)"],
            ["authority", "Official registration authority"],
            ["number", "Company registration number"],
            ["url", "Official registry record URL"],
            ["recruiter", "Authorized recruiter’s name"],
            ["office", "Office address (optional for online-only interviews)"],
          ].map(([name, label]) => (
            <label className="block" key={name}>
              {label}
              <input
                className="mt-1 block min-h-11 w-full rounded-lg border p-3"
                name={name}
                required={name !== "office"}
                maxLength={
                  name === "url"
                    ? 2000
                    : name === "office"
                      ? 500
                      : name === "country"
                        ? 2
                        : 160
                }
                type={name === "url" ? "url" : "text"}
                autoCapitalize={name === "country" ? "characters" : "off"}
              />
            </label>
          ))}
          <p className="text-sm">
            Updating these details restarts review. Do not submit passports,
            bank details or candidate information in this form.
          </p>
          <button
            className="min-h-11 rounded-full bg-[#FF5500] px-6 py-2 text-white"
            type="submit"
          >
            {busy ? "Submitting…" : "Submit for review"}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
