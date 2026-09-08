import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2_000_000;
const MAX_PHOTOS = 8;

/**
 * A4 — upload draft photos before a project exists (Create from photos).
 * Stored under site-assets/{userId}/create-photos/.
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
    return NextResponse.json({ error: "Expected multipart form." }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const single = form.get("file");
  if (files.length === 0 && single instanceof File && single.size > 0) {
    files.push(single);
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "Choose at least one photo." }, { status: 400 });
  }
  if (files.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Upload up to ${MAX_PHOTOS} photos.` }, { status: 400 });
  }

  const storage = createServiceClient() ?? supabase;
  const urls: string[] = [];

  for (const file of files) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Each photo must be under 2 MB (Data Saver friendly)." },
        { status: 400 },
      );
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Upload JPG, PNG, or WebP photos only." }, { status: 400 });
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const objectPath = `${user.id}/create-photos/${Date.now()}-${urls.length}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await storage.storage.from("site-assets").upload(objectPath, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (uploadErr) {
      return NextResponse.json(
        {
          error: uploadErr.message.includes("Bucket")
            ? "Apply migration 023 for uploads."
            : "Photo upload failed.",
        },
        { status: 500 },
      );
    }
    const { data: publicUrl } = storage.storage.from("site-assets").getPublicUrl(objectPath);
    urls.push(publicUrl.publicUrl);
  }

  return NextResponse.json({ photoUrls: urls });
}
