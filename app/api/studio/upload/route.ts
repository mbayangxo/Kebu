import { NextResponse } from "next/server";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";
import { resolveStudioDesignAccess } from "@/lib/studio/design-access";
import { loadActiveWorkspaceScope } from "@/lib/account/server-workspace";
import { z } from "zod";
import { sniffStudioMedia } from "@/lib/studio/media-signature";

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
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

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

  const workspace = await loadActiveWorkspaceScope(supabase, user.id);
  const designId = String(form.get("designId") ?? "").trim();
  if (designId && !z.string().uuid().safeParse(designId).success) {
    return NextResponse.json({ error: "Invalid design id." }, { status: 400 });
  }
  let uploadBusinessId = workspace.activeBusinessId;

  if (designId && /^[0-9a-f-]{36}$/i.test(designId)) {
    const access = await resolveStudioDesignAccess(supabase, { designId, userId: user.id });
    if (!access?.canEdit) {
      return NextResponse.json({ error: "Design not found or view-only." }, { status: 404 });
    }
    const { data: designScope } = await supabase
      .from("create_designs")
      .select("business_id")
      .eq("id", designId)
      .maybeSingle();
    if (!designScope) {
      return NextResponse.json({ error: "Design not found." }, { status: 404 });
    }
    const designBusinessId = designScope.business_id ?? null;
    if (designBusinessId !== workspace.activeBusinessId) {
      return NextResponse.json(
        { error: "Switch to the Kebu space that owns this design before uploading media." },
        { status: 409 },
      );
    }
    uploadBusinessId = designBusinessId;
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

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = sniffStudioMedia(bytes, mime);
  if (!detected ||
      (isImage && !detected.startsWith("image/")) ||
      (isVideo && !detected.startsWith("video/")) ||
      (isAudio && !detected.startsWith("audio/"))) {
    return NextResponse.json({ error: "File contents do not match a supported media format." }, { status: 400 });
  }
  const mediaExtensions: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "video/mp4": mime === "video/quicktime" ? "mov" : "mp4", "video/webm": "webm",
    "audio/mpeg": "mp3", "audio/wav": "wav", "audio/ogg": "ogg", "audio/mp4": "m4a",
    "audio/aac": "aac", "audio/webm": "webm",
  };
  const ext = mediaExtensions[detected];
  if (!ext) return NextResponse.json({ error: "Unsupported media format." }, { status: 400 });
  const folder = designId || "misc";
  const path = `${user.id}/studio/${folder}/${crypto.randomUUID()}.${ext}`;
  let uploadClient = supabase;
  try {
    const service = createServiceClient();
    if (service) uploadClient = service;
  } catch {
    /* fall back to user client */
  }

  const { error: upErr } = await uploadClient.storage.from("site-assets").upload(path, bytes, {
    contentType: detected,
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

  const removeUnregisteredAsset = async () => {
    const { error } = await uploadClient.storage.from("site-assets").remove([path]);
    if (error) logCreate("studio.upload_cleanup_failed", { userId: user.id, path });
  };

  const { data: pub } = uploadClient.storage.from("site-assets").getPublicUrl(path);
  const url = pub.publicUrl;
  if (!url) {
    await removeUnregisteredAsset();
    return NextResponse.json({ error: "Upload succeeded but public URL missing." }, { status: 500 });
  }

  const kind = isVideo ? "video" : isAudio ? "audio" : "image";
  let uploadId: string | null = null;
  if (kind === "image" || kind === "video" || kind === "audio") {
    const { data: libraryRow, error: libraryError } = await supabase
      .from("studio_uploads")
      .insert({
        owner_id: user.id,
        kind,
        url,
        storage_path: path,
        file_name: file.name?.slice(0, 200) || null,
        mime: detected,
        byte_size: file.size,
        business_id: uploadBusinessId,
      })
      .select("id")
      .maybeSingle();
    if (libraryError || !libraryRow?.id) {
      await removeUnregisteredAsset();
      return NextResponse.json({ error: "Could not add this file to your uploads library. Please try again." }, { status: 503 });
    }
    uploadId = libraryRow.id;
  }

  return NextResponse.json({
    url,
    path,
    kind,
    mime: detected,
    uploadId,
  });
}
