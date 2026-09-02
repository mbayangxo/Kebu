"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthChangeEvent, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
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
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    let user = session?.user ?? null;
    if (!user) {
      const {
        data: { user: validated },
      } = await supabase.auth.getUser();
      user = validated;
    }

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile((prev) => prev ?? profileFromAuthUser(user));

    const res = await fetch("/api/me/profile", { credentials: "include" });
    if (res.ok) {
      const data = (await res.json()) as { profile: MeProfile };
      setProfile(data.profile);
    } else {
      setProfile(profileFromAuthUser(user));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setLoading(false);
        return;
      }
      void refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return { profile, loading, refresh, signedIn: Boolean(profile) };
}
