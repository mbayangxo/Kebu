import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { createServiceClient } from "@/lib/opportunity/admin";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  addresseeId: z.string().uuid(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["accept", "decline", "block"]),
});

async function withProfiles(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  rows: Array<{
    id: string;
    requester_id: string;
    addressee_id: string;
    status: string;
    requested_at: string;
    responded_at: string | null;
    updated_at: string;
  }>,
  currentUserId: string,
) {
  const ids = [...new Set(rows.flatMap((row) => [row.requester_id, row.addressee_id]))];
  const admin = createServiceClient();
  const { data: profiles } = ids.length && admin
    ? await admin.from("user_profiles").select("id, name, avatar_url, public_kebu_id").in("id", ids)
    : { data: [] as Array<{ id: string; name: string | null; avatar_url: string | null; public_kebu_id: string | null }> };

  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return rows.map((row) => {
    const otherId = row.requester_id === currentUserId ? row.addressee_id : row.requester_id;
    return {
      ...row,
      direction: row.requester_id === currentUserId ? "outgoing" : "incoming",
      other: byId.get(otherId) ?? { id: otherId, name: null, avatar_url: null },
    };
  });
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  let query = supabase
    .from("personal_connections")
    .select("id, requester_id, addressee_id, status, requested_at, responded_at, updated_at")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (status && ["pending", "accepted", "declined", "blocked"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load your people." }, { status: 500 });

  const connections = await withProfiles(supabase, data ?? [], user.id);
  return NextResponse.json({ connections });
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success || parsed.data.addresseeId === user.id) {
    return NextResponse.json({ error: "Invalid friend request." }, { status: 400 });
  }

  const { data: addressee } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", parsed.data.addresseeId)
    .maybeSingle();

  if (!addressee) return NextResponse.json({ error: "That Kebu person was not found." }, { status: 404 });

  const { data: existing } = await supabase
    .from("personal_connections")
    .select("id, status, requester_id, addressee_id")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${parsed.data.addresseeId}),and(requester_id.eq.${parsed.data.addresseeId},addressee_id.eq.${user.id})`,
    )
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "A connection between these Kebu accounts already exists.", connection: existing }, { status: 409 });
  }

  const { data: connection, error } = await supabase
    .from("personal_connections")
    .insert({
      requester_id: user.id,
      addressee_id: parsed.data.addresseeId,
      status: "pending",
    })
    .select("id, requester_id, addressee_id, status, requested_at, responded_at, updated_at")
    .single();

  if (error || !connection) {
    return NextResponse.json(
      { error: error?.code === "23505" ? "A connection already exists." : "Could not send friend request." },
      { status: error?.code === "23505" ? 409 : 500 },
    );
  }

  return NextResponse.json({ connection }, { status: 201 });
}

export async function PATCH(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid connection action." }, { status: 400 });

  const nextStatus = parsed.data.action === "accept" ? "accepted" : parsed.data.action === "decline" ? "declined" : "blocked";
  const { data: connection, error } = await supabase
    .from("personal_connections")
    .update({ status: nextStatus })
    .eq("id", parsed.data.id)
    .select("id, requester_id, addressee_id, status, requested_at, responded_at, updated_at")
    .single();

  if (error || !connection) {
    return NextResponse.json({ error: "That connection action is not allowed." }, { status: 403 });
  }
  return NextResponse.json({ connection });
}

export async function DELETE(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid connection id." }, { status: 400 });
  }

  const { error } = await supabase.from("personal_connections").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not remove connection." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
