import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  kind: z.enum(["folder", "link", "document", "sheet"]).default("folder"),
  title: z.string().trim().min(1).max(240),
  parentId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(240).optional(),
  parentId: z.string().uuid().nullable().optional(),
  starred: z.boolean().optional(),
  trashed: z.boolean().optional(),
});

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const url = new URL(req.url);
  const parentId = url.searchParams.get("parentId");
  const shared = url.searchParams.get("shared") === "1";
  const trash = url.searchParams.get("trash") === "1";

  let query = supabase
    .from("library_nodes")
    .select("id, owner_id, parent_id, kind, title, storage_path, mime_type, byte_size, source_kind, source_id, metadata, starred, trashed_at, created_at, updated_at")
    .order("kind", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(250);

  if (trash) query = query.not("trashed_at", "is", null);
  else query = query.is("trashed_at", null);

  if (parentId) query = query.eq("parent_id", parentId);
  else query = query.is("parent_id", null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load Library." }, { status: 500 });

  let nodes = data ?? [];
  if (shared) {
    const authUserId = auth.user.id;
    nodes = nodes.filter((node) => node.owner_id !== authUserId);
  }

  return NextResponse.json({ nodes });
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
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Library item.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: node, error } = await supabase
    .from("library_nodes")
    .insert({
      owner_id: user.id,
      parent_id: parsed.data.parentId ?? null,
      kind: parsed.data.kind,
      title: parsed.data.title,
      metadata: parsed.data.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !node) {
    return NextResponse.json({ error: "Could not create Library item." }, { status: 403 });
  }
  return NextResponse.json({ node }, { status: 201 });
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Library update.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.parentId !== undefined) patch.parent_id = parsed.data.parentId;
  if (parsed.data.starred !== undefined) patch.starred = parsed.data.starred;
  if (parsed.data.trashed !== undefined) patch.trashed_at = parsed.data.trashed ? new Date().toISOString() : null;

  const { data: node, error } = await supabase
    .from("library_nodes")
    .update(patch)
    .eq("id", parsed.data.id)
    .select("*")
    .single();

  if (error || !node) return NextResponse.json({ error: "Could not update Library item." }, { status: 403 });
  return NextResponse.json({ node });
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
    return NextResponse.json({ error: "Invalid Library item." }, { status: 400 });
  }

  const { error } = await supabase.from("library_nodes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not permanently delete item." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
