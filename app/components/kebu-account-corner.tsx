"use client";

import Link from "next/link";
import { useKebuUser } from "@/app/hooks/use-kebu-user";
import { displayFirstName } from "@/lib/account/user-profile";
import { KEBU } from "@/lib/kebu-brand";

/** Top-right account control — replaces sidebar “My Account” row. */
export function KebuAccountCorner({ onDark = false }: { onDark?: boolean }) {
  const { profile, loading } = useKebuUser();

  if (loading) {
    return <span className="w-8 h-8 rounded-full bg-black/10 animate-pulse" aria-hidden />;
  }

  if (!profile) {
    return (
      <Link
        href="/login?next=/account"
        className="text-[11px] font-bold uppercase tracking-wider"
        style={{ color: onDark ? KEBU.white : KEBU.orange }}
      >
        Sign in
      </Link>
    );
  }

  const first = displayFirstName(profile.name, profile.email);

  return (
    <Link
      href="/account"
      className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 transition-opacity hover:opacity-90"
      style={{
        background: onDark ? "rgba(255,255,255,0.1)" : "rgba(10,10,10,0.06)",
        border: `1px solid ${onDark ? "rgba(255,255,255,0.2)" : KEBU.border}`,
      }}
      aria-label="My Account"
    >
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: KEBU.orange }}
        >
          {first.charAt(0).toUpperCase()}
        </span>
      )}
      <span
        className="hidden sm:inline text-[11px] font-bold max-w-[7rem] truncate"
        style={{ color: onDark ? KEBU.white : KEBU.black }}
      >
        {first}
      </span>
    </Link>
  );
}
