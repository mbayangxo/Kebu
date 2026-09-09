import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createHelpRequest, helpRequestCreateSchema } from "@/lib/platform/help-requests";
import { shopOrderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/** Public help / contact request → help_requests (Kebu Record counts). */
export async function POST(req: Request) {
  const limited = shopOrderRateLimit(req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = helpRequestCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill name, email, subject, and message." }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  let userId: string | null = null;
  try {
    const browser = await createServerSupabase();
    const {
      data: { user },
    } = await browser.auth.getUser();
    if (user?.id) userId = user.id;
  } catch {
    /* guest OK */
  }

  const created = await createHelpRequest(admin, parsed.data, userId);
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    id: created.id,
    message: "Request received. The Kebu team will follow up by email.",
  });
}
