import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertBusinessManager } from "@/lib/business/assert-manager";
import {
  createBusinessInvite,
  inviteRoleLabel,
  INVITE_ROLES,
  isInviteRole,
  listBusinessInvites,
  revokeBusinessInvite,
} from "@/lib/business/team-invites";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: businessId } = await params;

  if (!(await assertBusinessManager(supabase, businessId, user.id))) {
    // founders/admins only for list — also allow any active member to see roster without tokens
    const { data: mem } = await supabase
      .from("business_members")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!mem) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
  }

  const { data: members } = await supabase
    .from("business_members")
    .select("id, user_id, role, status, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  const invites = await listBusinessInvites(supabase, businessId);

  return NextResponse.json({
    members: members ?? [],
    invites: (invites.invites ?? []).map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      roleLabel: inviteRoleLabel(i.role),
      status: i.status,
      message: i.message,
      expiresAt: i.expires_at,
      acceptedAt: i.accepted_at,
      createdAt: i.created_at,
      // token only for managers who can invite
      acceptPath: `/invite/${i.token}`,
    })),
    roles: INVITE_ROLES.map((r) => ({ id: r, label: inviteRoleLabel(r) })),
    warning: invites.error,
  });
}

export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: businessId } = await params;

  if (!(await assertBusinessManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Only founders/admins/managers can invite." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = typeof rec.email === "string" ? rec.email : "";
  const role = typeof rec.role === "string" ? rec.role : "";
  const message = typeof rec.message === "string" ? rec.message : "";

  if (!isInviteRole(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const result = await createBusinessInvite(supabase, {
    businessId,
    email,
    role,
    invitedBy: user.id,
    message,
    businessName: business.name || "Kebu business",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  logCreate("business.team_invite", {
    userId: user.id,
    businessId,
    inviteId: result.inviteId,
    role,
    emailed: result.emailed,
  });

  return NextResponse.json({
    ok: true,
    inviteId: result.inviteId,
    acceptUrl: result.acceptUrl,
    emailed: result.emailed,
    hint: result.emailed
      ? "Invite email sent."
      : "Invite created. Copy the link — Resend is not configured for email.",
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: businessId } = await params;

  if (!(await assertBusinessManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const inviteId = typeof rec.inviteId === "string" ? rec.inviteId : "";
  const action = typeof rec.action === "string" ? rec.action : "";

  if (action !== "revoke" || !/^[0-9a-f-]{36}$/i.test(inviteId)) {
    return NextResponse.json({ error: "Invalid revoke request." }, { status: 400 });
  }

  const result = await revokeBusinessInvite(supabase, { businessId, inviteId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
