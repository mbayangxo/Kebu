import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { acceptBusinessInvite } from "@/lib/business/team-invites";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

/** Public invite preview (no secrets beyond email/role/business name). */
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  if (!token || token.length < 20) {
    return NextResponse.json({ error: "Invalid invite." }, { status: 400 });
  }
  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: invite } = await admin
    .from("business_invites")
    .select("email, role, status, expires_at, business_id")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  const { data: business } = await admin
    .from("businesses")
    .select("id, name, public_kebu_id")
    .eq("id", invite.business_id)
    .maybeSingle();

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expires_at,
    businessName: business?.name ?? "Business",
    kebuId: business?.public_kebu_id ?? null,
  });
}

/** Accept invite — must be signed in as the invited email. */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { token } = await params;

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const email = typeof user.email === "string" ? user.email : "";
  if (!email) {
    return NextResponse.json({ error: "Your account needs an email." }, { status: 400 });
  }

  const result = await acceptBusinessInvite(auth.supabase, admin, {
    token,
    userId: user.id,
    userEmail: email,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 },
    );
  }

  logCreate("business.team_invite_accepted", {
    userId: user.id,
    businessId: result.businessId,
    role: result.role,
  });

  return NextResponse.json({
    ok: true,
    businessId: result.businessId,
    role: result.role,
    redirectTo: `/business/${result.businessId}`,
  });
}
