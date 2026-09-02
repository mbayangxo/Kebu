import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  SITE_ASSET_SPECS,
  guessContentType,
  type SiteAssetKind,
} from "@/lib/create/site-asset-upload";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_KINDS = new Set<string>(Object.keys(SITE_ASSET_SPECS));

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "ico"]);
const AUDIO_EXT = new Set(["mp3", "m4a", "wav", "ogg", "aac"]);
const VIDEO_EXT = new Set(["mp4", "webm", "mov"]);

function safeExtForKind(kind: SiteAssetKind, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  if (kind === "audio") return AUDIO_EXT.has(ext) ? ext : "mp3";
  if (kind === "video") return VIDEO_EXT.has(ext) ? ext : "mp4";
  return IMAGE_EXT.has(ext) ? ext : "jpg";
}

/** Upload site media (images, audio, video) to public storage. */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const kind = String(form.get("kind") ?? "section");
  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: "Invalid asset kind." }, { status: 400 });
  }

  const spec = SITE_ASSET_SPECS[kind as SiteAssetKind];
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }

  if (file.size > spec.maxBytes) {
    return NextResponse.json(
      { error: `File is too large. Max ${Math.round(spec.maxBytes / (1024 * 1024))} MB for ${spec.label}.` },
      { status: 400 },
    );
  }

  const safeExt = safeExtForKind(kind as SiteAssetKind, file.name);
  const objectPath = `${user.id}/${projectId}/${kind}-${Date.now()}.${safeExt}`;
  const contentType = guessContentType(file);

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage.from("site-assets").upload(objectPath, buffer, {
    contentType,
    upsert: false,
  });

  if (uploadErr) {
    return NextResponse.json(
      {
        error: uploadErr.message?.includes("Bucket not found")
          ? "Site assets storage missing. Apply migrations 023 and 029."
          : uploadErr.message?.includes("mime type")
            ? "File type not allowed. Apply migration 029 for audio/video."
            : "Upload failed.",
        detail: uploadErr.message,
      },
      { status: 500 },
    );
  }

  const { data: publicUrl } = supabase.storage.from("site-assets").getPublicUrl(objectPath);

  await supabase.from("website_assets").insert({
    project_id: projectId,
    kind: spec.storageKind,
    url: publicUrl.publicUrl,
    created_by: user.id,
  });

  logCreate("website.asset_uploaded", { userId: user.id, projectId, kind, storageKind: spec.storageKind });

  return NextResponse.json({
    url: publicUrl.publicUrl,
    path: objectPath,
    kind,
    storageKind: spec.storageKind,
  });
}
