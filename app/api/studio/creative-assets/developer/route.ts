import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import {
  CREATIVE_ASSET_KINDS,
  createCreativeAsset,
  getOrCreateDeveloperProfile,
  listDeveloperCreativeAssets,
} from "@/lib/studio/creative-assets-marketplace";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  kind: z.enum(CREATIVE_ASSET_KINDS),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(40).optional(),
  tags: z.array(z.string().trim().max(30)).max(20).optional(),
  fileUrl: z.string().trim().url(),
  previewUrl: z.string().trim().url().optional(),
  licenseNote: z.string().trim().max(300).optional(),
  publish: z.boolean().optional(),
});

/** My developer profile (auto-created, auto-approved on first use — matches the aesthetics marketplace precedent) + my submitted assets. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const listed = await listDeveloperCreativeAssets(auth.supabase, auth.user.id);
  if (!listed.ok) return NextResponse.json({ error: listed.error }, { status: listed.status });

  return NextResponse.json({
    profile: listed.profile
      ? {
          id: listed.profile.id,
          displayName: listed.profile.display_name,
          bio: listed.profile.bio,
          websiteUrl: listed.profile.website_url,
          status: listed.profile.status,
        }
      : null,
    items: listed.items.map((i) => ({
      id: i.id,
      slug: i.slug,
      kind: i.kind,
      name: i.name,
      description: i.description,
      category: i.category,
      tags: i.tags,
      fileUrl: i.file_url,
      previewUrl: i.preview_url,
      licenseNote: i.license_note,
      priceCents: i.price_cents,
      acquireCount: i.acquire_count,
      status: i.status,
      createdAt: i.created_at,
    })),
  });
}

/** Publish a new photo / font / pattern / texture. Free-only in this slice — price is always 0. */
export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the asset's name, kind and file." }, { status: 400 });
  }

  if (parsed.data.displayName) {
    const profile = await getOrCreateDeveloperProfile(auth.supabase, auth.user.id, {
      displayName: parsed.data.displayName,
    });
    if (!profile.ok) return NextResponse.json({ error: profile.error }, { status: profile.status });
  }

  const result = await createCreativeAsset(auth.supabase, auth.user.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    ok: true,
    item: {
      id: result.item.id,
      slug: result.item.slug,
      kind: result.item.kind,
      name: result.item.name,
      status: result.item.status,
    },
  });
}
