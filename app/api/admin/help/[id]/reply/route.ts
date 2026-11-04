import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertAdminCookie, assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { createTeamHelpReply, helpReplyCreateSchema } from "@/lib/platform/help-requests";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Team reply from Kebu Record — writes the thread row and sends a real email to the requester's authoritative Kebu account email when one is known. */
export async function POST(req: Request, { params }: Params) {
  if (!(await assertAdminCookie(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const csrf = assertSameOriginMutation(req);
  if (csrf) return csrf;

  const { id } = await params;
  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Service client not configured." }, { status: 503 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = helpReplyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Write a reply before sending." }, { status: 400 });
  }
  const rec = body as Record<string, unknown>;
  const repliedBy = typeof rec.repliedBy === "string" ? rec.repliedBy.slice(0, 120) : "Kebu team";

  const { data: request } = await admin
    .from("help_requests")
    .select("id, subject, email, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!request) {
    return NextResponse.json({ error: "Help request not found." }, { status: 404 });
  }

  // Prefer the account's real, authoritative email over whatever the requester
  // typed on the form — they can differ, and the account email is the one
  // that's actually theirs.
  let recipientEmail = request.email as string;
  if (request.user_id) {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("email")
      .eq("id", request.user_id as string)
      .maybeSingle();
    if (profile?.email) recipientEmail = profile.email;
  }

  const result = await createTeamHelpReply(admin, {
    helpRequestId: id,
    authorName: repliedBy,
    body: parsed.data.body,
    recipientEmail,
    requestSubject: request.subject as string,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // A team reply implicitly moves an open request into progress, same as
  // the existing status-flip endpoint, so it doesn't sit under "open" after
  // someone has actually answered it.
  await admin
    .from("help_requests")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "open");

  return NextResponse.json({ ok: true, reply: result.reply, emailSent: result.emailSent, recipientEmail });
}
