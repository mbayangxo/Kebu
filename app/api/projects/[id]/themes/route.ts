import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { parseKebuTemplateFile } from "@/lib/create/kebu-template-file";
import { addProjectTheme, listProjectThemes } from "@/lib/create/project-themes";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const addSchema = z.object({
  name: z.string().trim().min(1).max(80),
  source: z.enum(["current", "catalog", "upload"]),
  catalogSlug: z.string().trim().max(80).optional(),
  fileJson: z.unknown().optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id: projectId } = await params;
  const result = await listProjectThemes(auth.supabase, auth.user.id, projectId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({
    themes: result.themes.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      source: t.source,
      catalogSlug: t.catalog_slug,
      publishedAt: t.published_at,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    })),
    activeThemeId: result.activeThemeId,
    liveThemeId: result.liveThemeId,
  });
}

export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Each template needs a name and a source." }, { status: 400 });
  }

  let definition = undefined;
  let name = parsed.data.name;
  if (parsed.data.source === "upload") {
    const file = parseKebuTemplateFile(parsed.data.fileJson, name);
    if (!file.ok) return NextResponse.json({ error: file.error }, { status: 400 });
    definition = file.definition;
    if (!parsed.data.name.trim()) name = file.name;
  }

  const result = await addProjectTheme(auth.supabase, auth.user.id, projectId, {
    name,
    source: parsed.data.source,
    catalogSlug: parsed.data.catalogSlug,
    definition,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({
    ok: true,
    theme: {
      id: result.theme.id,
      name: result.theme.name,
      status: result.theme.status,
      source: result.theme.source,
    },
  });
}
