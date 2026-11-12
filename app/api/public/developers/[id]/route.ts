import { NextResponse } from "next/server";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

function safeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Public developer profile card for Kebu Search result pages.
 * Re-checks status='approved' directly (never trusts search_documents,
 * which can be stale) — a suspended, rejected, or pending profile always
 * 404s, mirroring the same contract as every other public Search detail
 * route in this slice.
 */
export async function GET(req: Request, { params }: Params) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: developer, error } = await admin
    .from("developer_profiles")
    .select("id, display_name, bio, website_url, status, updated_at")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    console.error("[public/developers] lookup failed:", error);
    return NextResponse.json({ error: "This profile could not load." }, { status: 500 });
  }
  if (!developer) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    developer: {
      id: developer.id,
      name: developer.display_name,
      bio: developer.bio,
      websiteUrl: safeUrl(developer.website_url),
      updatedAt: developer.updated_at,
    },
  });
}
