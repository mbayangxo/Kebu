import { createClient } from "@/lib/supabase/server";

export const appKeys = ["live-rooms", "friends", "liguey", "palaver"] as const;
export type AppKey = (typeof appKeys)[number];
export const qaOrigin = "https://skqnxyaeimvbyrmdfzvk.supabase.co";

export function builtinsEnabled() {
  return (
    process.env.KEBU_PUBLIC_LIVE_QA === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") === qaOrigin
  );
}

export async function builtinAccount() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  return { db, user: user?.is_anonymous ? null : user };
}

export async function builtinAccess(key: AppKey) {
  const { db, user } = await builtinAccount();
  if (!user) return { db, user, installed: false, error: null };
  const { data, error } = await db
    .from("kebu_builtin_app_installs")
    .select("app_key")
    .eq("user_id", user.id)
    .eq("app_key", key)
    .maybeSingle();
  return { db, user, installed: Boolean(data), error };
}

/** Separate rollout switch: installing Liguey never enables Live Rooms or Friends. */
export function ligueyEnabled() {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  return (
    process.env.KEBU_LIGUEY_QA === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    (origin === qaOrigin ||
      /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
  );
}

/** Palaver can be added independently of Live Rooms and Friends. */
export function palaverEnabled() {
  return Boolean(
    process.env.VERCEL_ENV !== "production" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") === qaOrigin &&
    process.env.KEBU_PALAVER_PILOT_SITE?.trim()
  );
}

export function builtinAppEnabled(key: AppKey) {
  return key === "palaver" ? palaverEnabled() : key === "liguey" ? ligueyEnabled() : builtinsEnabled();
}
