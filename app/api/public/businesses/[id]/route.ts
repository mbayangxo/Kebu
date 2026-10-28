import { NextResponse } from "next/server";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

/**
 * Defense in depth: the write paths now reject non-http(s) website values
 * (see safeWebsiteUrlSchema), but this is the one place that value is ever
 * rendered as a raw href for a stranger to click, so it is re-validated
 * here too rather than trusting every past or future write path.
 */
function safeWebsiteUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Public business detail card for Kebu Search result pages.
 * Draft/suspended/archived businesses always 404 — mirrors the contract in
 * app/api/public/kebu-id/[kebuId]/route.ts (never leak private records).
 * Only fields safe for a stranger to see are selected; email/phone are
 * intentionally withheld pending a real, consented public-contact flow.
 */
export async function GET(req: Request, { params }: Params) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: business, error } = await admin
    .from("businesses")
    .select("id, public_kebu_id, legal_name, trading_name, country_code, region, category, description, website, verification_level, lifecycle_status, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[public/businesses] lookup failed:", error);
    return NextResponse.json({ error: "This business profile could not load." }, { status: 500 });
  }

  if (!business || business.lifecycle_status !== "active") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    business: {
      id: business.id,
      kebuId: business.public_kebu_id,
      name: business.trading_name || business.legal_name,
      legalName: business.legal_name,
      countryCode: business.country_code,
      region: business.region,
      category: business.category,
      description: business.description,
      website: safeWebsiteUrl(business.website),
      verified: (business.verification_level ?? 0) > 0,
      updatedAt: business.updated_at,
    },
  });
}
