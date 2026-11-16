"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
type Review = {
  business_id: string;
  country_code: string;
  registry_authority: string;
  registration_number: string;
  registry_url: string;
  recruiter_name: string;
  office_address: string;
  status: string;
  updated_at: string;
};
export default function Page() {
  const [reports, setReports] = useState<
    { id: string; business_id: string; message: string; created_at: string }[]
  >([]);
  const [rows, setRows] = useState<Review[]>([]),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/admin/employer-reviews"),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setRows(d.reviews);
      setReports(d.reports);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reviews.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function decide(e: FormEvent<HTMLFormElement>, row: Review) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/admin/employer-reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId: row.business_id,
            revision: row.updated_at,
            decision: f.get("decision"),
            registry: f.has("registry"),
            recruiter: f.has("recruiter"),
            office: f.has("office"),
            note: f.get("note"),
          }),
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save review.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <Link href="/admin/record" className="underline">
        Kebu Record
      </Link>
      <h1 className="text-3xl font-semibold">Employer safety reviews</h1>
      <p>
        Record checks you actually completed using an independent official
        registry and trusted company contact. A submitted link is evidence to
        investigate, not proof. Approval expires after 90 days and does not
        guarantee safety.
      </p>
      {error && (
        <p role="alert">
          {error}{" "}
          <button className="underline" onClick={() => void load()}>
            Retry
          </button>
        </p>
      )}
      <section>
        <h2 className="text-xl font-semibold">Candidate safety reports</h2>
        {reports.map((r) => (
          <article className="rounded border p-3" key={r.id}>
            <p>
              Company {r.business_id} ·{" "}
              {new Date(r.created_at).toLocaleString()}
            </p>
            <p className="whitespace-pre-wrap">{r.message}</p>
          </article>
        ))}
      </section>
      {rows.map((row) => (
        <section
          className="space-y-3 rounded-xl border p-5"
          key={row.business_id}
        >
          <h2 className="font-semibold">
            {row.registry_authority} · {row.registration_number} ·{" "}
            {row.country_code}
          </h2>
          <p>
            {row.status} · Recruiter: {row.recruiter_name}
          </p>
          <p>Office: {row.office_address || "Not submitted"}</p>
          <a
            className="underline"
            href={row.registry_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Submitted registry source
          </a>
          <form onSubmit={(e) => void decide(e, row)}>
            <fieldset disabled={busy} className="space-y-3">
              {[
                ["registry", "I independently checked the registration"],
                ["recruiter", "I independently confirmed recruiter authority"],
                ["office", "I independently checked this office location"],
              ].map(([name, label]) => (
                <label className="block" key={name}>
                  <input type="checkbox" name={name} /> {label}
                </label>
              ))}
              <label className="block">
                Decision{" "}
                <select name="decision" className="border p-2">
                  <option value="rejected">Reject</option>
                  <option value="approved">Approve</option>
                  <option value="suspended">Suspend</option>
                </select>
              </label>
              <label className="block">
                Evidence and review note
                <textarea
                  required
                  name="note"
                  minLength={20}
                  maxLength={2000}
                  className="block w-full rounded border p-3"
                />
              </label>
              <button className="min-h-11 rounded-full bg-[#FF5500] px-5 text-white">
                Save actual review
              </button>
            </fieldset>
          </form>
        </section>
      ))}
      {!rows.length && !error && <p>No reviews loaded.</p>}
    </main>
  );
}
