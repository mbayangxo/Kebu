import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, logCreate } from "@/lib/create/auth";
import { siteSeoSchema } from "@/lib/create/site-seo";
import { builderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const settingsSchema = z.object({
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(48)
    .optional(),
  seo: siteSeoSchema.partial().optional(),
});

/** Update publish subdomain + SEO/favicon settings for an owned project. */
export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, title, subdomain, seo")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (parsed.data.subdomain) {
    const { data: taken } = await supabase
      .from("projects")
      .select("id")
      .eq("subdomain", parsed.data.subdomain)
      .neq("id", id)
      .maybeSingle();

    if (taken) {
      return NextResponse.json({ error: "Subdomain already taken. Choose another." }, { status: 409 });
    }

    const { data: liveOther } = await supabase
      .from("deployments")
      .select("id, project_id")
      .eq("subdomain", parsed.data.subdomain)
      .eq("status", "live")
      .maybeSingle();

    if (liveOther && liveOther.project_id !== id) {
      return NextResponse.json({ error: "Subdomain is live on another project." }, { status: 409 });
    }

    patch.subdomain = parsed.data.subdomain;
  }

  if (parsed.data.seo) {
    const currentSeo =
      project.seo && typeof project.seo === "object" ? (project.seo as Record<string, unknown>) : {};
    const merged = siteSeoSchema.parse({ ...currentSeo, ...parsed.data.seo });
    patch.seo = merged;
  }

  const { data: updated, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, subdomain, seo, updated_at")
    .single();

  if (error || !updated) {
    logCreate("website.settings_failed", { userId: user.id, projectId: id, message: error?.message });
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "SEO settings column missing. Apply migration 013."
          : "Could not save settings.",
        detail: error?.message,
      },
      { status: 500 },
    );
  }

  logCreate("website.settings_saved", { userId: user.id, projectId: id });

  return NextResponse.json({
    project: updated,
    httpsUrl: updated.subdomain ? `https://${updated.subdomain}.kebu.africa` : null,
    message: "Settings saved. Publish again to update your live site SEO.",
  });
}
