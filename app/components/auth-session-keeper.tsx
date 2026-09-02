"use client";

import { useEffect } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const REFRESH_IF_EXPIRES_WITHIN_SEC = 300;

/**
 * Keeps Supabase auth cookies fresh so users stay signed in until they sign out.
 */
export function AuthSessionKeeper() {
  useEffect(() => {
    const supabase = createClient();

    const refresh = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || !session) return;

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at ?? 0;
      if (expiresAt - now < REFRESH_IF_EXPIRES_WITHIN_SEC) {
        await supabase.auth.refreshSession();
      }
    };

    void refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void refresh();
      }
    });

    const onFocus = () => void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    const interval = window.setInterval(() => void refresh(), 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
