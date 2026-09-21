import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

const provider = z.enum(["instagram","tiktok","youtube","whatsapp","maps","analytics","custom"]);
const connectionSchema = z.object({
  provider,
  label: z.string().trim().max(80).default(""),
  status: z.enum(["configured","needs_auth","connected","disabled","error"]).default("configured"),
  publicConfig: z.record(z.string(), z.union([z.string().max(1000), z.number(), z.boolean(), z.null()])).default({}),
});

async function ownedProject(supabase: any, userId: string, projectId: string) {
  const { data } = await supabase.from("projects").select("id").eq("id", projectId).eq("owner_id", userId).maybeSingle();
  return Boolean(data);
}

export async function GET(req: Request, { params }: Params) {
  const limited = builderRateLimit(req); if (limited) return limited;
  const auth = await requireUser(); if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!(await ownedProject(auth.supabase, auth.user.id, id))) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { data, error } = await auth.supabase.from("site_connections").select("id,provider,label,status,public_config,updated_at").eq("project_id", id).eq("owner_id", auth.user.id).order("provider");
  if (error) return NextResponse.json({ error: "Could not load connections." }, { status: 500 });
  return NextResponse.json({ connections: data ?? [] });
}

export async function PUT(req: Request, { params }: Params) {
  const limited = builderRateLimit(req); if (limited) return limited;
  const auth = await requireUser(); if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!(await ownedProject(auth.supabase, auth.user.id, id))) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = connectionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid connection.", issues: parsed.error.flatten() }, { status: 400 });
  const { data, error } = await auth.supabase.from("site_connections").upsert({
    project_id:id, owner_id:auth.user.id, provider:parsed.data.provider, label:parsed.data.label,
    status:parsed.data.status, public_config:parsed.data.publicConfig, updated_at:new Date().toISOString(),
  }, { onConflict:"project_id,provider" }).select("id,provider,label,status,public_config,updated_at").single();
  if (error || !data) return NextResponse.json({ error: "Could not save connection." }, { status: 500 });
  return NextResponse.json({ connection:data });
}

export async function DELETE(req: Request, { params }: Params) {
  const limited = builderRateLimit(req); if (limited) return limited;
  const auth = await requireUser(); if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await req.json().catch(() => null) as { provider?: string } | null;
  const parsed = provider.safeParse(body?.provider);
  if (!parsed.success) return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  const { error } = await auth.supabase.from("site_connections").delete().eq("project_id",id).eq("owner_id",auth.user.id).eq("provider",parsed.data);
  if (error) return NextResponse.json({ error: "Could not remove connection." }, { status: 500 });
  return NextResponse.json({ ok:true });
}
