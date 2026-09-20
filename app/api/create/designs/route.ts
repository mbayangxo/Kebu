import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createDesignSchema } from "@/lib/create/create-designs";
import {
  canvasDocumentSchema,
  defaultCanvasDocument,
  parseCanvasDocument,
  type StudioDesignType,
} from "@/lib/studio/canvas-document";
import { recalculateReadinessForBusiness } from "@/lib/kebu-id/recalculate-hooks";
import { loadActiveWorkspaceScope } from "@/lib/account/server-workspace";

export const dynamic = "force-dynamic";

type DesignListRow = {
  id: string;
  title: string;
  design_type: string;
  business_id: string | null;
  owner_id: string;
  folder_id?: string | null;
  created_at: string;
  updated_at: string;
};

/** List Studio designs for the currently active Personal or Business Kebu space. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  let owned: DesignListRow[] | null = null;
  let ownedErr: { message?: string } | null = null;

  {
    let first = supabase
      .from("create_designs")
      .select("id, title, design_type, business_id, owner_id, folder_id, created_at, updated_at")
      .eq("owner_id", user.id);
    first = workspace.activeBusinessId
      ? first.eq("business_id", workspace.activeBusinessId)
      : first.is("business_id", null);

    const firstResult = await first.order("updated_at", { ascending: false });

    if (firstResult.error?.message?.includes("folder_id")) {
      let fallback = supabase
        .from("create_designs")
        .select("id, title, design_type, business_id, owner_id, created_at, updated_at")
        .eq("owner_id", user.id);
      fallback = workspace.activeBusinessId
        ? fallback.eq("business_id", workspace.activeBusinessId)
        : fallback.is("business_id", null);
      const fallbackResult = await fallback.order("updated_at", { ascending: false });
      owned = fallbackResult.data as DesignListRow[] | null;
      ownedErr = fallbackResult.error;
    } else {
      owned = firstResult.data as DesignListRow[] | null;
      ownedErr = firstResult.error;
    }
  }

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

  const sharedIds = (collabs ?? []).map((collaborator) => collaborator.design_id as string);
  let shared: DesignListRow[] = [];
  if (sharedIds.length) {
    let sharedQuery = supabase
      .from("create_designs")
      .select("id, title, design_type, business_id, owner_id, folder_id, created_at, updated_at")
      .in("id", sharedIds);
    sharedQuery = workspace.activeBusinessId
      ? sharedQuery.eq("business_id", workspace.activeBusinessId)
      : sharedQuery.is("business_id", null);

    const { data } = await sharedQuery.order("updated_at", { ascending: false });
    shared = (data ?? []) as DesignListRow[];
  }

  const roleByDesign = new Map((collabs ?? []).map((collaborator) => [
    collaborator.design_id as string,
    collaborator.role as string,
  ]));

  return NextResponse.json({
    context: workspace.mode,
    businessId: workspace.activeBusinessId,
    designs: (owned ?? []).map((design) => ({ ...design, accessRole: "owner" as const })),
    shared: shared.map((design) => ({
      ...design,
      accessRole: (roleByDesign.get(design.id) === "editor" ? "editor" : "viewer") as "editor" | "viewer",
    })),
  });
}

/** Create a design inside the currently active Personal or Business Kebu space. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

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

  if (
    parsed.data.businessId !== undefined &&
    parsed.data.businessId !== workspace.activeBusinessId
  ) {
    return NextResponse.json(
      { error: "Switch to that Business Kebu space before creating business creative work." },
      { status: 403 },
    );
  }

  const businessId = workspace.activeBusinessId;
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
      business_id: businessId,
      design_type: parsed.data.designType,
      title: parsed.data.title,
      canvas,
    })
    .select("id, title, design_type, business_id, canvas, created_at, updated_at")
    .single();

  if (error || !design) {
    return NextResponse.json({ error: "Could not create design." }, { status: 500 });
  }

  await recalculateReadinessForBusiness(supabase, businessId);
  return NextResponse.json({ design, context: workspace.mode });
}
