import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { kebuSetupSchema, parseKebuSetup } from "@/lib/account/kebu-setup";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("kebu_setup")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("kebu_setup") ? "Apply Kebu ecosystem setup migration." : "Could not load Kebu setup." },
      { status: 500 },
    );
  }

  return NextResponse.json({ setup: parseKebuSetup(data?.kebu_setup) });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = kebuSetupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Kebu setup.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .update({ kebu_setup: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("kebu_setup")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("kebu_setup") ? "Apply Kebu ecosystem setup migration." : "Could not save Kebu setup." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, setup: parseKebuSetup(data.kebu_setup) });
}
