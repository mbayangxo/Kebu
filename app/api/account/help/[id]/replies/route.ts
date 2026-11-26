import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { shopOrderRateLimit } from "@/lib/api-guard";
import { createCustomerHelpReply, helpReplyCreateSchema } from "@/lib/platform/help-requests";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Customer reply on their own help request. Uses the RLS-scoped (not service-role) client — the DB itself refuses any attempt to reply on someone else's request or as 'team'. */
export async function POST(req: Request, { params }: Params) {
  const limited = shopOrderRateLimit(req);
  if (limited) return limited;
  const csrf = assertSameOriginMutation(req);
  if (csrf) return csrf;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = helpReplyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Write a message before sending." }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data: profile } = admin
    ? await admin.from("user_profiles").select("name").eq("id", user.id).maybeSingle()
    : { data: null };

  const result = await createCustomerHelpReply(supabase, {
    helpRequestId: id,
    authorName: profile?.name || "You",
    authorUserId: user.id,
    body: parsed.data.body,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, reply: result.reply });
}
