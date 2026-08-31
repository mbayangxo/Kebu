import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { websiteDefinitionSchema } from "@/lib/create/website-schema";
import { publicSiteRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

/** Public published site — live deployment snapshot only (no draft leak). */
export async function GET(req: Request, { params }: Params) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subdomain)) {
    return NextResponse.json({ error: "Invalid subdomain." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deployments")
    .select("id, subdomain, snapshot, public_path, published_at, status")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Deployments missing. Apply migration 008."
          : "Could not load site.",
      },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  const parsed = websiteDefinitionSchema.safeParse(data.snapshot);
  if (!parsed.success) {
    return NextResponse.json({ error: "Published snapshot invalid." }, { status: 500 });
  }

  return NextResponse.json({
    subdomain: data.subdomain,
    publicPath: data.public_path,
    publishedAt: data.published_at,
    definition: parsed.data,
  });
}
