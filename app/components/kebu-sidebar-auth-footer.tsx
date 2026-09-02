"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { useKebuUser } from "@/app/hooks/use-kebu-user";
import { displayFirstName } from "@/lib/account/user-profile";
import { createClient } from "@/lib/supabase/client";

/** Sidebar footer — signed-in greeting + Sign out (or auth links when logged out). */
export function KebuSidebarAuthFooter({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { profile, loading } = useKebuUser();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [signingOut, setSigningOut] = useState(false);
  const dark = variant === "dark";
  const border = dark ? "rgba(255,85,0,0.25)" : KEBU.border;
  const muted = dark ? "rgba(255,255,255,0.55)" : KEBU.muted;

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="p-3" style={{ borderTop: `1px solid ${border}` }}>
        <p className="text-xs text-center" style={{ color: muted }}>
          Loading…
        </p>
      </div>
    );
  }

  if (profile) {
    const first = displayFirstName(profile.name, profile.email);
    return (
      <div className="p-3 space-y-2" style={{ borderTop: `1px solid ${border}` }}>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
          style={{ background: dark ? "rgba(255,85,0,0.08)" : "transparent" }}
        >
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-[#FF5500]" />
          ) : (
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: KEBU.orange }}
            >
              {first.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
              Signed in
            </span>
            <span className="block text-sm font-bold truncate" style={{ color: dark ? KEBU.white : KEBU.black }}>
              Hi, {first}
            </span>
            {profile.afriqueId ? (
              <span className="block text-[9px] font-mono truncate" style={{ color: KEBU.orange }}>
                {profile.afriqueId.publicId}
              </span>
            ) : null}
          </span>
        </Link>
        <button
          type="button"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
          className="w-full rounded-full py-2 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
          style={{
            border: `1px solid ${dark ? "rgba(255,255,255,0.25)" : KEBU.border}`,
            color: dark ? KEBU.white : KEBU.black,
            background: dark ? "rgba(255,255,255,0.06)" : KEBU.white,
          }}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2" style={{ borderTop: `1px solid ${border}` }}>
      <Link
        href="/login"
        className="block w-full text-center rounded-full py-2 text-[10px] font-bold uppercase tracking-wider"
        style={{ border: `1px solid ${KEBU.orange}`, color: KEBU.orange }}
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="block w-full text-center rounded-full py-2 text-[10px] font-bold uppercase tracking-wider text-white"
        style={{ background: KEBU.orange }}
      >
        Start
      </Link>
    </div>
  );
}
