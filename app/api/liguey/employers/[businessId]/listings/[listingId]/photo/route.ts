import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { assertEmployerManager } from "@/lib/liguey/assert-employer-manager";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ businessId: string; listingId: string }> };

/** Upload a listing photo — mirrors app/api/businesses/[id]/logo/route.ts's real Storage upload. */
export async function POST(req: Request, { params }: Params) {
  const { businessId, listingId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!(await assertEmployerManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose an image." }, { status: 400 });
  }
  if (file.size > 3_000_000) {
    return NextResponse.json({ error: "Image too large (max 3 MB)." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const objectPath = `${user.id}/liguey/listing/${listingId}/photo-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage.from("site-assets").upload(objectPath, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message.includes("Bucket") ? "Storage bucket not configured." : "Upload failed." }, { status: 500 });
  }

  const { data: publicUrl } = supabase.storage.from("site-assets").getPublicUrl(objectPath);
  const photoUrl = publicUrl.publicUrl;

  const { error: updateErr } = await supabase
    .from("job_listings")
    .update({ photo_url: photoUrl })
    .eq("id", listingId)
    .eq("business_id", businessId);
  if (updateErr) return NextResponse.json({ error: "Could not save the photo." }, { status: 500 });

  return NextResponse.json({ photoUrl });
}
