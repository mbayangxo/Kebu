import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  opportunityCardSlugSchema,
  rowToOpportunityCardDetail,
} from "@/lib/opportunity/opportunity-card-schema";

export const dynamic = "force-dynamic";

/** Public detail for one published Opportunity Card. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await ctx.params;
  const parsed = opportunityCardSlugSchema.safeParse(rawSlug?.toLowerCase());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid card slug." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunity_cards")
    .select("*")
    .eq("slug", parsed.data)
    .eq("publish_status", "published")
    .maybeSingle();

  if (error) {
    const missing = error.message.includes("does not exist") || error.code === "42P01";
    return NextResponse.json(
      {
        error: missing
          ? "Opportunity Cards table missing. Apply migration 063."
          : "Could not load card.",
      },
      { status: missing ? 503 : 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Opportunity card not found." }, { status: 404 });
  }

  return NextResponse.json({ card: rowToOpportunityCardDetail(data) });
}
