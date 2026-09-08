import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  SITE_ASSET_SPECS,
  guessContentType,
  isHeicLike,
  type SiteAssetKind,
} from "@/lib/create/site-asset-upload";
import { kebuTransferHeaders, maxUploadBytesForMode, parseDataModeHeader } from "@/lib/create/kb-budget";
import {
  assertProjectEditorAccess,
  dbForProjectAccess,
} from "@/lib/create/project-access";
import { createServiceClient } from "@/lib/opportunity/admin";

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
  if (ext === "heic" || ext === "heif") return "jpg";
  return IMAGE_EXT.has(ext) ? (ext === "jpeg" ? "jpg" : ext) : "jpg";
}

function friendlyUploadError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("bucket not found")) {
    return "Photo storage is not set up yet. Apply Supabase migrations 023, 029, and 034.";
  }
  if (m.includes("mime type") || m.includes("not supported")) {
    return "That file type is not allowed. Use JPG, PNG, or WebP (not HEIC).";
  }
  if (m.includes("row-level security") || m.includes("rls") || m.includes("policy")) {
    return "Upload blocked by storage permissions. Sign out and back in, then try again.";
  }
  if (m.includes("payload") || m.includes("too large") || m.includes("size")) {
    return "File is too large for upload.";
  }
  return message?.trim() || "Upload failed.";
}

/** Upload site media (images, audio, video) to public storage. */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const access = await assertProjectEditorAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "asset.upload",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const db = dbForProjectAccess(supabase, access.via);
  const ownerId = access.project.owner_id;

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
  const dataMode = parseDataModeHeader(req);
  const maxBytes = maxUploadBytesForMode(kind as SiteAssetKind, dataMode);
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }

  if (file.size > maxBytes) {
    const mb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
    return NextResponse.json(
      {
        error:
          dataMode === "normal"
            ? `File is too large. Max ${Math.round(spec.maxBytes / (1024 * 1024))} MB for ${spec.label}.`
            : `Data Saver limit: keep ${spec.label} under ${mb < 1 ? `${Math.round(maxBytes / 1024)} KB` : `${mb} MB`}. Compress the image or switch to Normal mode.`,
        budgetKb: Math.round(maxBytes / 1024),
        dataMode,
      },
      { status: 400 },
    );
  }

  if (kind !== "audio" && kind !== "video" && isHeicLike(file)) {
    return NextResponse.json(
      {
        error:
          "iPhone HEIC photos are not supported yet. In Photos → share → “Most Compatible” / export as JPEG, then upload.",
      },
      { status: 400 },
    );
  }

  const safeExt = safeExtForKind(kind as SiteAssetKind, file.name);
  // Prefer the signed-in user folder so storage RLS matches; owners are always user.id.
  const folderUserId = access.via === "owner" ? user.id : ownerId;
  const objectPath = `${folderUserId}/${projectId}/${kind}-${Date.now()}.${safeExt}`;
  const contentType = guessContentType(file);

  if (contentType === "application/octet-stream") {
    return NextResponse.json(
      { error: "Could not detect file type. Use a JPG, PNG, or WebP image." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Service role bypasses storage RLS after we already authorized the editor.
  const storageClient = createServiceClient() ?? db;
  const { error: uploadErr } = await storageClient.storage.from("site-assets").upload(objectPath, buffer, {
    contentType,
    upsert: false,
  });

  if (uploadErr) {
    return NextResponse.json(
      {
        error: friendlyUploadError(uploadErr.message),
        detail: uploadErr.message,
      },
      { status: 500 },
    );
  }

  const { data: publicUrl } = storageClient.storage.from("site-assets").getPublicUrl(objectPath);

  const { error: metaErr } = await db.from("website_assets").insert({
    project_id: projectId,
    kind: spec.storageKind,
    url: publicUrl.publicUrl,
    created_by: user.id,
  });
  if (metaErr) {
    logCreate("website.asset_meta_failed", {
      userId: user.id,
      projectId,
      detail: metaErr.message,
    });
  }

  logCreate("website.asset_uploaded", {
    userId: user.id,
    projectId,
    kind,
    storageKind: spec.storageKind,
    via: access.via,
    dataMode,
    bytes: file.size,
  });

  const headers = kebuTransferHeaders(file.size, "upload_image", dataMode);
  return NextResponse.json(
    {
      url: publicUrl.publicUrl,
      path: objectPath,
      kind,
      storageKind: spec.storageKind,
      transferKb: headers["X-Kebu-Transfer-Kb"],
      budgetKb: headers["X-Kebu-Budget-Kb"],
      withinBudget: headers["X-Kebu-Within-Budget"] === "1",
      dataMode,
    },
    { headers },
  );
}
