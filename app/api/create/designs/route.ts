import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createDesignSchema } from "@/lib/create/create-designs";
import { defaultCanvasDocument, parseCanvasDocument, type StudioDesignType } from "@/lib/studio/canvas-document";
import { canvasDocumentSchema } from "@/lib/studio/canvas-document";
import { recalculateReadinessForBusiness } from "@/lib/kebu-id/recalculate-hooks";

export const dynamic = "force-dynamic";

/** List owned + shared Studio designs. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: owned, error: ownedErr } = await supabase
    .from("create_designs")
    .select("id, title, design_type, business_id, owner_id, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (ownedErr) {
    return NextResponse.json(
      {
        error: ownedErr.message?.includes("does not exist")
          ? "Kebu Create table missing. Apply migration 022."
          : "Could not load designs.",
      },
      { status: 500 },
    );
  }

  const { data: collabs } = await supabase
    .from("studio_design_collaborators")
    .select("design_id, role")
    .eq("user_id", user.id)
    .eq("status", "active");

  const sharedIds = (collabs ?? []).map((c) => c.design_id as string);
  let shared: typeof owned = [];
  if (sharedIds.length) {
    const { data } = await supabase
      .from("create_designs")
      .select("id, title, design_type, business_id, owner_id, created_at, updated_at")
      .in("id", sharedIds)
      .order("updated_at", { ascending: false });
    shared = data ?? [];
  }

  const roleByDesign = new Map((collabs ?? []).map((c) => [c.design_id as string, c.role as string]));

  return NextResponse.json({
    designs: (owned ?? []).map((d) => ({ ...d, accessRole: "owner" as const })),
    shared: (shared ?? []).map((d) => ({
      ...d,
      accessRole: (roleByDesign.get(d.id) === "editor" ? "editor" : "viewer") as "editor" | "viewer",
    })),
  });
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

  const designType = (parsed.data.designType ?? "poster") as StudioDesignType;
  const canvas = parsed.data.canvas
    ? canvasDocumentSchema.safeParse(parsed.data.canvas).success
      ? parsed.data.canvas
      : parseCanvasDocument(parsed.data.canvas, designType)
    : defaultCanvasDocument(designType, {
        businessName: (parsed.data.canvas as { businessName?: string } | undefined)?.businessName,
      });

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
