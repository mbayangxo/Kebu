import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import {
  CREATIVE_ASSET_KINDS,
  listPublishedCreativeAssets,
  type CreativeAssetKind,
} from "@/lib/studio/creative-assets-marketplace";

export const dynamic = "force-dynamic";

function isKind(v: string | null): v is CreativeAssetKind {
  return Boolean(v) && (CREATIVE_ASSET_KINDS as readonly string[]).includes(v as string);
}

/** Browse the published Studio Creative Assets marketplace (photos, fonts, patterns, textures). */
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const kindParam = url.searchParams.get("kind");
  const category = url.searchParams.get("category") ?? undefined;
  const query = url.searchParams.get("q") ?? undefined;

  const result = await listPublishedCreativeAssets(auth.supabase, {
    kind: isKind(kindParam) ? kindParam : undefined,
    category,
    query,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    items: result.items.map((i) => ({
      id: i.id,
      slug: i.slug,
      kind: i.kind,
      name: i.name,
      description: i.description,
      category: i.category,
      tags: i.tags,
      previewUrl: i.preview_url,
      licenseNote: i.license_note,
      priceCents: i.price_cents,
      acquireCount: i.acquire_count,
      developerName: i.developer_name ?? null,
      createdAt: i.created_at,
    })),
  });
}
