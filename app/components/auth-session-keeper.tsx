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
    let supabase: ReturnType<typeof createClient>;
    try { supabase = createClient(); } catch { return; }

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

    void refresh().catch(() => undefined);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void refresh().catch(() => undefined);
      }
    });

    const safeRefresh = () => refresh().catch(() => undefined);
    const onFocus = () => void safeRefresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh().catch(() => undefined);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    const interval = window.setInterval(() => void safeRefresh(), 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
