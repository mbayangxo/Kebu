import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { buildSnapshotFromDb } from "@/lib/create/persist-site";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const publishSchema = z.object({
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(48)
    .optional(),
});

/** Publish project → live deployment snapshot + public /sites/{subdomain}. */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, title, subdomain, status")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const subdomain = parsed.data.subdomain || project.subdomain;
  if (!subdomain) {
    return NextResponse.json({ error: "Subdomain required to publish." }, { status: 400 });
  }

  const snapshot = await buildSnapshotFromDb(supabase, id);
  if (!snapshot) {
    return NextResponse.json({ error: "Could not build site snapshot." }, { status: 500 });
  }

  const validated = validateWebsiteDefinition(snapshot);
  if (!validated.ok) {
    return NextResponse.json({ error: "Site failed validation before publish.", detail: validated.error }, { status: 400 });
  }

  // Supersede previous live deployment for this subdomain (owned by others blocked by unique live index)
  const { data: existingLive } = await supabase
    .from("deployments")
    .select("id, project_id")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();

  if (existingLive && existingLive.project_id !== id) {
    return NextResponse.json({ error: "Subdomain is already published by another project." }, { status: 409 });
  }

  if (existingLive) {
    await supabase.from("deployments").update({ status: "superseded" }).eq("id", existingLive.id);
  }

  const publicPath = `/sites/${subdomain}`;
  const { data: deployment, error: depErr } = await supabase
    .from("deployments")
    .insert({
      project_id: id,
      subdomain,
      snapshot: validated.data,
      status: "live",
      published_by: user.id,
      public_path: publicPath,
    })
    .select("id, subdomain, public_path, published_at, status")
    .single();

  if (depErr || !deployment) {
    logCreate("website.publish_failed", { userId: user.id, projectId: id, message: depErr?.message });
    return NextResponse.json(
      {
        error: depErr?.message?.includes("does not exist")
          ? "Deployments table missing. Apply migration 008."
          : "Could not publish.",
        detail: depErr?.message,
      },
      { status: 500 }
    );
  }

  await supabase
    .from("projects")
    .update({ status: "published", subdomain, published_at: new Date().toISOString() })
    .eq("id", id);

  // Version history entry
  const { data: lastVer } = await supabase
    .from("website_versions")
    .select("version_number")
    .eq("project_id", id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("website_versions").insert({
    project_id: id,
    version_number: (lastVer?.version_number ?? 0) + 1,
    label: "Published",
    snapshot: validated.data,
    created_by: user.id,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  const liveUrl = appUrl ? `${appUrl}${publicPath}` : publicPath;
  const kebuAfricaHint = `https://${subdomain}.kebu.africa`;

  logCreate("website.published", { userId: user.id, projectId: id, subdomain });

  return NextResponse.json({
    deployment,
    liveUrl,
    kebuAfricaUrl: kebuAfricaHint,
    note: "Live content is served from /sites/{subdomain}. Point *.kebu.africa DNS to this app to use the branded subdomain.",
  });
}
