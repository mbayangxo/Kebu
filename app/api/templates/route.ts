import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";
import { ensureTemplatesSeeded } from "@/lib/create/ensure-templates";

export const dynamic = "force-dynamic";

/** List structured website templates (DB-backed when seeded; code fallback). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  // Best-effort seed when service policies allow; ignore failures
  try {
    await ensureTemplatesSeeded(supabase);
  } catch {
    /* ignore */
  }

  const { data: templates, error } = await supabase
    .from("site_templates")
    .select("id, slug, name, category, description")
    .eq("is_active", true)
    .order("category");

  if (!error && templates && templates.length > 0) {
    return NextResponse.json({ templates, source: "database" });
  }

  return NextResponse.json({
    templates: TEMPLATE_SEEDS.map((t) => ({
      id: `seed:${t.slug}`,
      slug: t.slug,
      name: t.name,
      category: t.category,
      description: t.description,
    })),
    source: "code_seed",
  });
}
