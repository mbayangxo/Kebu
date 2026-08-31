import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_HOSTING_MONTHLY_USD_CENTS } from "./pricing";
import { projectIsOwnerPortfolio } from "@/lib/create/go-live";

export type SiteSubscriptionRow = {
  id: string;
  project_id: string;
  owner_id: string;
  status: string;
  amount_usd_cents: number;
  period_start: string | null;
  period_end: string | null;
  joko_reference: string | null;
};

export function billingDevBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.JOKO_BILLING_DEV_BYPASS === "true";
}

export async function getActiveSiteSubscription(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
): Promise<SiteSubscriptionRow | null> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("site_subscriptions")
    .select("id, project_id, owner_id, status, amount_usd_cents, period_start, period_end, joko_reference")
    .eq("project_id", projectId)
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .gt("period_end", now)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export async function projectHasLiveHosting(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
): Promise<boolean> {
  if (billingDevBypassEnabled()) return true;
  // Owner May Lecor / K-Direction portfolio sites host free (not shared templates).
  if (await projectIsOwnerPortfolio(supabase, projectId)) return true;
  const active = await getActiveSiteSubscription(supabase, projectId, ownerId);
  return Boolean(active);
}

export async function userOwnsTemplate(
  supabase: SupabaseClient,
  ownerId: string,
  templateSlug: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("template_purchases")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("template_slug", templateSlug)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export async function templateRequiresPurchase(
  supabase: SupabaseClient,
  templateSlug: string,
): Promise<{ required: boolean; priceUsdCents: number }> {
  const { data } = await supabase
    .from("site_templates")
    .select("price_usd_cents, requires_purchase")
    .eq("slug", templateSlug)
    .maybeSingle();

  if (!data) return { required: false, priceUsdCents: 0 };
  const priceUsdCents = data.price_usd_cents ?? 0;
  const required = Boolean(data.requires_purchase) && priceUsdCents > 0;
  return { required, priceUsdCents };
}

export function subscriptionPeriodEnd(from = new Date()): string {
  const end = new Date(from);
  end.setUTCDate(end.getUTCDate() + 30);
  return end.toISOString();
}

export function defaultHostingAmountCents(): number {
  return SITE_HOSTING_MONTHLY_USD_CENTS;
}
