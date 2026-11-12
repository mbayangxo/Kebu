import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertAdminCookie } from "@/lib/admin/assert-admin-cookie";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Full reply thread for one help request, for the admin panel. */
export async function GET(req: Request, { params }: Params) {
  if (!(await assertAdminCookie(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Service client not configured." }, { status: 503 });

  const { data, error } = await admin
    .from("help_request_replies")
    .select("id, author_type, author_name, body, created_at")
    .eq("help_request_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("help_request_replies") ? "Apply migration 20261103150000_help_request_replies.sql." : error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ replies: data ?? [] });
}
