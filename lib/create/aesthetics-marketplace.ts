import type { SupabaseClient } from "@supabase/supabase-js";
import type { WebsiteDefinition } from "./website-schema";
import { validateWebsiteDefinition } from "./website-schema";
import { definitionFromTemplateSlug } from "./ai-generate";
import { isPublicTemplateSlug, publicTemplateSeeds } from "./templates-seed";
import { userFeaturedAesthetics } from "./user-aesthetics-catalog";
import { parseKebuTemplateFile } from "./kebu-template-file";
import { addProjectTheme, editProjectTheme } from "./project-themes";
import { templateRequiresPurchase, userOwnsTemplate } from "@/lib/billing/subscriptions";
import { createJokoCheckout } from "@/lib/joko/payments";
import { formatUsdFromCents } from "@/lib/billing/pricing";
import { randomUUID } from "node:crypto";

export const AESTHETICS_TABLE_MISSING =
  "Aesthetics tables missing. Apply supabase/migrations/040_aesthetics_marketplace.sql (and 014 if marketplace tables are missing).";

function tableMissing(message: string | undefined): boolean {
  return Boolean(message?.includes("does not exist") || message?.includes("schema cache"));
}

export type AestheticLibraryRow = {
  id: string;
  owner_id: string;
  kind: "catalog" | "marketplace" | "upload";
  catalog_slug: string | null;
  marketplace_id: string | null;
  name: string;
  definition: WebsiteDefinition;
  status: "owned" | "pending" | "failed";
  amount_usd_cents: number;
  created_at: string;
  updated_at: string;
};

export type DeveloperProfileRow = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  website_url: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  created_at: string;
};

export type MarketplaceAestheticRow = {
  id: string;
  developer_id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  price_cents: number;
  definition: WebsiteDefinition;
  preview_url: string | null;
  status: string;
  sales_count: number;
  created_at: string;
  developer_name?: string;
};

export async function getOrCreateDeveloperProfile(
  supabase: SupabaseClient,
  userId: string,
  input?: { displayName?: string; bio?: string; websiteUrl?: string },
): Promise<
  | { ok: true; profile: DeveloperProfileRow; created: boolean }
  | { ok: false; status: number; error: string }
> {
  const { data: existing, error: readErr } = await supabase
    .from("developer_profiles")
    .select("id, user_id, display_name, bio, website_url, status, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (readErr && tableMissing(readErr.message)) {
    return { ok: false, status: 503, error: AESTHETICS_TABLE_MISSING };
  }
  if (readErr) return { ok: false, status: 500, error: readErr.message };
  if (existing) return { ok: true, profile: existing as DeveloperProfileRow, created: false };

  const displayName = (input?.displayName ?? "Kebu developer").trim().slice(0, 80) || "Kebu developer";
  const { data, error } = await supabase
    .from("developer_profiles")
    .insert({
      user_id: userId,
      display_name: displayName,
      bio: input?.bio?.trim().slice(0, 500) || null,
      website_url: input?.websiteUrl?.trim().slice(0, 200) || null,
      // Self-serve slice: approved so developers can upload and sell immediately.
      // Later: pending + admin review.
      status: "approved",
      reviewed_at: new Date().toISOString(),
    })
    .select("id, user_id, display_name, bio, website_url, status, created_at")
    .single();

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: AESTHETICS_TABLE_MISSING };
  }
  if (error || !data) {
    return { ok: false, status: 500, error: error?.message ?? "Could not create developer account." };
  }
  return { ok: true, profile: data as DeveloperProfileRow, created: true };
}

export async function listPublishedMarketplaceAesthetics(
  supabase: SupabaseClient,
): Promise<
  | { ok: true; items: MarketplaceAestheticRow[] }
  | { ok: false; status: number; error: string }
> {
  const { data, error } = await supabase
    .from("marketplace_templates")
    .select(
      "id, developer_id, slug, name, description, category, price_cents, definition, preview_url, status, sales_count, created_at, developer_profiles(display_name)",
    )
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: AESTHETICS_TABLE_MISSING };
  }
  if (error) {
    // Fallback without join if relationship name differs
    const retry = await supabase
      .from("marketplace_templates")
      .select(
        "id, developer_id, slug, name, description, category, price_cents, definition, preview_url, status, sales_count, created_at",
      )
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (retry.error && tableMissing(retry.error.message)) {
      return { ok: false, status: 503, error: AESTHETICS_TABLE_MISSING };
    }
    if (retry.error) return { ok: false, status: 500, error: retry.error.message };
    return {
      ok: true,
      items: ((retry.data ?? []) as MarketplaceAestheticRow[]).map((row) => ({
        ...row,
        definition: row.definition,
      })),
    };
  }

  const items = (data ?? []).map((row) => {
    const r = row as MarketplaceAestheticRow & {
      developer_profiles?: { display_name?: string } | { display_name?: string }[] | null;
    };
    const dp = r.developer_profiles;
    const name = Array.isArray(dp) ? dp[0]?.display_name : dp?.display_name;
    return {
      ...r,
      developer_name: name ?? undefined,
      definition: r.definition,
    };
  });
  return { ok: true, items };
}

export async function listDeveloperMarketplaceAesthetics(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  | { ok: true; items: MarketplaceAestheticRow[]; profile: DeveloperProfileRow | null }
  | { ok: false; status: number; error: string }
> {
  const { data: profile, error: pErr } = await supabase
    .from("developer_profiles")
    .select("id, user_id, display_name, bio, website_url, status, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (pErr && tableMissing(pErr.message)) {
    return { ok: false, status: 503, error: AESTHETICS_TABLE_MISSING };
  }
  if (pErr) return { ok: false, status: 500, error: pErr.message };
  if (!profile) return { ok: true, items: [], profile: null };

  const { data, error } = await supabase
    .from("marketplace_templates")
    .select(
      "id, developer_id, slug, name, description, category, price_cents, definition, preview_url, status, sales_count, created_at",
    )
    .eq("developer_id", profile.id)
    .order("updated_at", { ascending: false });

  if (error) return { ok: false, status: 500, error: error.message };
  return {
    ok: true,
    items: (data ?? []) as MarketplaceAestheticRow[],
    profile: profile as DeveloperProfileRow,
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function uploadMarketplaceAesthetic(
  supabase: SupabaseClient,
  userId: string,
  input: {
    name: string;
    description?: string;
    category?: string;
    priceCents?: number;
    fileJson: unknown;
    publish?: boolean;
  },
): Promise<
  | { ok: true; item: MarketplaceAestheticRow }
  | { ok: false; status: number; error: string }
> {
  const profileRes = await getOrCreateDeveloperProfile(supabase, userId, {
    displayName: input.name.slice(0, 40) || "Developer",
  });
  if (!profileRes.ok) return profileRes;
  if (profileRes.profile.status !== "approved") {
    return { ok: false, status: 403, error: "Your developer account is not approved to sell yet." };
  }

  const parsed = parseKebuTemplateFile(input.fileJson, input.name);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };

  const name = input.name.trim().slice(0, 80) || parsed.name;
  const baseSlug = slugify(name) || `aesthetic-${randomUUID().slice(0, 8)}`;
  const slug = `${baseSlug}-${randomUUID().slice(0, 6)}`;
  const priceCents = Math.max(0, Math.min(500_000, Math.floor(input.priceCents ?? 0)));
  const status = input.publish ? "published" : "draft";

  const { data, error } = await supabase
    .from("marketplace_templates")
    .insert({
      developer_id: profileRes.profile.id,
      slug,
      name,
      description: input.description?.trim().slice(0, 500) || null,
      category: input.category?.trim().slice(0, 40) || "general",
      price_cents: priceCents,
      definition: parsed.definition,
      status,
    })
    .select(
      "id, developer_id, slug, name, description, category, price_cents, definition, preview_url, status, sales_count, created_at",
    )
    .single();

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: AESTHETICS_TABLE_MISSING };
  }
  if (error || !data) {
    return { ok: false, status: 500, error: error?.message ?? "Could not upload aesthetic." };
  }
  return { ok: true, item: data as MarketplaceAestheticRow };
}

export async function publishMarketplaceAesthetic(
  supabase: SupabaseClient,
  userId: string,
  aestheticId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const mine = await listDeveloperMarketplaceAesthetics(supabase, userId);
  if (!mine.ok) return mine;
  if (!mine.profile) return { ok: false, status: 403, error: "Create a developer account first." };
  const row = mine.items.find((i) => i.id === aestheticId);
  if (!row) return { ok: false, status: 404, error: "Aesthetic not found." };

  const { error } = await supabase
    .from("marketplace_templates")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", aestheticId)
    .eq("developer_id", mine.profile.id);

  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true };
}

export async function listOwnedAesthetics(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  | { ok: true; items: AestheticLibraryRow[] }
  | { ok: false; status: number; error: string }
> {
  const { data, error } = await supabase
    .from("aesthetic_library")
    .select(
      "id, owner_id, kind, catalog_slug, marketplace_id, name, definition, status, amount_usd_cents, created_at, updated_at",
    )
    .eq("owner_id", userId)
    .eq("status", "owned")
    .order("updated_at", { ascending: false });

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: AESTHETICS_TABLE_MISSING };
  }
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true, items: (data ?? []) as AestheticLibraryRow[] };
}

async function resolveCatalogDefinition(
  slug: string,
  businessName: string,
): Promise<{ ok: true; name: string; definition: WebsiteDefinition } | { ok: false; error: string }> {
  if (!isPublicTemplateSlug(slug)) return { ok: false, error: "Unknown Kebu aesthetic." };
  const seed = publicTemplateSeeds().find((t) => t.slug === slug);
  if (!seed) return { ok: false, error: "Unknown Kebu aesthetic." };
  const brief = {
    mode: "template" as const,
    businessName: businessName || seed.name,
    category: seed.category,
    description: seed.description || "Kebu aesthetic",
    countryCode: "SN",
    locale: "en",
    desiredPages: ["home"],
    templateSlug: slug,
    subdomain: "unused",
  };
  const fromCatalog = definitionFromTemplateSlug(slug, brief) ?? (seed.definition as WebsiteDefinition);
  const validated = validateWebsiteDefinition(fromCatalog);
  if (!validated.ok) return { ok: false, error: "This aesthetic failed validation." };
  return { ok: true, name: seed.name, definition: validated.data };
}

export async function acquireCatalogAesthetic(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null },
  catalogSlug: string,
  appUrl: string,
): Promise<
  | { ok: true; alreadyOwned?: boolean; item?: AestheticLibraryRow; paymentUrl?: string; priceLabel?: string }
  | { ok: false; status: number; error: string }
> {
  const ownedLib = await listOwnedAesthetics(supabase, user.id);
  if (!ownedLib.ok) return ownedLib;
  const existing = ownedLib.items.find((i) => i.kind === "catalog" && i.catalog_slug === catalogSlug);
  if (existing) return { ok: true, alreadyOwned: true, item: existing };

  if (await userOwnsTemplate(supabase, user.id, catalogSlug)) {
    const resolved = await resolveCatalogDefinition(catalogSlug, "My site");
    if (!resolved.ok) return { ok: false, status: 400, error: resolved.error };
    const inserted = await insertOwnedLibrary(supabase, user.id, {
      kind: "catalog",
      catalogSlug,
      name: resolved.name,
      definition: resolved.definition,
      amountUsdCents: 0,
    });
    if (!inserted.ok) return inserted;
    return { ok: true, alreadyOwned: true, item: inserted.item };
  }

  const { required, priceUsdCents } = await templateRequiresPurchase(supabase, catalogSlug);
  const resolved = await resolveCatalogDefinition(catalogSlug, "My site");
  if (!resolved.ok) return { ok: false, status: 400, error: resolved.error };

  if (!required || priceUsdCents <= 0) {
    const inserted = await insertOwnedLibrary(supabase, user.id, {
      kind: "catalog",
      catalogSlug,
      name: resolved.name,
      definition: resolved.definition,
      amountUsdCents: 0,
    });
    if (!inserted.ok) return inserted;
    return { ok: true, item: inserted.item };
  }

  const reference = `kebu-aes-${catalogSlug.slice(0, 10)}-${randomUUID().slice(0, 8)}`;
  const pending = await insertPendingLibrary(supabase, user.id, {
    kind: "catalog",
    catalogSlug,
    name: resolved.name,
    definition: resolved.definition,
    amountUsdCents: priceUsdCents,
    jokoReference: reference,
  });
  if (!pending.ok) return pending;

  const checkout = await createJokoCheckout({
    reference,
    amountUsdCents: priceUsdCents,
    description: `Kebu aesthetic — ${resolved.name}`,
    customerEmail: user.email ?? undefined,
    returnUrl: `${appUrl}/create/aesthetics?billing=success`,
    cancelUrl: `${appUrl}/create/aesthetics?billing=cancelled`,
    webhookUrl: `${appUrl}/api/webhooks/joko`,
    metadata: {
      kind: "aesthetic_purchase",
      library_id: pending.item.id,
      owner_id: user.id,
      catalog_slug: catalogSlug,
    },
  });

  if (!checkout.ok) {
    await supabase.from("aesthetic_library").update({ status: "failed" }).eq("id", pending.item.id);
    return { ok: false, status: 503, error: checkout.error };
  }

  await supabase
    .from("aesthetic_library")
    .update({ joko_payment_id: checkout.paymentId })
    .eq("id", pending.item.id);

  return {
    ok: true,
    paymentUrl: checkout.paymentUrl,
    priceLabel: formatUsdFromCents(priceUsdCents),
  };
}

export async function acquireMarketplaceAesthetic(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null },
  marketplaceId: string,
  appUrl: string,
): Promise<
  | { ok: true; alreadyOwned?: boolean; item?: AestheticLibraryRow; paymentUrl?: string; priceLabel?: string }
  | { ok: false; status: number; error: string }
> {
  const ownedLib = await listOwnedAesthetics(supabase, user.id);
  if (!ownedLib.ok) return ownedLib;
  const existing = ownedLib.items.find((i) => i.marketplace_id === marketplaceId);
  if (existing) return { ok: true, alreadyOwned: true, item: existing };

  const { data: row, error } = await supabase
    .from("marketplace_templates")
    .select(
      "id, developer_id, slug, name, description, category, price_cents, definition, status",
    )
    .eq("id", marketplaceId)
    .eq("status", "published")
    .maybeSingle();

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: AESTHETICS_TABLE_MISSING };
  }
  if (error || !row) return { ok: false, status: 404, error: "Aesthetic not found in the store." };

  const validated = validateWebsiteDefinition(row.definition);
  if (!validated.ok) return { ok: false, status: 400, error: "This aesthetic is invalid." };

  const priceCents = row.price_cents ?? 0;
  if (priceCents <= 0) {
    const inserted = await insertOwnedLibrary(supabase, user.id, {
      kind: "marketplace",
      marketplaceId: row.id,
      name: row.name,
      definition: validated.data,
      amountUsdCents: 0,
    });
    if (!inserted.ok) return inserted;
    await bumpSalesCount(supabase, row.id);
    return { ok: true, item: inserted.item };
  }

  const reference = `kebu-mp-${row.slug.slice(0, 10)}-${randomUUID().slice(0, 8)}`;
  const pending = await insertPendingLibrary(supabase, user.id, {
    kind: "marketplace",
    marketplaceId: row.id,
    name: row.name,
    definition: validated.data,
    amountUsdCents: priceCents,
    jokoReference: reference,
  });
  if (!pending.ok) return pending;

  const checkout = await createJokoCheckout({
    reference,
    amountUsdCents: priceCents,
    description: `Kebu aesthetic — ${row.name}`,
    customerEmail: user.email ?? undefined,
    returnUrl: `${appUrl}/create/aesthetics?billing=success`,
    cancelUrl: `${appUrl}/create/aesthetics?billing=cancelled`,
    webhookUrl: `${appUrl}/api/webhooks/joko`,
    metadata: {
      kind: "aesthetic_purchase",
      library_id: pending.item.id,
      owner_id: user.id,
      marketplace_id: row.id,
    },
  });

  if (!checkout.ok) {
    await supabase.from("aesthetic_library").update({ status: "failed" }).eq("id", pending.item.id);
    return { ok: false, status: 503, error: checkout.error };
  }

  await supabase
    .from("aesthetic_library")
    .update({ joko_payment_id: checkout.paymentId })
    .eq("id", pending.item.id);

  return {
    ok: true,
    paymentUrl: checkout.paymentUrl,
    priceLabel: formatUsdFromCents(priceCents),
  };
}

async function bumpSalesCount(supabase: SupabaseClient, marketplaceId: string) {
  const { data } = await supabase
    .from("marketplace_templates")
    .select("sales_count")
    .eq("id", marketplaceId)
    .maybeSingle();
  const next = (data?.sales_count ?? 0) + 1;
  await supabase.from("marketplace_templates").update({ sales_count: next }).eq("id", marketplaceId);
}

async function insertOwnedLibrary(
  supabase: SupabaseClient,
  ownerId: string,
  input: {
    kind: "catalog" | "marketplace" | "upload";
    catalogSlug?: string;
    marketplaceId?: string;
    name: string;
    definition: WebsiteDefinition;
    amountUsdCents: number;
  },
): Promise<
  | { ok: true; item: AestheticLibraryRow }
  | { ok: false; status: number; error: string }
> {
  const { data, error } = await supabase
    .from("aesthetic_library")
    .insert({
      owner_id: ownerId,
      kind: input.kind,
      catalog_slug: input.catalogSlug ?? null,
      marketplace_id: input.marketplaceId ?? null,
      name: input.name.slice(0, 80),
      definition: input.definition,
      status: "owned",
      amount_usd_cents: input.amountUsdCents,
    })
    .select(
      "id, owner_id, kind, catalog_slug, marketplace_id, name, definition, status, amount_usd_cents, created_at, updated_at",
    )
    .single();

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: AESTHETICS_TABLE_MISSING };
  }
  if (error || !data) {
    if (error?.code === "23505") {
      const again = await listOwnedAesthetics(supabase, ownerId);
      if (again.ok) {
        const hit = again.items.find(
          (i) =>
            (input.catalogSlug && i.catalog_slug === input.catalogSlug) ||
            (input.marketplaceId && i.marketplace_id === input.marketplaceId),
        );
        if (hit) return { ok: true, item: hit };
      }
    }
    return { ok: false, status: 500, error: error?.message ?? "Could not save aesthetic to your library." };
  }
  return { ok: true, item: data as AestheticLibraryRow };
}

async function insertPendingLibrary(
  supabase: SupabaseClient,
  ownerId: string,
  input: {
    kind: "catalog" | "marketplace";
    catalogSlug?: string;
    marketplaceId?: string;
    name: string;
    definition: WebsiteDefinition;
    amountUsdCents: number;
    jokoReference: string;
  },
): Promise<
  | { ok: true; item: AestheticLibraryRow }
  | { ok: false; status: number; error: string }
> {
  const { data, error } = await supabase
    .from("aesthetic_library")
    .insert({
      owner_id: ownerId,
      kind: input.kind,
      catalog_slug: input.catalogSlug ?? null,
      marketplace_id: input.marketplaceId ?? null,
      name: input.name.slice(0, 80),
      definition: input.definition,
      status: "pending",
      amount_usd_cents: input.amountUsdCents,
      joko_reference: input.jokoReference,
    })
    .select(
      "id, owner_id, kind, catalog_slug, marketplace_id, name, definition, status, amount_usd_cents, created_at, updated_at",
    )
    .single();

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: AESTHETICS_TABLE_MISSING };
  }
  if (error || !data) {
    return { ok: false, status: 500, error: error?.message ?? "Could not start aesthetic checkout." };
  }
  return { ok: true, item: data as AestheticLibraryRow };
}

export async function uploadOwnedAesthetic(
  supabase: SupabaseClient,
  userId: string,
  input: { name: string; fileJson: unknown },
): Promise<
  | { ok: true; item: AestheticLibraryRow }
  | { ok: false; status: number; error: string }
> {
  const parsed = parseKebuTemplateFile(input.fileJson, input.name);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const name = input.name.trim().slice(0, 80) || parsed.name;
  return insertOwnedLibrary(supabase, userId, {
    kind: "upload",
    name,
    definition: parsed.definition,
    amountUsdCents: 0,
  });
}

/** Add owned aesthetic to a site as a draft (no re-upload). Optionally open it in the editor. */
export async function applyAestheticToProject(
  supabase: SupabaseClient,
  userId: string,
  input: { libraryId: string; projectId: string; openInEditor?: boolean },
): Promise<
  | { ok: true; themeId: string; editorPath: string }
  | { ok: false; status: number; error: string }
> {
  const { data: item, error } = await supabase
    .from("aesthetic_library")
    .select(
      "id, owner_id, kind, catalog_slug, marketplace_id, name, definition, status",
    )
    .eq("id", input.libraryId)
    .eq("owner_id", userId)
    .eq("status", "owned")
    .maybeSingle();

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: AESTHETICS_TABLE_MISSING };
  }
  if (error || !item) return { ok: false, status: 404, error: "Owned aesthetic not found." };

  const validated = validateWebsiteDefinition(item.definition);
  if (!validated.ok) return { ok: false, status: 400, error: "This aesthetic snapshot is invalid." };

  const source =
    item.kind === "catalog" ? "catalog" : item.kind === "marketplace" ? "marketplace" : "library";

  const added = await addProjectTheme(supabase, userId, input.projectId, {
    name: item.name,
    source,
    catalogSlug: item.catalog_slug ?? undefined,
    definition: validated.data,
  });
  if (!added.ok) return added;

  if (input.openInEditor !== false) {
    const edited = await editProjectTheme(supabase, userId, input.projectId, added.theme.id);
    if (!edited.ok) return edited;
  }

  return {
    ok: true,
    themeId: added.theme.id,
    editorPath: `/create/${input.projectId}`,
  };
}

export async function markAestheticPurchasePaid(
  supabase: SupabaseClient,
  reference: string,
  paymentId: string | null,
): Promise<{ ok: true; libraryId: string; marketplaceId: string | null } | { ok: false; error: string }> {
  const { data: row } = await supabase
    .from("aesthetic_library")
    .select("id, marketplace_id, status")
    .eq("joko_reference", reference)
    .maybeSingle();

  if (!row) return { ok: false, error: "Aesthetic purchase not found." };

  const now = new Date().toISOString();
  await supabase
    .from("aesthetic_library")
    .update({
      status: "owned",
      joko_payment_id: paymentId ?? row.id,
      updated_at: now,
    })
    .eq("id", row.id);

  if (row.marketplace_id) {
    await bumpSalesCount(supabase, row.marketplace_id);
  }

  return { ok: true, libraryId: row.id, marketplaceId: row.marketplace_id };
}

/** Catalog cards for the aesthetics store — curated user gallery only (2 per type). */
export function kebuCatalogAestheticCards(): {
  slug: string;
  name: string;
  category: string;
  description: string;
  kind: "catalog";
}[] {
  const seeds = new Map(publicTemplateSeeds().map((t) => [t.slug, t]));
  return userFeaturedAesthetics()
    .map((a) => {
      const seed = seeds.get(a.slug);
      if (!seed) return null;
      return {
        slug: a.slug,
        name: a.name,
        category: a.type,
        description: a.tagline || seed.description,
        kind: "catalog" as const,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
}
