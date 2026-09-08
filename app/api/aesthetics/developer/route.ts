import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import {
  getOrCreateDeveloperProfile,
  listDeveloperMarketplaceAesthetics,
} from "@/lib/create/aesthetics-marketplace";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  bio: z.string().trim().max(500).optional(),
  websiteUrl: z.string().trim().max(200).optional(),
});

/** Get or create a developer account (sell aesthetics). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const listed = await listDeveloperMarketplaceAesthetics(auth.supabase, auth.user.id);
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
    listings: listed.items.map((i) => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      description: i.description,
      category: i.category,
      priceCents: i.price_cents,
      status: i.status,
      salesCount: i.sales_count,
      createdAt: i.created_at,
    })),
  });
}

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
    return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  }

  const result = await getOrCreateDeveloperProfile(auth.supabase, auth.user.id, {
    displayName: parsed.data.displayName,
    bio: parsed.data.bio,
    websiteUrl: parsed.data.websiteUrl,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    ok: true,
    created: result.created,
    profile: {
      id: result.profile.id,
      displayName: result.profile.display_name,
      bio: result.profile.bio,
      websiteUrl: result.profile.website_url,
      status: result.profile.status,
    },
  });
}
