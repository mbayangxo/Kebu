import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; productId: string }> };

const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/epub+zip",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/flac",
  "video/mp4",
  "video/webm",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/octet-stream",
  "text/plain",
]);

/**
 * Upload a digital file for a product.
 * Stores in the private `digital-files` bucket at `{projectId}/{productId}/{filename}`.
 * Updates `is_digital`, `digital_file_path`, and `digital_file_name` on the product.
 */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, productId } = await params;

  // Confirm ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: product } = await supabase
    .from("project_products")
    .select("id")
    .eq("id", productId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Send multipart/form-data with a 'file' field." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not parse form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file field in form data." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 200 MB limit." }, { status: 413 });
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { error: `File type "${mime}" is not allowed. Use PDF, ZIP, EPUB, audio, video, or image.` },
      { status: 415 },
    );
  }

  // Use service client for storage (RLS on storage.objects is by bucket policy)
  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  // Sanitise filename
  const rawName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 100);
  const storagePath = `${projectId}/${productId}/${rawName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from("digital-files")
    .upload(storagePath, arrayBuffer, {
      contentType: mime,
      upsert: true,
    });

  if (uploadError) {
    const msg = uploadError.message ?? "";
    if (msg.includes("bucket not found") || msg.includes("Bucket not found")) {
      return NextResponse.json(
        { error: "Digital files storage bucket not set up. Apply migration 098 and create bucket 'digital-files' in Supabase Storage (set to private)." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 });
  }

  // Mark product as digital and save the path
  const { error: updateError } = await supabase
    .from("project_products")
    .update({
      is_digital: true,
      digital_file_path: storagePath,
      digital_file_name: rawName,
    })
    .eq("id", productId);

  if (updateError) {
    return NextResponse.json({ error: "File uploaded but product update failed.", detail: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path: storagePath, name: rawName });
}

/** Remove the digital file and reset the product to physical. */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, productId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { data: product } = await supabase
    .from("project_products")
    .select("id, digital_file_path")
    .eq("id", productId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  // Remove from storage (best-effort)
  if (product.digital_file_path) {
    const admin = createServiceClient();
    if (admin) {
      await admin.storage.from("digital-files").remove([product.digital_file_path as string]);
    }
  }

  await supabase
    .from("project_products")
    .update({ is_digital: false, digital_file_path: null, digital_file_name: null })
    .eq("id", productId);

  return NextResponse.json({ ok: true });
}
