import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { validPreviewToken } from "@/lib/generation/preview-token";
import type { GenerationRun } from "@/lib/generation/contracts";
export const dynamic = "force-dynamic";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Preview unavailable." }, { status: 404 });
  const token = req.headers.get("x-generation-preview");
  let run: GenerationRun | null = null;
  if (token) {
    const admin = createServiceClient(); if (!admin) return NextResponse.json({ error: "Preview unavailable." }, { status: 503 });
    const result = await admin.from("creative_generation_runs").select("*").eq("id", id).maybeSingle();
    if (!result.error && result.data && validPreviewToken(result.data as GenerationRun, token)) {
      const access = await admin.rpc("claim_creative_generation_access", { p_id: id });
      if (!access.error && access.data === true) run = result.data as GenerationRun;
    }
  } else {
    const auth = await requireUser(); if ("error" in auth) return auth.error;
    const result = await auth.supabase.from("creative_generation_runs").select("*").eq("id", id).eq("actor_id", auth.user.id).maybeSingle();
    if (!result.error) run = result.data as GenerationRun | null;
  }
  if (!run?.data.candidate || run.state === "cancelled") return NextResponse.json({ error: "Preview unavailable." }, { status: 404 });
  return NextResponse.json({ kind: run.target_kind, document: (run.data.candidate as { document: unknown }).document }, { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie, x-generation-preview" } });
}
