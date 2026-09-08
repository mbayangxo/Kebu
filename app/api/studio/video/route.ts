import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  VIDEO_ASPECT_PRESETS,
  emptyStudioComposition,
  studioCompositionSchema,
} from "@/lib/studio/composition";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120).default("Untitled video"),
  presetId: z.enum(["9:16", "1:1", "16:9", "4:5"]).optional().default("9:16"),
  width: z.number().int().min(200).max(4096).optional(),
  height: z.number().int().min(200).max(4096).optional(),
});

/** List owner's video projects (Phase 1). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("studio_video_projects")
    .select("id, title, width, height, frame_rate, edit_mode, updated_at, created_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(48);

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

  const preset = VIDEO_ASPECT_PRESETS.find((p) => p.id === parsed.data.presetId) ?? VIDEO_ASPECT_PRESETS[0]!;
  const width = parsed.data.width ?? preset.width;
  const height = parsed.data.height ?? preset.height;
  const composition = emptyStudioComposition({
    width,
    height,
    editMode: "full_timeline",
  });

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
    })
    .select("id, title, width, height, frame_rate, edit_mode, composition, created_at, updated_at")
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
