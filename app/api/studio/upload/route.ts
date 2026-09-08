import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";
import { resolveStudioDesignAccess } from "@/lib/studio/design-access";

export const dynamic = "force-dynamic";

const IMAGE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 25 * 1024 * 1024;
const AUDIO_MAX = 15 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
]);

/**
 * Studio media upload → site-assets bucket → public URL for canvas layers / soundtrack.
 * Images (≤5 MB) · short video (≤25 MB) · soundtrack audio (≤15 MB).
 * Path: {userId}/studio/{designId|misc}/{uuid}.ext
 */
export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const designId = String(form.get("designId") ?? "").trim();
  if (designId && /^[0-9a-f-]{36}$/i.test(designId)) {
    const access = await resolveStudioDesignAccess(supabase, { designId, userId: user.id });
    if (!access?.canEdit) {
      return NextResponse.json({ error: "Design not found or view-only." }, { status: 404 });
    }
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }

  const mime = (file.type || "").toLowerCase();
  const isVideo = VIDEO_TYPES.has(mime);
  const isImage = IMAGE_TYPES.has(mime);
  const isAudio = AUDIO_TYPES.has(mime) || /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name || "");

  if (!isVideo && !isImage && !isAudio) {
    return NextResponse.json(
      { error: "Use JPG/PNG/WebP/GIF, short MP4/WebM, or soundtrack MP3/WAV/OGG." },
      { status: 400 },
    );
  }

  const maxBytes = isVideo ? VIDEO_MAX : isAudio ? AUDIO_MAX : IMAGE_MAX;
  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        error: isVideo
          ? "Video is too large (max 25 MB). Compress or trim first."
          : isAudio
            ? "Audio is too large (max 15 MB)."
            : "Image is too large (max 5 MB).",
      },
      { status: 400 },
    );
  }

  const ext = isVideo
    ? mime === "video/webm"
      ? "webm"
      : mime === "video/quicktime"
        ? "mov"
        : "mp4"
    : isAudio
      ? mime.includes("wav")
        ? "wav"
        : mime.includes("ogg")
          ? "ogg"
          : mime.includes("aac") || mime.includes("mp4")
            ? "m4a"
            : "mp3"
      : mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : mime === "image/gif"
            ? "gif"
            : "jpg";

  const folder = designId && /^[0-9a-f-]{36}$/i.test(designId) ? designId : "misc";
  const path = `${user.id}/studio/${folder}/${crypto.randomUUID()}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  let uploadClient = supabase;
  try {
    const service = createServiceClient();
    if (service) uploadClient = service;
  } catch {
    /* fall back to user client */
  }

  const { error: upErr } = await uploadClient.storage.from("site-assets").upload(path, bytes, {
    contentType: mime || (isVideo ? "video/mp4" : isAudio ? "audio/mpeg" : "image/jpeg"),
    upsert: false,
  });

  if (upErr) {
    logCreate("studio.upload_failed", {
      userId: user.id,
      message: upErr.message,
      kind: isVideo ? "video" : isAudio ? "audio" : "image",
    });
    const m = upErr.message.toLowerCase();
    return NextResponse.json(
      {
        error: m.includes("bucket")
          ? "Media storage is not set up. Apply migration 023 (site-assets)."
          : upErr.message || "Upload failed.",
      },
      { status: 500 },
    );
  }

  const { data: pub } = uploadClient.storage.from("site-assets").getPublicUrl(path);
  const url = pub.publicUrl;
  if (!url) {
    return NextResponse.json({ error: "Upload succeeded but public URL missing." }, { status: 500 });
  }

  const kind = isVideo ? "video" : isAudio ? "audio" : "image";
  let uploadId: string | null = null;
  if (kind === "image" || kind === "video") {
    const { data: libraryRow } = await supabase
      .from("studio_uploads")
      .insert({
        owner_id: user.id,
        kind,
        url,
        storage_path: path,
        file_name: file.name?.slice(0, 200) || null,
        mime: mime || null,
        byte_size: file.size,
      })
      .select("id")
      .maybeSingle();
    uploadId = libraryRow?.id ?? null;
  }

  return NextResponse.json({
    url,
    path,
    kind,
    mime,
    uploadId,
  });
}
