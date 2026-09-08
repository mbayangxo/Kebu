import { NextRequest, NextResponse } from "next/server";
import { aiRateLimit } from "@/lib/api-guard";
import { guardAiImproveProject, logAiImproveFailure } from "@/lib/create/ai-improve-route";
import { replaceWebsiteDefinition, buildSnapshotFromDb } from "@/lib/create/persist-site";
import { mergePartialAiDefinition } from "@/lib/create/ai-improve-merge";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { logCreate } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Persist a validated website-v1 definition after the owner confirms preview.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const definitionRaw =
    body && typeof body === "object" && "definition" in body
      ? (body as { definition: unknown }).definition
      : null;

  if (!definitionRaw) {
    return NextResponse.json({ error: "Missing definition to apply." }, { status: 400 });
  }

  const validated = validateWebsiteDefinition(definitionRaw);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error, issues: validated.issues }, { status: 400 });
  }

  const acceptedSectionIds = Array.isArray((body as { acceptedSectionIds?: unknown }).acceptedSectionIds)
    ? ((body as { acceptedSectionIds: string[] }).acceptedSectionIds ?? []).filter(
        (id) => typeof id === "string" && id.trim().length > 0,
      )
    : null;

  const limited = aiRateLimit(req);
  if (limited) return limited;

  const guarded = await guardAiImproveProject(id);
  if (!guarded.ok) return guarded.response;

  const { supabase, user, project } = guarded;

  let definitionToApply = validated.data;

  if (acceptedSectionIds !== null) {
    if (acceptedSectionIds.length === 0) {
      return NextResponse.json({ error: "Select at least one section to apply." }, { status: 400 });
    }
    const current = await buildSnapshotFromDb(supabase, project.id);
    if (!current) {
      return NextResponse.json({ error: "Could not load current draft for partial apply." }, { status: 500 });
    }
    definitionToApply = mergePartialAiDefinition(current, validated.data, acceptedSectionIds);
    const revalidated = validateWebsiteDefinition(definitionToApply);
    if (!revalidated.ok) {
      return NextResponse.json({ error: revalidated.error, issues: revalidated.issues }, { status: 400 });
    }
    definitionToApply = revalidated.data;
  }

  const replaced = await replaceWebsiteDefinition({
    supabase,
    user,
    projectId: project.id,
    definition: definitionToApply,
    versionLabel: "AI improve",
  });

  if (!replaced.ok) {
    logAiImproveFailure("website.ai_improve_apply_failed", user.id, project.id, replaced.error);
    return NextResponse.json(
      { error: replaced.error, detail: replaced.detail },
      { status: replaced.status },
    );
  }

  logCreate("website.ai_improved", {
    userId: user.id,
    projectId: project.id,
    versionNumber: replaced.versionNumber,
    viaPreview: true,
  });

  return NextResponse.json({
    ok: true,
    applied: true,
    versionNumber: replaced.versionNumber,
    title: validated.data.title,
    message: "Draft updated. Publish again to update your live site.",
  });
}
