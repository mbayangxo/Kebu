"use client";

import Link from "next/link";
import { displayFirstName } from "@/lib/account/user-profile";
import { useKebuUser } from "@/app/hooks/use-kebu-user";

/** Top-bar auth only — Sign in / Start for guests; Hi, name for signed-in users. */
export function KebuAuthHeaderCTA({
  signInClassName = "",
  startClassName = "",
  orange = "#FF5500",
  white = "#FFFFFF",
}: {
  signInClassName?: string;
  startClassName?: string;
  orange?: string;
  white?: string;
}) {
  const { profile, loading } = useKebuUser();

  if (loading) {
    return <div className="w-28 h-9 rounded-full bg-black/5 animate-pulse" />;
  }

  if (profile) {
    const first = displayFirstName(profile.name, profile.email);
    return (
      <Link
        href="/dashboard"
        className={`inline-flex items-center gap-2 font-bold rounded-full px-4 py-2.5 text-[11px] uppercase tracking-[0.08em] ${signInClassName}`}
        style={{ border: `2px solid ${orange}`, color: orange, background: white }}
      >
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
        ) : null}
        Hi, {first}
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className={`inline-flex items-center justify-center font-bold uppercase tracking-[0.1em] rounded-full transition-all hover:bg-black/[0.04] px-5 py-2.5 text-[11px] ${signInClassName}`}
        style={{ border: `2px solid ${orange}`, color: orange, background: white }}
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className={`inline-flex items-center justify-center gap-2 font-bold uppercase tracking-[0.12em] transition-all hover:brightness-110 px-6 py-2.5 text-[11px] rounded-full ${startClassName}`}
        style={{ background: orange, color: white }}
      >
        Start
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" aria-hidden>
          <path d="M5 12H19M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Link>
    </>
  );
}
