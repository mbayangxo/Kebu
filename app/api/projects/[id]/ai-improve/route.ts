import { NextRequest, NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { aiRateLimit } from "@/lib/api-guard";
import { improveWebsiteWithAi } from "@/lib/create/ai-improve";
import { buildSnapshotFromDb, replaceWebsiteDefinition } from "@/lib/create/persist-site";
import { aiImproveBriefSchema } from "@/lib/create/website-schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Improve an owned draft website with AI (validated website-v1).
 * Does not publish — live site stays until the owner publishes again.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const limited = aiRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = aiImproveBriefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, title")
    .eq("id", id)
    .maybeSingle();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const current = await buildSnapshotFromDb(supabase, id);
  if (!current) {
    return NextResponse.json({ error: "Could not load current site." }, { status: 500 });
  }

  const ai = await improveWebsiteWithAi(current, parsed.data);
  if (!ai.ok) {
    logCreate("website.ai_improve_failed", { userId: user.id, projectId: id, error: ai.error });
    return NextResponse.json({ error: ai.error }, { status: 502 });
  }

  const replaced = await replaceWebsiteDefinition({
    supabase,
    user,
    projectId: id,
    definition: ai.definition,
    versionLabel: "AI improve",
  });

  if (!replaced.ok) {
    logCreate("website.ai_improve_persist_failed", {
      userId: user.id,
      projectId: id,
      error: replaced.error,
    });
    return NextResponse.json(
      { error: replaced.error, detail: replaced.detail },
      { status: replaced.status }
    );
  }

  logCreate("website.ai_improved", {
    userId: user.id,
    projectId: id,
    repaired: ai.repaired,
    versionNumber: replaced.versionNumber,
  });

  return NextResponse.json({
    ok: true,
    repaired: ai.repaired,
    versionNumber: replaced.versionNumber,
    title: ai.definition.title,
    message: "Draft updated. Publish again to update your live site.",
  });
}
