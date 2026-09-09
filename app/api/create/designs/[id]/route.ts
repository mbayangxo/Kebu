import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createDesignSchema } from "@/lib/create/create-designs";
import { canvasDocumentSchema } from "@/lib/studio/canvas-document";
import { resolveStudioDesignAccess } from "@/lib/studio/design-access";
import { recalculateReadinessForBusiness } from "@/lib/kebu-id/recalculate-hooks";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: createDesignSchema.shape.title.optional(),
  canvas: z.union([canvasDocumentSchema, z.record(z.string(), z.unknown())]).optional(),
  businessId: z.string().uuid().nullable().optional(),
  designType: createDesignSchema.shape.designType.optional(),
  /** Owner-only: move design into a folder, or null to unfile. */
  folderId: z.string().uuid().nullable().optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await resolveStudioDesignAccess(supabase, { designId: id, userId: user.id });
  if (!access) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  const { data: design, error } = await supabase
    .from("create_designs")
    .select("id, title, design_type, business_id, folder_id, canvas, owner_id, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !design) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  return NextResponse.json({ design, access, userId: user.id });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await resolveStudioDesignAccess(supabase, { designId: id, userId: user.id });
  if (!access) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }
  if (!access.canEdit) {
    return NextResponse.json({ error: "View-only access. Ask the owner for edit permission." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("create_designs")
    .select("id, canvas, business_id, design_type, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.title) patch.title = parsed.data.title;
  if (parsed.data.designType) patch.design_type = parsed.data.designType;
  if (parsed.data.businessId !== undefined && access.role === "owner") {
    patch.business_id = parsed.data.businessId;
  }
  if (parsed.data.folderId !== undefined) {
    if (access.role !== "owner") {
      return NextResponse.json({ error: "Only the owner can move designs between folders." }, { status: 403 });
    }
    if (parsed.data.folderId) {
      const { data: folder } = await supabase
        .from("studio_folders")
        .select("id")
        .eq("id", parsed.data.folderId)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!folder) {
        return NextResponse.json({ error: "Folder not found." }, { status: 404 });
      }
    }
    patch.folder_id = parsed.data.folderId;
  }
  if (parsed.data.canvas) {
    const { parseCanvasDocument } = await import("@/lib/studio/canvas-document");
    const { maybeAutoCheckpointPreviousCanvas } = await import("@/lib/studio/design-version-store");
    await maybeAutoCheckpointPreviousCanvas(supabase, {
      designId: id,
      userId: user.id,
      previousCanvas: existing.canvas,
    });
    patch.canvas = parseCanvasDocument(
      parsed.data.canvas,
      (parsed.data.designType as import("@/lib/studio/canvas-document").StudioDesignType | undefined) ??
        (existing.design_type as import("@/lib/studio/canvas-document").StudioDesignType) ??
        "poster",
    );
  }

  const { data: design, error } = await supabase
    .from("create_designs")
    .update(patch)
    .eq("id", id)
    .select("id, title, design_type, business_id, folder_id, canvas, owner_id, created_at, updated_at")
    .single();

  if (error || !design) {
    const missingFolder = error?.message?.includes("folder_id");
    return NextResponse.json(
      {
        error: missingFolder
          ? "Studio folders not applied yet. Apply migration 077."
          : "Could not save design.",
      },
      { status: missingFolder ? 503 : 500 },
    );
  }

  const businessId = (parsed.data.businessId ?? existing.business_id) as string | null;
  await recalculateReadinessForBusiness(supabase, businessId);
  return NextResponse.json({ design, access });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await resolveStudioDesignAccess(supabase, { designId: id, userId: user.id });
  if (!access?.canDelete) {
    return NextResponse.json({ error: "Only the owner can delete this design." }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("create_designs")
    .select("business_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  await supabase.from("create_designs").delete().eq("id", id).eq("owner_id", user.id);
  await recalculateReadinessForBusiness(supabase, existing.business_id);
  return NextResponse.json({ ok: true });
}
