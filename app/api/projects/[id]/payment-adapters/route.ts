import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { shopPaymentAdapterStatus } from "@/lib/payments/registry";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Owner-only: which live PSPs are configured on the server (no secrets). */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ adapters: shopPaymentAdapterStatus() });
}
