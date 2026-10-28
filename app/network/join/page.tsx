"use client";
export const dynamic = "force-dynamic";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/app/components/nav";
import { LanguageBar } from "@/app/components/language-bar";
import { useLocale } from "@/app/components/locale-context";
import { NETWORK_NEEDS, SECTORS, BUSINESS_STAGES } from "@/lib/network/types";
import { networkT, needLabel, sectorLabel, stageLabel } from "@/lib/network/network-i18n";
type NetworkNeed = (typeof NETWORK_NEEDS)[number];

const NEEDS = NETWORK_NEEDS;

export default function NetworkJoinPage() {
  const router = useRouter();
  const { lang } = useLocale();
  const tt = (key: Parameters<typeof networkT>[1]) => networkT(lang, key);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const submissionId = useRef<string | null>(null);

  // Form
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [headline, setHeadline] = useState("");
  const [building, setBuilding] = useState("");
  const [offering, setOffering] = useState("");
  const [lookingFor, setLookingFor] = useState<NetworkNeed[]>([]);
  const [stage, setStage] = useState("");
  const [languages, setLanguages] = useState("");

  function toggleNeed(need: NetworkNeed) {
    setLookingFor((prev) => prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      submissionId.current ??= crypto.randomUUID();
      const res = await fetch("/api/network/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId.current, name, location, country, sector, headline, building,
          offering, looking_for: lookingFor, stage,
          languages: languages.split(",").map(value => value.trim()).filter(Boolean) }),
      });
      const result = await res.json();
      if (!res.ok || result.profile?.id !== submissionId.current) {
        setError(res.status === 401 ? tt("error_signed_out_join")
          : result.error ?? tt("error_not_confirmed_generic"));
        return;
      }
      setSubmitted(true);
    } catch {
      setError(tt("error_not_confirmed_catch"));
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-warm-ivory">
        <LanguageBar variant="builder" />
        <Nav />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-deep-green text-ivory text-2xl flex items-center justify-center mx-auto mb-6">
            ✓
          </div>
          <h1 className="font-display text-3xl font-bold text-ink mb-3">
            {tt("success_heading")}
          </h1>
          <p className="text-muted mb-8">
            {tt("success_body")}
          </p>
          <button
            onClick={() => router.push("/network")}
            className="bg-deep-green text-ivory font-bold px-6 py-3 rounded-xl hover:bg-mid-green transition-colors"
          >
            {tt("button_view_network")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-ivory">
      <LanguageBar variant="builder" />
      <Nav />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink mb-2">
            {tt("join_title")}
          </h1>
          <p className="text-muted text-sm">
            {tt("join_intro")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={loading} aria-busy={loading} className="min-w-0 space-y-6">
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-base font-bold text-ink mb-4">{tt("section_about_you")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="network-name" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">{tt("label_full_name")}</label>
                <input required type="text" id="network-name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} disabled={loading}
                  placeholder={tt("placeholder_full_name")}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold disabled:opacity-60" />
              </div>
              <div>
                <label htmlFor="network-location" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">{tt("label_city_country")}</label>
                <input required type="text" id="network-location" maxLength={160} value={location} onChange={(e) => setLocation(e.target.value)} disabled={loading}
                  placeholder={tt("placeholder_city_country")}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold disabled:opacity-60" />
              </div>
              <div>
                <label htmlFor="network-country" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">{tt("label_country_filter")}</label>
                <input required type="text" id="network-country" maxLength={80} value={country} onChange={(e) => setCountry(e.target.value)} disabled={loading}
                  placeholder={tt("placeholder_country_filter")}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold disabled:opacity-60" />
              </div>
              <div>
                <label htmlFor="network-languages" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">{tt("label_languages_spoken")}</label>
                <input type="text" id="network-languages" maxLength={1200} value={languages} onChange={(e) => setLanguages(e.target.value)} disabled={loading}
                  placeholder={tt("placeholder_languages_spoken")}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold disabled:opacity-60" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-base font-bold text-ink mb-4">{tt("section_what_building")}</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="network-sector" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">{tt("label_sector")}</label>
                {/* value stays the canonical English SECTORS string in every language — only the displayed label is translated */}
                <select required id="network-sector" value={sector} onChange={(e) => setSector(e.target.value)} disabled={loading}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold disabled:opacity-60">
                  <option value="">{tt("select_sector")}</option>
                  {SECTORS.map((s) => <option key={s} value={s}>{sectorLabel(s, lang)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="network-headline" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">{tt("label_headline")}</label>
                <input required type="text" id="network-headline" maxLength={240} value={headline} onChange={(e) => setHeadline(e.target.value)} disabled={loading}
                  placeholder={tt("placeholder_headline")}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold disabled:opacity-60" />
              </div>
              <div>
                <label htmlFor="network-building" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">{tt("label_building")}</label>
                <textarea required id="network-building" maxLength={3000} value={building} onChange={(e) => setBuilding(e.target.value)} disabled={loading}
                  placeholder={tt("placeholder_building")}
                  rows={4}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold resize-none" />
              </div>
              <div>
                <label htmlFor="network-stage" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">{tt("label_stage")}</label>
                {/* value stays the canonical English BUSINESS_STAGES string in every language — only the displayed label is translated */}
                <select required id="network-stage" value={stage} onChange={(e) => setStage(e.target.value)} disabled={loading}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold disabled:opacity-60">
                  <option value="">{tt("select_stage")}</option>
                  {BUSINESS_STAGES.map((s) => <option key={s} value={s}>{stageLabel(s, lang)}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-base font-bold text-ink mb-4">{tt("section_need_offer")}</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-ink mb-3 uppercase tracking-wide">
                  {tt("label_looking_for")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {NEEDS.map((need) => (
                    <button type="button" aria-pressed={lookingFor.includes(need)} key={need} onClick={() => toggleNeed(need)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                        lookingFor.includes(need)
                          ? "bg-deep-green text-ivory border-deep-green"
                          : "bg-white border-border text-ink hover:border-gold"
                      }`}>
                      {needLabel(need, lang)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="network-offering" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                  {tt("label_offering")}
                </label>
                <textarea required id="network-offering" maxLength={3000} value={offering} onChange={(e) => setOffering(e.target.value)} disabled={loading}
                  placeholder={tt("placeholder_offering")}
                  rows={3}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold resize-none" />
              </div>
            </div>
          </div>

          {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            <p>{error}</p>
            <Link href="/login?next=%2Fnetwork%2Fjoin" target="_blank" rel="noopener noreferrer" className="underline">{tt("link_sign_in_other_tab")}</Link>
            {" · "}<Link href="/network" target="_blank" rel="noopener noreferrer" className="underline">{tt("link_check_network")}</Link>
          </div>}
          <button type="submit" disabled={loading || lookingFor.length === 0}
            className="w-full bg-gold text-deep-green font-bold py-4 rounded-xl hover:bg-gold-light transition-colors disabled:opacity-50">
            {loading ? tt("button_submit_loading") : tt("button_submit_idle")}
          </button>

          <p className="text-xs text-muted text-center">
            {tt("footer_privacy_note")}
          </p>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
