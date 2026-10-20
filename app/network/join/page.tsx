"use client";
export const dynamic = "force-dynamic";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/app/components/nav";
import { NETWORK_NEEDS } from "@/lib/network/types";
type NetworkNeed = (typeof NETWORK_NEEDS)[number];

const NEEDS = NETWORK_NEEDS;

const SECTORS = [
  "Agriculture", "Tech / Software", "Finance / Fintech", "Health",
  "Fashion & beauty", "Food & catering", "Construction", "Creative economy",
  "Education", "Energy", "Logistics", "Manufacturing", "Retail & e-commerce",
  "Tourism", "Trade & export",
];

export default function NetworkJoinPage() {
  const router = useRouter();
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
        setError(res.status === 401 ? "Sign in to save your profile. Your draft is still here."
          : result.error ?? "Your profile was not confirmed saved. Check the network before retrying.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Your profile was not confirmed saved. Your draft is still here; check the network before retrying.");
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-warm-ivory">
        <Nav />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-deep-green text-ivory text-2xl flex items-center justify-center mx-auto mb-6">
            ✓
          </div>
          <h1 className="font-display text-3xl font-bold text-ink mb-3">
            You&apos;re in the network
          </h1>
          <p className="text-muted mb-8">
            Your profile has been added. Other founders, investors, and partners can now
            find you. Welcome to the First-Order Collective.
          </p>
          <button
            onClick={() => router.push("/network")}
            className="bg-deep-green text-ivory font-bold px-6 py-3 rounded-xl hover:bg-mid-green transition-colors"
          >
            View the network →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-ivory">
      <Nav />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink mb-2">
            Join the network
          </h1>
          <p className="text-muted text-sm">
            Tell the community what you&apos;re building and what you need. Your profile will be
            visible to other African founders, diaspora investors, and partners.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={loading} aria-busy={loading} className="min-w-0 space-y-6">
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-base font-bold text-ink mb-4">About you</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="network-name" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Full name</label>
                <input required type="text" id="network-name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label htmlFor="network-location" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">City, Country</label>
                <input required type="text" id="network-location" maxLength={160} value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Dakar, Senegal"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label htmlFor="network-country" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Country (for filtering)</label>
                <input required type="text" id="network-country" maxLength={80} value={country} onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Senegal"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label htmlFor="network-languages" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Languages spoken</label>
                <input type="text" id="network-languages" maxLength={1200} value={languages} onChange={(e) => setLanguages(e.target.value)}
                  placeholder="e.g. French, Wolof, English"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-base font-bold text-ink mb-4">What you&apos;re building</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="network-sector" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Sector</label>
                <select required id="network-sector" value={sector} onChange={(e) => setSector(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold">
                  <option value="">Select sector</option>
                  {SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="network-headline" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">One-line headline</label>
                <input required type="text" id="network-headline" maxLength={240} value={headline} onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Building a pan-African fashion distribution platform"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label htmlFor="network-building" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">What you&apos;re building (2–4 sentences)</label>
                <textarea required id="network-building" maxLength={3000} value={building} onChange={(e) => setBuilding(e.target.value)}
                  placeholder="Describe your business: what it does, who it serves, what stage you're at, what traction you have..."
                  rows={4}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold resize-none" />
              </div>
              <div>
                <label htmlFor="network-stage" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">Business stage</label>
                <select required id="network-stage" value={stage} onChange={(e) => setStage(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink focus:outline-none focus:border-gold">
                  <option value="">Select stage</option>
                  <option>Idea</option>
                  <option>Early stage</option>
                  <option>Growing</option>
                  <option>Established</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-display text-base font-bold text-ink mb-4">What you need & offer</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-ink mb-3 uppercase tracking-wide">
                  What are you looking for? (select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {NEEDS.map((need) => (
                    <button type="button" aria-pressed={lookingFor.includes(need)} key={need} onClick={() => toggleNeed(need)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                        lookingFor.includes(need)
                          ? "bg-deep-green text-ivory border-deep-green"
                          : "bg-white border-border text-ink hover:border-gold"
                      }`}>
                      {need}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="network-offering" className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wide">
                  What can you offer to partners?
                </label>
                <textarea required id="network-offering" maxLength={3000} value={offering} onChange={(e) => setOffering(e.target.value)}
                  placeholder="e.g. Network of 200 farmers, EU organic certification, 10 years logistics experience..."
                  rows={3}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white text-ink placeholder:text-muted/50 focus:outline-none focus:border-gold resize-none" />
              </div>
            </div>
          </div>

          {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            <p>{error}</p>
            <Link href="/login?next=%2Fnetwork%2Fjoin" target="_blank" rel="noopener noreferrer" className="underline">Sign in in another tab</Link>
            {" · "}<Link href="/network" target="_blank" rel="noopener noreferrer" className="underline">Check the network</Link>
          </div>}
          <button type="submit" disabled={loading || lookingFor.length === 0}
            className="w-full bg-gold text-deep-green font-bold py-4 rounded-xl hover:bg-gold-light transition-colors disabled:opacity-50">
            {loading ? "Adding you to the network..." : "Join the network →"}
          </button>

          <p className="text-xs text-muted text-center">
            Your profile will be visible to other Kebu members. We never sell your data.
          </p>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
