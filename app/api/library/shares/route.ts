import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";

const shareSchema = z.object({
  nodeId: z.string().uuid(),
  userId: z.string().uuid(),
  permission: z.enum(["viewer", "editor"]),
});

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const nodeId = new URL(req.url).searchParams.get("nodeId");
  if (!nodeId || !z.string().uuid().safeParse(nodeId).success) {
    return NextResponse.json({ error: "Invalid Library item." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("library_shares")
    .select("node_id, shared_with_user_id, permission, shared_by_user_id, created_at, updated_at")
    .eq("node_id", nodeId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Could not load sharing." }, { status: 403 });
  return NextResponse.json({ shares: data ?? [] });
}

export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = shareSchema.safeParse(body);
  if (!parsed.success || parsed.data.userId === user.id) {
    return NextResponse.json({ error: "Invalid share." }, { status: 400 });
  }

  const { data: connection } = await supabase
    .from("personal_connections")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${parsed.data.userId}),and(requester_id.eq.${parsed.data.userId},addressee_id.eq.${user.id})`,
    )
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "You can share Library items with accepted Kebu connections." }, { status: 403 });
  }

  const { data: share, error } = await supabase
    .from("library_shares")
    .upsert({
      node_id: parsed.data.nodeId,
      shared_with_user_id: parsed.data.userId,
      permission: parsed.data.permission,
      shared_by_user_id: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "node_id,shared_with_user_id" })
    .select("*")
    .single();

  if (error || !share) return NextResponse.json({ error: "Could not share this item." }, { status: 403 });
  return NextResponse.json({ share });
}

export async function DELETE(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const url = new URL(req.url);
  const nodeId = url.searchParams.get("nodeId");
  const userId = url.searchParams.get("userId");
  if (!nodeId || !userId || !z.string().uuid().safeParse(nodeId).success || !z.string().uuid().safeParse(userId).success) {
    return NextResponse.json({ error: "Invalid share." }, { status: 400 });
  }

  const { error } = await supabase
    .from("library_shares")
    .delete()
    .eq("node_id", nodeId)
    .eq("shared_with_user_id", userId);

  if (error) return NextResponse.json({ error: "Could not remove share." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
