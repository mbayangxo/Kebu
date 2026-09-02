"use client";

import Link from "next/link";
import { useKebuUser } from "@/app/hooks/use-kebu-user";
import { displayFirstName } from "@/lib/account/user-profile";

/** Hero actions — product paths only. No Sign in / Start here (those live in the top bar). */
export function KebuLandingHeroCTA({
  orange,
  ink,
  border,
}: {
  orange: string;
  ink: string;
  border: string;
}) {
  const { profile, loading } = useKebuUser();

  if (loading) {
    return <div className="h-14 w-56 rounded-full bg-black/5 animate-pulse" />;
  }

  if (profile) {
    const first = displayFirstName(profile.name, profile.email);
    return (
      <div className="space-y-4">
        <p className="text-lg font-bold" style={{ color: ink }}>
          Hi, {first} — welcome back.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-full text-sm uppercase tracking-[0.1em] transition-all hover:brightness-110"
            style={{ background: orange, color: "#fff" }}
          >
            Your Kebu
          </Link>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-full text-sm uppercase tracking-[0.1em] transition-all hover:bg-black/[0.03]"
            style={{ border: `2px solid ${orange}`, color: orange }}
          >
            Kebu Builder
          </Link>
          <Link
            href="/opportunity/countries"
            className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-full text-sm uppercase tracking-[0.1em] transition-all hover:bg-black/[0.03]"
            style={{ border: `2px solid ${border}`, color: ink }}
          >
            Explore countries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/opportunity/countries"
        className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-full text-sm uppercase tracking-[0.1em] transition-all hover:brightness-110"
        style={{ background: orange, color: "#fff" }}
      >
        Explore countries
      </Link>
      <Link
        href="/opportunity"
        className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-full text-sm uppercase tracking-[0.1em] transition-all hover:bg-black/[0.03]"
        style={{ border: `2px solid ${orange}`, color: orange }}
      >
        Opportunity OS
      </Link>
      <Link
        href="/create"
        className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-full text-sm uppercase tracking-[0.1em] transition-all hover:bg-black/[0.03]"
        style={{ border: `2px solid ${border}`, color: ink }}
      >
        Kebu Builder
      </Link>
    </div>
  );
}
