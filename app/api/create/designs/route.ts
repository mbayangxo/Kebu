import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createDesignSchema } from "@/lib/create/create-designs";
import { defaultPosterCanvas } from "@/lib/create/create-designs";
import { recalculateReadinessForBusiness } from "@/lib/kebu-id/recalculate-hooks";

export const dynamic = "force-dynamic";

/** List current user's Kebu Create designs. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: designs, error } = await supabase
    .from("create_designs")
    .select("id, title, design_type, business_id, canvas, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Kebu Create table missing. Apply migration 022."
          : "Could not load designs.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ designs: designs ?? [] });
}

/** Create a new poster / flyer / social design. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = createDesignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const canvas = {
    ...defaultPosterCanvas(parsed.data.canvas?.businessName ?? "My business"),
    ...(parsed.data.canvas ?? {}),
  };

  const { data: design, error } = await supabase
    .from("create_designs")
    .insert({
      owner_id: user.id,
      business_id: parsed.data.businessId ?? null,
      design_type: parsed.data.designType,
      title: parsed.data.title,
      canvas,
    })
    .select("id, title, design_type, business_id, canvas, created_at, updated_at")
    .single();

  if (error || !design) {
    return NextResponse.json({ error: "Could not create design." }, { status: 500 });
  }

  await recalculateReadinessForBusiness(supabase, parsed.data.businessId);
  return NextResponse.json({ design });
}
