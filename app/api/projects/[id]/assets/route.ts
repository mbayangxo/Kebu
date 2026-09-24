import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertProjectEditorAccess, dbForProjectAccess } from "@/lib/create/project-access";
import { createServiceClient } from "@/lib/opportunity/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** List uploaded site assets for the project media library. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const access = await assertProjectEditorAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "asset.list",
  });

  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const db = dbForProjectAccess(supabase, access.via);

  const { data: assets, error } = await db
    .from("website_assets")
    .select("id, url, kind, alt, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(48);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Assets table missing. Apply migration 008."
          : "Could not load assets.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ assets: assets ?? [] });
}

const deleteAssetSchema = z.object({
  assetId: z.string().uuid(),
});

/** Delete a site asset by id — removes from DB and storage. */
export async function DELETE(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const access = await assertProjectEditorAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "asset.delete",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = deleteAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const db = dbForProjectAccess(supabase, access.via);

  // Fetch the asset to verify it belongs to this project before deleting.
  const { data: asset } = await db
    .from("website_assets")
    .select("id, url")
    .eq("id", parsed.data.assetId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  // Reference check: scan section props and project-level JSON columns for this URL.
  // An asset that is actively used in a section, chrome, theme, or SEO cannot be deleted.
  // Two-step: fetch page IDs for the project, then fetch section props.
  const { data: projectSections } = await db
    .from("project_sections")
    .select("id, props")
    .in(
      "page_id",
      (
        await db
          .from("project_pages")
          .select("id")
          .eq("project_id", projectId)
      ).data?.map((p) => p.id) ?? [],
    );

  const assetUrl = asset.url;
  const inSections = (projectSections ?? []).some((s) => {
    try {
      return JSON.stringify(s.props).includes(assetUrl);
    } catch {
      return false;
    }
  });

  if (inSections) {
    return NextResponse.json(
      { error: "Asset is used in a section and cannot be deleted. Remove it from your content first." },
      { status: 409 },
    );
  }

  // Check project-level JSON (theme, seo, site_chrome).
  const { data: proj } = await db
    .from("projects")
    .select("theme, seo, site_chrome")
    .eq("id", projectId)
    .maybeSingle();

  const projJson = JSON.stringify(proj ?? "");
  if (projJson.includes(assetUrl)) {
    return NextResponse.json(
      { error: "Asset is used in site settings (theme, SEO, or navigation) and cannot be deleted. Remove it first." },
      { status: 409 },
    );
  }

  // Remove the DB record first.
  const { error: dbErr } = await db
    .from("website_assets")
    .delete()
    .eq("id", parsed.data.assetId);

  if (dbErr) {
    return NextResponse.json({ error: "Could not delete asset.", detail: dbErr.message }, { status: 500 });
  }

  // Extract storage path from the public URL and remove from storage (best-effort).
  try {
    const url = new URL(asset.url);
    // Public URL pattern: /storage/v1/object/public/site-assets/<path>
    const match = url.pathname.match(/\/storage\/v1\/object\/public\/site-assets\/(.+)/);
    if (match?.[1]) {
      const storageClient = createServiceClient() ?? db;
      await storageClient.storage.from("site-assets").remove([decodeURIComponent(match[1])]);
    }
  } catch {
    /* storage removal is best-effort; DB record is already gone */
  }

  return NextResponse.json({ ok: true });
}
