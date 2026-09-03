import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import {
  deleteProjectTheme,
  editProjectTheme,
  publishProjectTheme,
  renameProjectTheme,
} from "@/lib/create/project-themes";
import { serializeKebuTemplateFile } from "@/lib/create/kebu-template-file";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; themeId: string }> };

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rename"), name: z.string().trim().min(1).max(80) }),
  z.object({ action: z.literal("edit") }),
  z.object({ action: z.literal("publish") }),
]);

export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id: projectId, themeId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  if (parsed.data.action === "rename") {
    const result = await renameProjectTheme(auth.supabase, auth.user.id, projectId, themeId, parsed.data.name);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "edit") {
    const result = await editProjectTheme(auth.supabase, auth.user.id, projectId, themeId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, editorPath: `/create/${projectId}` });
  }

  const result = await publishProjectTheme(auth.supabase, auth.user.id, projectId, themeId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({
    ok: true,
    previousLiveId: result.previousLiveId,
    wentLive: result.wentLive,
    message: result.wentLive
      ? "This template is live. The previous public template is now a draft."
      : "This template is now the live one for this site. The previous template is a draft. Publish the site when you want visitors to see it.",
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id: projectId, themeId } = await params;
  const result = await deleteProjectTheme(auth.supabase, auth.user.id, projectId, themeId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

/** Download this named template as Kebu JSON (share / re-upload). */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id: projectId, themeId } = await params;

  const { data: theme, error } = await auth.supabase
    .from("project_themes")
    .select("name, definition, project_id")
    .eq("id", themeId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error?.message?.includes("does not exist")) {
    return NextResponse.json(
      { error: "Template library tables missing. Apply supabase/migrations/033_project_themes.sql." },
      { status: 503 },
    );
  }
  if (!theme) return NextResponse.json({ error: "Template not found." }, { status: 404 });

  const { data: project } = await auth.supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const file = serializeKebuTemplateFile(theme.name, theme.definition);
  return NextResponse.json(file);
}
