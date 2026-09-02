import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";

export const dynamic = "force-dynamic";

/** Public hope & heritage stories — filterable by theme and country. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const theme = url.searchParams.get("theme");
  const country = url.searchParams.get("country")?.toUpperCase();

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable.", stories: [] }, { status: 503 });
  }

  let query = admin
    .from("opportunity_stories")
    .select(
      "id, slug, title, person_name, country_code, era, summary, lesson, themes, resource_tags, trust_label, source_url",
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (country && country.length === 2) {
    query = query.eq("country_code", country);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("does not exist") ? "Apply migration 026." : "Could not load stories." },
      { status: 500 },
    );
  }

  let stories = data ?? [];
  if (theme) {
    stories = stories.filter((s) => s.themes?.includes(theme) || s.resource_tags?.includes(theme));
  }

  return NextResponse.json({ stories });
}
