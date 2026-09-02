import { Nav } from "@/app/components/nav";
import { SAMPLE_OPPORTUNITIES } from "@/lib/data/sample-opportunities";
import { ALL_COUNTRY_PROGRAMS } from "@/lib/data/all-country-programs";
import { NETWORK_PROFILES } from "@/lib/data/network-profiles";
import { FEED_ITEMS } from "@/lib/data/feed-items";
import Link from "next/link";

export default function AdminPage() {
  const total = SAMPLE_OPPORTUNITIES.length;
  const countries = new Set(SAMPLE_OPPORTUNITIES.map((o) => o.country)).size;
  const countryPrograms = ALL_COUNTRY_PROGRAMS.length;

  const byType: Record<string, number> = {};
  for (const o of SAMPLE_OPPORTUNITIES) {
    byType[o.type] = (byType[o.type] ?? 0) + 1;
  }

  const bySector: Record<string, number> = {};
  for (const o of SAMPLE_OPPORTUNITIES) {
    for (const s of o.sectors) {
      bySector[s] = (bySector[s] ?? 0) + 1;
    }
  }
  const topSectors = Object.entries(bySector).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const byCountry: Record<string, number> = {};
  for (const o of SAMPLE_OPPORTUNITIES) {
    byCountry[o.country] = (byCountry[o.country] ?? 0) + 1;
  }
  const topCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="min-h-screen bg-warm-ivory">
      <Nav />

      <div className="bg-deep-green text-ivory py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-2">Internal</p>
          <h1 className="font-display text-3xl font-bold text-ivory">Data Admin</h1>
          <p className="text-ivory/60 text-sm mt-1">
            Legacy static opportunity counts. For live platform ops use{" "}
            <Link href="/admin/record" className="underline text-gold">
              Kebu Record
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: total, label: "Total opportunities" },
            { value: countries, label: "Countries covered" },
            { value: countryPrograms, label: "Country program pages" },
            { value: NETWORK_PROFILES.length, label: "Network profiles" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white border border-border rounded-2xl p-5 text-center">
              <p className="font-display text-4xl font-bold text-deep-green mb-1">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>

        {/* By Type */}
        <div className="bg-white border border-border rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold text-ink mb-4">Opportunities by type</h2>
          <div className="space-y-2">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-ink">{type}</span>
                    <span className="text-sm font-bold text-deep-green">{count}</span>
                  </div>
                  <div className="h-1.5 bg-warm-ivory rounded-full overflow-hidden">
                    <div className="h-full bg-deep-green rounded-full" style={{ width: `${Math.round((count / total) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Top countries */}
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold text-ink mb-4">Top countries by opportunity count</h2>
            <div className="space-y-2">
              {topCountries.map(([country, count]) => (
                <div key={country} className="flex items-center justify-between">
                  <span className="text-sm text-ink">{country}</span>
                  <span className="text-sm font-bold text-deep-green">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top sectors */}
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold text-ink mb-4">Top sectors</h2>
            <div className="space-y-2">
              {topSectors.map(([sector, count]) => (
                <div key={sector} className="flex items-center justify-between">
                  <span className="text-sm text-ink">{sector}</span>
                  <span className="text-sm font-bold text-deep-green">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent feed */}
        <div className="bg-white border border-border rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold text-ink mb-4">Feed items ({FEED_ITEMS.length} total)</h2>
          <div className="space-y-2">
            {FEED_ITEMS.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-start gap-3 text-sm">
                <span className="text-muted text-xs w-20 flex-shrink-0 pt-0.5">{item.date}</span>
                <span className="font-medium text-deep-green text-xs w-20 flex-shrink-0">{item.category}</span>
                <span className="text-ink">{item.headline}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Management links */}
        <div className="bg-white border border-border rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold text-ink mb-4">Manage</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Market listings →", href: "/market" },
              { label: "Opportunities →", href: "/opportunities" },
              { label: "Network →", href: "/network" },
              { label: "Feed →", href: "/feed" },
            ].map(({ label, href }) => (
              <Link key={href} href={href} className="inline-flex items-center gap-1 border border-deep-green text-deep-green text-sm font-semibold px-4 py-2 rounded-xl hover:bg-deep-green hover:text-ivory transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
