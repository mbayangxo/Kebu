import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Upload logo/cover/gallery image for B2B profile (public site-assets bucket). */
export async function POST(req: Request, { params }: Params) {
  const { id: businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { data: membership } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || !["founder", "administrator", "store_manager"].includes(membership.role)) {
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
  const objectPath = `${user.id}/b2b/${businessId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage.from("site-assets").upload(objectPath, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (uploadErr) {
    return NextResponse.json(
      { error: uploadErr.message.includes("Bucket") ? "Apply migration 023 for uploads." : "Upload failed." },
      { status: 500 },
    );
  }

  const { data: publicUrl } = supabase.storage.from("site-assets").getPublicUrl(objectPath);
  return NextResponse.json({ url: publicUrl.publicUrl });
}
