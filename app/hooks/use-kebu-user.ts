"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthChangeEvent, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createProfileLoader, type ProfileState } from "@/lib/account/profile-loader";
import type { MeProfile } from "@/lib/account/user-profile";

function profileFromAuthUser(user: User): MeProfile {
  return {
    id: user.id,
    email: user.email ?? null,
    name: (user.user_metadata?.name as string | undefined) ?? null,
    avatarUrl: null,
    residenceCountry: null,
    businessStage: null,
    onboardingComplete: false,
    afriqueId: null,
  };
}

export function useKebuUser() {
  const [state, setState] = useState<ProfileState>({ profile: null, loading: true, error: null });
  const loaderRef = useRef<ReturnType<typeof createProfileLoader> | null>(null);
  const refresh = useCallback(async () => { await loaderRef.current?.refresh(); }, []);

  useEffect(() => {
    const loader = createProfileLoader(async () => {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      let user = session?.user ?? null;
      if (!user) {
        const { data: { user: validated }, error } = await supabase.auth.getUser();
        if (error && error.name !== "AuthSessionMissingError") throw error;
        user = validated;
      }
      if (!user) return null;
      const res = await fetch("/api/me/profile", { credentials: "include", cache: "no-store" });
      if (res.status === 401) return null;
      if (!res.ok) return profileFromAuthUser(user);
      const data = (await res.json()) as { profile: MeProfile };
      if (data.profile?.id !== user.id) throw new Error("Profile identity mismatch");
      return data.profile;
    }, setState);
    loaderRef.current = loader;
    let unsubscribe: (() => void) | undefined;
    try {
      const { data: { subscription } } = createClient().auth.onAuthStateChange((event: AuthChangeEvent) => {
        if (event === "SIGNED_OUT") loader.signedOut();
        else void loader.refresh();
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      // refresh reports unconfigured authentication without throwing from the effect.
    }
    void loader.refresh();
    return () => { loader.dispose(); unsubscribe?.(); if (loaderRef.current === loader) loaderRef.current = null; };
  }, []);

  return { ...state, refresh, signedIn: Boolean(state.profile) };
}
