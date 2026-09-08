import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { BRAND_KIT_SELECT, brandKitToSeoPatch, brandKitToTheme } from "@/lib/studio/brand-kit";
import { recalculateReadinessForProject } from "@/lib/kebu-id/recalculate-hooks";

export const dynamic = "force-dynamic";

const applySchema = z.object({
  brandKitId: z.string().uuid(),
  projectId: z.string().uuid(),
});

/** Apply Studio brand kit colors/fonts/logo to a Builder project theme + SEO. */
export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { data: kit } = await supabase
    .from("business_brand_kits")
    .select(BRAND_KIT_SELECT)
    .eq("id", parsed.data.brandKitId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!kit) {
    return NextResponse.json({ error: "Brand kit not found." }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, theme, seo")
    .eq("id", parsed.data.projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const theme = brandKitToTheme(kit);
  const seoPatch = brandKitToSeoPatch(kit);
  const prevSeo =
    typeof project.seo === "object" && project.seo ? (project.seo as Record<string, unknown>) : {};
  const prevTheme =
    typeof project.theme === "object" && project.theme ? (project.theme as Record<string, unknown>) : {};

  const { data: updated, error } = await supabase
    .from("projects")
    .update({
      theme: { ...prevTheme, ...theme },
      seo: { ...prevSeo, ...seoPatch },
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.projectId)
    .select("id, theme, seo")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Could not apply brand to project." }, { status: 500 });
  }

  await recalculateReadinessForProject(supabase, parsed.data.projectId);

  return NextResponse.json({
    ok: true,
    projectId: updated.id,
    theme: updated.theme,
    seo: updated.seo,
    message: "Brand kit applied — publish to update your live site.",
  });
}
