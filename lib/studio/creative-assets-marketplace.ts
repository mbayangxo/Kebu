import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrCreateDeveloperProfile, type DeveloperProfileRow } from "@/lib/create/aesthetics-marketplace";

export { getOrCreateDeveloperProfile, type DeveloperProfileRow };

export const CREATIVE_ASSETS_TABLE_MISSING =
  "Creative assets tables missing. Apply the studio_creative_assets_marketplace migration.";

export const CREATIVE_ASSET_KINDS = ["photo", "font", "pattern", "texture"] as const;
export type CreativeAssetKind = (typeof CREATIVE_ASSET_KINDS)[number];

function tableMissing(message: string | undefined): boolean {
  return Boolean(message?.includes("does not exist") || message?.includes("schema cache"));
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export type CreativeAssetRow = {
  id: string;
  developer_id: string;
  slug: string;
  kind: CreativeAssetKind;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  file_url: string;
  preview_url: string | null;
  license_note: string;
  price_cents: number;
  acquire_count: number;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
  developer_name?: string;
};

export type CreativeAssetLibraryRow = {
  id: string;
  owner_id: string;
  asset_id: string;
  status: "owned";
  created_at: string;
};

const ASSET_COLUMNS =
  "id, developer_id, slug, kind, name, description, category, tags, file_url, preview_url, license_note, price_cents, acquire_count, status, created_at, updated_at";

export async function listPublishedCreativeAssets(
  supabase: SupabaseClient,
  opts?: { kind?: CreativeAssetKind; category?: string; query?: string },
): Promise<{ ok: true; items: CreativeAssetRow[] } | { ok: false; status: number; error: string }> {
  let q = supabase
    .from("marketplace_creative_assets")
    .select(`${ASSET_COLUMNS}, developer_profiles(display_name)`)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (opts?.kind) q = q.eq("kind", opts.kind);
  if (opts?.category) q = q.eq("category", opts.category);
  if (opts?.query) q = q.ilike("name", `%${opts.query}%`);

  const { data, error } = await q;

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: CREATIVE_ASSETS_TABLE_MISSING };
  }
  if (error) {
    const retryBase = supabase
      .from("marketplace_creative_assets")
      .select(ASSET_COLUMNS)
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(200);
    const retry = opts?.kind ? await retryBase.eq("kind", opts.kind) : await retryBase;
    if (retry.error && tableMissing(retry.error.message)) {
      return { ok: false, status: 503, error: CREATIVE_ASSETS_TABLE_MISSING };
    }
    if (retry.error) return { ok: false, status: 500, error: retry.error.message };
    return { ok: true, items: (retry.data ?? []) as CreativeAssetRow[] };
  }

  const items = (data ?? []).map((row) => {
    const r = row as CreativeAssetRow & {
      developer_profiles?: { display_name?: string } | { display_name?: string }[] | null;
    };
    const dp = r.developer_profiles;
    const name = Array.isArray(dp) ? dp[0]?.display_name : dp?.display_name;
    return { ...r, developer_name: name ?? undefined };
  });
  return { ok: true, items };
}

export async function listDeveloperCreativeAssets(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  | { ok: true; items: CreativeAssetRow[]; profile: DeveloperProfileRow | null }
  | { ok: false; status: number; error: string }
> {
  const { data: profile, error: pErr } = await supabase
    .from("developer_profiles")
    .select("id, user_id, display_name, bio, website_url, status, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (pErr && tableMissing(pErr.message)) {
    return { ok: false, status: 503, error: CREATIVE_ASSETS_TABLE_MISSING };
  }
  if (pErr) return { ok: false, status: 500, error: pErr.message };
  if (!profile) return { ok: true, items: [], profile: null };

  const { data, error } = await supabase
    .from("marketplace_creative_assets")
    .select(ASSET_COLUMNS)
    .eq("developer_id", profile.id)
    .order("updated_at", { ascending: false });

  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true, items: (data ?? []) as CreativeAssetRow[], profile: profile as DeveloperProfileRow };
}

/** Free-only launch scope (user decision, Oct 20 2026): price is always 0 here. Paid listings are a separate future slice. */
export async function createCreativeAsset(
  supabase: SupabaseClient,
  userId: string,
  input: {
    kind: CreativeAssetKind;
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
    fileUrl: string;
    previewUrl?: string;
    licenseNote?: string;
    publish?: boolean;
  },
): Promise<{ ok: true; item: CreativeAssetRow } | { ok: false; status: number; error: string }> {
  const profileRes = await getOrCreateDeveloperProfile(supabase, userId, {
    displayName: input.name.slice(0, 40) || "Developer",
  });
  if (!profileRes.ok) return profileRes;
  if (profileRes.profile.status !== "approved") {
    return { ok: false, status: 403, error: "Your developer account is not approved to publish yet." };
  }

  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, status: 400, error: "Name is required." };
  if (!input.fileUrl.trim()) return { ok: false, status: 400, error: "A file is required." };

  const baseSlug = slugify(name) || `asset-${Date.now().toString(36)}`;
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
  const status = input.publish ? "published" : "draft";

  const { data, error } = await supabase
    .from("marketplace_creative_assets")
    .insert({
      developer_id: profileRes.profile.id,
      slug,
      kind: input.kind,
      name,
      description: input.description?.trim().slice(0, 500) || null,
      category: input.category?.trim().slice(0, 40) || input.kind,
      tags: (input.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20),
      file_url: input.fileUrl.trim(),
      preview_url: input.previewUrl?.trim() || null,
      license_note: input.licenseNote?.trim().slice(0, 300) || "Free to use in your Kebu designs.",
      price_cents: 0,
      status,
    })
    .select(ASSET_COLUMNS)
    .single();

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: CREATIVE_ASSETS_TABLE_MISSING };
  }
  if (error || !data) {
    return { ok: false, status: 500, error: error?.message ?? "Could not publish this asset." };
  }
  return { ok: true, item: data as CreativeAssetRow };
}

export async function setCreativeAssetStatus(
  supabase: SupabaseClient,
  userId: string,
  assetId: string,
  status: "draft" | "published" | "archived",
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const mine = await listDeveloperCreativeAssets(supabase, userId);
  if (!mine.ok) return mine;
  if (!mine.profile) return { ok: false, status: 403, error: "Create a developer account first." };
  const row = mine.items.find((i) => i.id === assetId);
  if (!row) return { ok: false, status: 404, error: "Asset not found." };

  const { error } = await supabase
    .from("marketplace_creative_assets")
    .update({ status })
    .eq("id", assetId);
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true };
}

/** Free-use "add to my library" — no payment path exists in this slice by design. */
export async function acquireCreativeAsset(
  supabase: SupabaseClient,
  userId: string,
  assetId: string,
): Promise<
  | { ok: true; alreadyOwned: boolean; item: { id: string; name: string; kind: CreativeAssetKind } }
  | { ok: false; status: number; error: string }
> {
  const { data: asset, error: assetErr } = await supabase
    .from("marketplace_creative_assets")
    .select("id, name, kind, status, price_cents, acquire_count")
    .eq("id", assetId)
    .maybeSingle();
  if (assetErr && tableMissing(assetErr.message)) {
    return { ok: false, status: 503, error: CREATIVE_ASSETS_TABLE_MISSING };
  }
  if (assetErr) return { ok: false, status: 500, error: assetErr.message };
  if (!asset || asset.status !== "published") {
    return { ok: false, status: 404, error: "Asset not found." };
  }
  if (asset.price_cents > 0) {
    return { ok: false, status: 503, error: "Paid assets are not available yet." };
  }

  const { data: existing, error: existErr } = await supabase
    .from("creative_asset_library")
    .select("id")
    .eq("owner_id", userId)
    .eq("asset_id", assetId)
    .maybeSingle();
  if (existErr) return { ok: false, status: 500, error: existErr.message };
  if (existing) {
    return { ok: true, alreadyOwned: true, item: { id: asset.id, name: asset.name, kind: asset.kind } };
  }

  const { error: insErr } = await supabase
    .from("creative_asset_library")
    .insert({ owner_id: userId, asset_id: assetId, status: "owned" });
  if (insErr) return { ok: false, status: 500, error: insErr.message };

  await supabase
    .from("marketplace_creative_assets")
    .update({ acquire_count: asset.acquire_count + 1 })
    .eq("id", assetId);

  return { ok: true, alreadyOwned: false, item: { id: asset.id, name: asset.name, kind: asset.kind } };
}

export async function listMyCreativeAssetLibrary(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  | { ok: true; items: (CreativeAssetLibraryRow & { asset: CreativeAssetRow | null })[] }
  | { ok: false; status: number; error: string }
> {
  const { data, error } = await supabase
    .from("creative_asset_library")
    .select(`id, owner_id, asset_id, status, created_at, marketplace_creative_assets(${ASSET_COLUMNS})`)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: CREATIVE_ASSETS_TABLE_MISSING };
  }
  if (error) return { ok: false, status: 500, error: error.message };

  const items = (data ?? []).map((row) => {
    const r = row as CreativeAssetLibraryRow & { marketplace_creative_assets?: CreativeAssetRow | CreativeAssetRow[] | null };
    const asset = Array.isArray(r.marketplace_creative_assets) ? r.marketplace_creative_assets[0] : r.marketplace_creative_assets;
    return { id: r.id, owner_id: r.owner_id, asset_id: r.asset_id, status: r.status, created_at: r.created_at, asset: asset ?? null };
  });
  return { ok: true, items };
}
