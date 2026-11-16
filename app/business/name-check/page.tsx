"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { nameResearchSources } from "@/lib/business/name-research";
import {
  ActionForm,
  Field,
  TextArea,
  formText,
  type SaveCompanyAction,
} from "@/app/components/company/action-form";
type Saved = {
  id: string;
  name: string;
  country_code: string;
  goods_services: string;
};
export default function Page() {
  const [names, setNames] = useState<Saved[]>([]),
    [matches, setMatches] = useState<
      { name: string; kebuId: string; country: string }[] | null
    >(null),
    [error, setError] = useState<string | null>(null),
    [coverage, setCoverage] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/businesses/name-check", {
          cache: "no-store",
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setNames(d.names);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load saved names.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const save: SaveCompanyAction = async (_action, data, id) => {
    const r = await fetch("/api/businesses/name-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      }),
      d = await r.json();
    if (!r.ok) throw Error(d.error);
    setError(null);
    setMatches(d.matches);
    setCoverage(d.coverage);
    await load();
  };
  return (
    <AppShell title="Business naming research">
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <Link className="underline" href="/business">
          Business Kebu
        </Link>
        <h1 className="text-3xl font-semibold">
          Find and research your business name
        </h1>
        <p>
          Save a private shortlist and look for similar names among reviewed
          Kebu employers. Company-name registration, domain ownership and
          trademark rights are separate checks.
        </p>
        <ActionForm
          action="research"
          label="Save name and check Kebu matches"
          save={save}
          build={(f) => ({
            name: formText(f, "name"),
            country: formText(f, "country").toUpperCase(),
            goods: formText(f, "goods"),
          })}
        >
          <Field label="Business name" name="name" maxLength={120} />
          <Field
            label="Target country code (for example SN)"
            name="country"
            maxLength={2}
          />
          <TextArea
            label="Goods or services (for example clothing or restaurant services)"
            name="goods"
            maxLength={1000}
          />
        </ActionForm>
        {error && (
          <p role="alert">
            {error}{" "}
            <button className="underline" onClick={() => void load()}>
              Retry saved names
            </button>
          </p>
        )}
        {matches && (
          <section className="space-y-3 rounded-xl border bg-white p-5">
            <h2 className="text-xl font-semibold">KEBU name matches</h2>
            <p>{coverage}</p>
            {matches.length ? (
              matches.map((row) => (
                <p key={row.kebuId}>
                  {row.name} · {row.kebuId} · {row.country}
                </p>
              ))
            ) : (
              <p>
                No matches were returned from this limited Kebu search. This
                does not mean the name is legally available.
              </p>
            )}
            <p className="font-semibold">
              Trademark registers have not been searched by Kebu.
            </p>
          </section>
        )}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Check official trademark sources
          </h2>
          <p>
            Check each target country and relevant goods/services, including
            similar spellings and names. WIPO prohibits automated querying and
            bulk copying; Kebu does not scrape or mirror its database. An
            official similarity search or professional review may be needed.
          </p>
          {nameResearchSources.map((s) => (
            <article className="rounded-xl border p-4" key={s.url}>
              <a
                className="font-semibold underline"
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {s.name}
              </a>
              <p>{s.scope}</p>
            </article>
          ))}
        </section>
        <section>
          <h2 className="text-xl font-semibold">My saved shortlist</h2>
          {names.map((n) => (
            <article className="border-b py-3" key={n.id}>
              <h3 className="font-semibold">
                {n.name} · {n.country_code}
              </h3>
              <p>{n.goods_services}</p>
              <p>Official trademark clearance: not recorded</p>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
