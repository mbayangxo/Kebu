import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

/** Upload personal account avatar (site-assets bucket). */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

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
  if (file.size > 2_000_000) {
    return NextResponse.json({ error: "Image too large (max 2 MB)." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Upload a photo (JPG, PNG, or WebP)." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const objectPath = `${user.id}/avatar/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage.from("site-assets").upload(objectPath, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });

  if (uploadErr) {
    return NextResponse.json(
      { error: uploadErr.message.includes("Bucket") ? "Apply migration 023 for uploads." : "Upload failed." },
      { status: 500 },
    );
  }

  const { data: publicUrl } = supabase.storage.from("site-assets").getPublicUrl(objectPath);
  const avatarUrl = publicUrl.publicUrl;

  const { error: updateErr } = await supabase
    .from("user_profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (updateErr) {
    return NextResponse.json(
      { error: updateErr.message.includes("avatar_url") ? "Apply migration 025." : "Could not save avatar." },
      { status: 500 },
    );
  }

  return NextResponse.json({ avatarUrl });
}
