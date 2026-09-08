import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { resolveStudioDesignAccess } from "@/lib/studio/design-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const inviteSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["editor", "viewer"]).default("editor"),
});

/** List collaborators (owner) or own membership (collaborator). */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await resolveStudioDesignAccess(supabase, { designId: id, userId: user.id });
  if (!access) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }

  if (access.role === "owner") {
    const { data, error } = await supabase
      .from("studio_design_collaborators")
      .select("id, email, role, status, user_id, created_at")
      .eq("design_id", id)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          error: error.message?.includes("does not exist")
            ? "Collaborators table missing. Apply migration 071."
            : "Could not load collaborators.",
        },
        { status: error.message?.includes("does not exist") ? 503 : 500 },
      );
    }
    return NextResponse.json({ access, collaborators: data ?? [] });
  }

  return NextResponse.json({
    access,
    collaborators: [],
  });
}

/** Invite an existing Kebu user by email (owner only). */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await resolveStudioDesignAccess(supabase, { designId: id, userId: user.id });
  if (!access?.canShare) {
    return NextResponse.json({ error: "Only the owner can invite collaborators." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email and role (editor|viewer) required." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  if (user.email && email === user.email.toLowerCase()) {
    return NextResponse.json({ error: "You already own this design." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (!profile?.id) {
    return NextResponse.json(
      {
        error:
          "No Kebu account with that email yet. They need to sign up first, then you can invite them.",
      },
      { status: 404 },
    );
  }

  if (profile.id === user.id) {
    return NextResponse.json({ error: "You already own this design." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("studio_design_collaborators")
    .select("id, status")
    .eq("design_id", id)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing?.status === "active") {
    return NextResponse.json({ error: "Already a collaborator." }, { status: 409 });
  }

  if (existing) {
    const { data: revived, error } = await supabase
      .from("studio_design_collaborators")
      .update({
        status: "active",
        role: parsed.data.role,
        email,
        invited_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id, email, role, status, user_id, created_at")
      .single();
    if (error || !revived) {
      return NextResponse.json({ error: "Could not restore collaborator." }, { status: 500 });
    }
    return NextResponse.json({ collaborator: revived });
  }

  const { data: collab, error } = await supabase
    .from("studio_design_collaborators")
    .insert({
      design_id: id,
      user_id: profile.id,
      email,
      role: parsed.data.role,
      status: "active",
      invited_by: user.id,
    })
    .select("id, email, role, status, user_id, created_at")
    .single();

  if (error || !collab) {
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "Collaborators table missing. Apply migration 071."
          : error?.message ?? "Could not invite.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ collaborator: collab });
}
