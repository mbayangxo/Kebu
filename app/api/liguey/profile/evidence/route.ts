import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";

const linkSchema = z.object({
  libraryNodeId: z.string().uuid(),
  label: z.string().trim().max(160).nullable().optional(),
});

/** List the signed-in worker's own portfolio/evidence links, with the Library item's title. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: links, error } = await supabase
    .from("worker_profile_evidence")
    .select("id, library_node_id, label, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load your evidence." }, { status: 503 });

  const nodeIds = [...new Set((links ?? []).map((link) => link.library_node_id))];
  let nodes: { id: string; title: string; kind: string }[] = [];
  if (nodeIds.length) {
    const { data } = await supabase.from("library_nodes").select("id, title, kind").in("id", nodeIds);
    nodes = data ?? [];
  }

  return NextResponse.json({ evidence: links ?? [], nodes });
}

/** Link a Library item the worker owns as portfolio evidence. */
export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid evidence link." }, { status: 400 });

  const { data, error } = await supabase
    .from("worker_profile_evidence")
    .insert({ user_id: user.id, library_node_id: parsed.data.libraryNodeId, label: parsed.data.label ?? null })
    .select("id, library_node_id, label, created_at")
    .single();

  if (error?.code === "23505") return NextResponse.json({ error: "This Library item is already linked as evidence." }, { status: 409 });
  if (error || !data) return NextResponse.json({ error: "You can only link a Library item you own." }, { status: 403 });
  return NextResponse.json({ evidence: data }, { status: 201 });
}

/** Remove one of the worker's own evidence links. */
export async function DELETE(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const libraryNodeId = new URL(req.url).searchParams.get("libraryNodeId");
  if (!libraryNodeId || !z.string().uuid().safeParse(libraryNodeId).success) {
    return NextResponse.json({ error: "Invalid evidence link." }, { status: 400 });
  }

  const { data: removed, error } = await supabase
    .from("worker_profile_evidence")
    .delete()
    .eq("user_id", user.id)
    .eq("library_node_id", libraryNodeId)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not remove this evidence link." }, { status: 500 });
  if (!removed) return NextResponse.json({ error: "Evidence link not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
