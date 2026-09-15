import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";

export const dynamic = "force-dynamic";

const MAX_BYTES = 52_428_800; // 50 MB
const BUCKET = "developer-assets";

const ALLOWED_TYPES: Record<string, string> = {
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  // Fonts
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
  // Documents / templates
  pdf: "application/pdf",
  // Archives
  zip: "application/zip",
};

function guessType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_TYPES[ext] ?? "application/octet-stream";
}

function assetCategory(contentType: string): string {
  if (contentType.startsWith("image/")) return "Images";
  if (contentType.startsWith("font/")) return "Fonts";
  if (contentType === "application/pdf") return "Templates";
  return "Icons";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const svc = createServiceClient();
  if (!svc) {
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  }

  const { data, error } = await svc.storage.from(BUCKET).list(user.id, {
    limit: 200,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message.includes("Bucket not found")
            ? "developer-assets bucket not found — apply migration in Supabase."
            : "Could not list assets.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  const assets = (data ?? [])
    .filter((f) => f.name !== ".emptyFolderPlaceholder")
    .map((f) => {
      const ct = f.metadata?.mimetype ?? guessType(f.name);
      const { data: urlData } = svc.storage.from(BUCKET).getPublicUrl(`${user.id}/${f.name}`);
      return {
        id: f.id ?? f.name,
        name: f.name,
        type: assetCategory(ct),
        size: formatSize(f.metadata?.size ?? 0),
        url: urlData.publicUrl,
        uploadedAt: f.created_at
          ? new Date(f.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
          : "",
      };
    });

  return NextResponse.json({ assets });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const svc = createServiceClient();
  if (!svc) {
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 413 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_TYPES[ext]) {
    return NextResponse.json(
      { error: `File type .${ext} is not allowed. Allowed: images, fonts, PDF, zip.` },
      { status: 415 }
    );
  }

  const contentType = guessType(file.name);
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const objectPath = `${user.id}/${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await svc.storage
    .from(BUCKET)
    .upload(objectPath, buffer, { contentType, upsert: false });

  if (uploadErr) {
    const m = uploadErr.message.toLowerCase();
    let msg = "Upload failed.";
    if (m.includes("bucket not found")) msg = "developer-assets bucket not configured.";
    else if (m.includes("row-level security") || m.includes("policy")) msg = "Storage permission error.";
    else if (m.includes("size") || m.includes("too large")) msg = "File too large.";
    return NextResponse.json({ error: msg, detail: uploadErr.message }, { status: 500 });
  }

  const { data: urlData } = svc.storage.from(BUCKET).getPublicUrl(objectPath);

  return NextResponse.json(
    {
      asset: {
        name: safeName,
        type: assetCategory(contentType),
        size: formatSize(file.size),
        url: urlData.publicUrl,
        uploadedAt: new Date().toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }),
      },
    },
    { status: 201 }
  );
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  if (!name) return NextResponse.json({ error: "name required." }, { status: 400 });

  const svc = createServiceClient();
  if (!svc) return NextResponse.json({ error: "Storage not configured." }, { status: 503 });

  const objectPath = `${user.id}/${name}`;
  const { error } = await svc.storage.from(BUCKET).remove([objectPath]);
  if (error) {
    return NextResponse.json({ error: "Could not delete asset.", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
