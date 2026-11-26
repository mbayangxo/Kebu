import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { builderRateLimit } from "@/lib/api-guard";
import { requireUser, logCreate } from "@/lib/create/auth";
import {
  buildSnapshotFromDb,
  replaceWebsiteDefinition,
} from "@/lib/create/persist-site";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { recordProjectFlow } from "@/lib/platform/flow-events";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const restoreSchema = z.object({
  versionId: z.string().uuid(),
});

export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = restoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "versionId required." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: version, error: versionError } = await supabase
    .from("website_versions")
    .select("id, version_number, snapshot")
    .eq("id", parsed.data.versionId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (versionError || !version) {
    return NextResponse.json({ error: "Version not found." }, { status: 404 });
  }

  const validated = validateWebsiteDefinition(version.snapshot);
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Saved version is no longer valid.", detail: validated.error },
      { status: 409 },
    );
  }

  const current = await buildSnapshotFromDb(supabase, projectId);
  if (!current) {
    return NextResponse.json({ error: "Could not checkpoint current draft." }, { status: 500 });
  }

  const { data: lastVersion } = await supabase
    .from("website_versions")
    .select("version_number")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const checkpointNumber = (lastVersion?.version_number ?? 0) + 1;
  const { error: checkpointError } = await supabase.from("website_versions").insert({
    project_id: projectId,
    version_number: checkpointNumber,
    label: "Before restore",
    snapshot: current,
    created_by: user.id,
  });

  if (checkpointError) {
    return NextResponse.json(
      { error: "Could not checkpoint current draft before restore." },
      { status: 500 },
    );
  }

  const restored = await replaceWebsiteDefinition({
    supabase,
    user,
    projectId,
    definition: validated.data,
    versionLabel: `Restored version ${version.version_number}`,
  });

  if (!restored.ok) {
    return NextResponse.json(
      { error: restored.error, detail: restored.detail },
      { status: restored.status },
    );
  }

  logCreate("website.version_restored", {
    userId: user.id,
    projectId,
    sourceVersionNumber: version.version_number,
    newVersionNumber: restored.versionNumber,
  });
  await recordProjectFlow({
    eventType: "website.version_restored",
    projectId,
    actorUserId: user.id,
    idempotencyKey: `website.version_restored:${projectId}:${restored.versionNumber}`,
    payload: { sourceVersionNumber: version.version_number, newVersionNumber: restored.versionNumber },
    notification: {
      title: "Draft restored",
      body: `Version ${version.version_number} was restored safely. Publish separately when ready.`,
      actionUrl: `/create/${projectId}`,
    },
  });

  return NextResponse.json({
    ok: true,
    restoredVersionNumber: version.version_number,
    newVersionNumber: restored.versionNumber,
    message: "Draft restored. Publish separately to update the live site.",
  });
}
