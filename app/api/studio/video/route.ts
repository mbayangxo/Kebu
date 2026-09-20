import { NextResponse } from "next/server";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { loadActiveWorkspaceScope } from "@/lib/account/server-workspace";
import {
  VIDEO_ASPECT_PRESETS,
  addAssetToComposition,
  addClipFromAsset,
  emptyStudioComposition,
  newCompositionId,
  studioCompositionSchema,
  updateClip,
} from "@/lib/studio/composition";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120).default("Untitled video"),
  presetId: z.enum(["9:16", "1:1", "16:9", "4:5"]).optional().default("9:16"),
  width: z.number().int().min(200).max(4096).optional(),
  height: z.number().int().min(200).max(4096).optional(),
  sourceDesignId: z.string().uuid().optional(),
  sourceImageUrl: z.string().url().max(500).optional(),
  sourceImages: z.array(z.object({
    url: z.string().url().max(500),
    name: z.string().trim().min(1).max(120).optional(),
    durationMs: z.number().int().min(500).max(30_000).optional().default(3000),
    pageId: z.string().trim().min(1).max(40).optional(),
  })).max(20).optional(),
});

/** List owner's video projects (Phase 1). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  let query = supabase
    .from("studio_video_projects")
    .select("id, title, width, height, frame_rate, edit_mode, business_id, source_design_id, owner_id, updated_at, created_at")
    .order("updated_at", { ascending: false })
    .limit(48);

  query = workspace.activeBusinessId
    ? query.eq("business_id", workspace.activeBusinessId)
    : query.is("business_id", null);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Video projects missing. Apply migration 075."
          : "Could not load video projects.",
        projects: [],
      },
      { status: error.message?.includes("does not exist") ? 503 : 500 },
    );
  }

  return NextResponse.json({ projects: data ?? [] });
}

/** Create a new multi-track video project. */
export async function POST(req: Request) {
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid project input." }, { status: 400 });
  }

  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  if (parsed.data.sourceDesignId) {
    let sourceQuery = supabase
      .from("create_designs")
      .select("id, business_id, canvas")
      .eq("id", parsed.data.sourceDesignId);
    sourceQuery = workspace.activeBusinessId
      ? sourceQuery.eq("business_id", workspace.activeBusinessId)
      : sourceQuery.is("business_id", null);
    const { data: sourceDesign } = await sourceQuery.maybeSingle();
    if (!sourceDesign) {
      return NextResponse.json({ error: "That source design is not available in the current Kebu space." }, { status: 403 });
    }
    const sourcePageIds = new Set(
      Array.isArray((sourceDesign.canvas as { pages?: unknown[] } | null)?.pages)
        ? ((sourceDesign.canvas as { pages: Array<{ id?: unknown }> }).pages)
            .map((page) => typeof page?.id === "string" ? page.id : null)
            .filter((id): id is string => Boolean(id))
        : [],
    );
    if ((parsed.data.sourceImages ?? []).some((item) => item.pageId && !sourcePageIds.has(item.pageId))) {
      return NextResponse.json({ error: "One or more source pages no longer belong to this design." }, { status: 409 });
    }
  }

  const sourceImages = parsed.data.sourceImages?.length
    ? parsed.data.sourceImages
    : parsed.data.sourceImageUrl
      ? [{ url: parsed.data.sourceImageUrl, name: parsed.data.title + " design", durationMs: 3000 }]
      : [];

  if (sourceImages.length) {
    const urls = [...new Set(sourceImages.map((item) => item.url))];
    let uploadQuery = supabase
      .from("studio_uploads")
      .select("id, url, kind, business_id")
      .in("url", urls)
      .eq("kind", "image");
    uploadQuery = workspace.activeBusinessId
      ? uploadQuery.eq("business_id", workspace.activeBusinessId)
      : uploadQuery.is("business_id", null);
    const { data: sourceUploads } = await uploadQuery;
    const allowed = new Set((sourceUploads ?? []).map((item) => item.url));
    if (urls.some((url) => !allowed.has(url))) {
      return NextResponse.json({ error: "One or more design snapshots are not available in the current Kebu space." }, { status: 403 });
    }
  }

  const preset = VIDEO_ASPECT_PRESETS.find((p) => p.id === parsed.data.presetId) ?? VIDEO_ASPECT_PRESETS[0]!;
  const width = parsed.data.width ?? preset.width;
  const height = parsed.data.height ?? preset.height;
  let composition = emptyStudioComposition({
    width,
    height,
    editMode: parsed.data.sourceDesignId || sourceImages.length ? "smart_edit" : "full_timeline",
  });

  let cursorMs = 0;
  for (let index = 0; index < sourceImages.length; index += 1) {
    const source = sourceImages[index]!;
    const assetId = newCompositionId("asset");
    const sceneId = newCompositionId("scene");
    composition = addAssetToComposition(composition, {
      id: assetId,
      kind: "image",
      url: source.url,
      fileName: source.name || "Design page " + (index + 1),
      durationMs: source.durationMs,
      width,
      height,
    });
    const withClip = addClipFromAsset(composition, assetId, { atMs: cursorMs, sourceDesignPageId: source.pageId ?? null });
    if ("error" in withClip) continue;
    composition = withClip;
    const clip = composition.clips[composition.clips.length - 1];
    if (clip) {
      const linked = updateClip(composition, clip.id, { sceneId });
      if (!("error" in linked)) composition = linked;
    }
    composition = {
      ...composition,
      storyboard: [
        ...composition.storyboard,
        {
          id: sceneId,
          name: source.name || "Scene " + (index + 1),
          intent: "Imported from Kebu Studio design",
          durationMs: source.durationMs,
          order: index,
        },
      ],
    };
    cursorMs += source.durationMs;
  }

  const { data: project, error } = await supabase
    .from("studio_video_projects")
    .insert({
      owner_id: user.id,
      title: parsed.data.title,
      width,
      height,
      frame_rate: composition.frameRate,
      edit_mode: composition.editMode,
      composition,
      business_id: workspace.activeBusinessId,
      source_design_id: parsed.data.sourceDesignId ?? null,
    })
    .select("id, title, width, height, frame_rate, edit_mode, business_id, source_design_id, composition, created_at, updated_at")
    .single();

  if (error || !project) {
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "Video projects missing. Apply migration 075."
          : error?.message ?? "Could not create project.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ project });
}

export { studioCompositionSchema };
