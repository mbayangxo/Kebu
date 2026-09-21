import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const q = new URL(req.url).searchParams.get("q")?.trim().toUpperCase() ?? "";
  if (!/^KBU-P-[A-F0-9]{10}$/.test(q)) {
    return NextResponse.json({ person: null });
  }

  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "People lookup is unavailable." }, { status: 503 });

  const { data, error } = await admin
    .from("user_profiles")
    .select("id, name, avatar_url, public_kebu_id")
    .eq("public_kebu_id", q)
    .neq("id", auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not search People." }, { status: 500 });
  return NextResponse.json({ person: data ?? null });
}
