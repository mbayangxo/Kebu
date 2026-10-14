import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { z } from "zod";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createWorkItemSchema, updateWorkItemSchema, workItemKindSchema } from "@/lib/work/items";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const url = new URL(req.url);
  const kindParsed = workItemKindSchema.safeParse(url.searchParams.get("kind"));

  if (url.searchParams.has("kind") && !kindParsed.success) return NextResponse.json({ error: "Invalid item type." }, { status: 400 });
  let query = supabase
    .from("workspace_items")
    .select("id, owner_id, business_id, kind, title, body, status, due_at, start_at, end_at, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (kindParsed.success) query = query.eq("kind", kindParsed.data);
  const itemId = url.searchParams.get("id");
  if (itemId && !z.string().uuid().safeParse(itemId).success) return NextResponse.json({ error: "Invalid item id." }, { status: 400 });
  if (itemId) query = query.eq("id", itemId);
  const businessId = url.searchParams.get("businessId");
  const personal = url.searchParams.get("personal") === "1";
  if (businessId && !z.string().uuid().safeParse(businessId).success) return NextResponse.json({ error: "Invalid workspace." }, { status: 400 });
  if (businessId) query = query.eq("business_id", businessId);
  else if (personal) query = query.is("business_id", null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load work items. Please retry or contact support." }, { status: 503 });
  return NextResponse.json({ items: data ?? [], userId: user.id });
}

export async function POST(req: Request) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = createWorkItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid item.", issues: parsed.error.flatten() }, { status: 400 });

  const row = {
    ...(parsed.data.id ? { id: parsed.data.id } : {}),
    owner_id: user.id, business_id: parsed.data.businessId ?? null, kind: parsed.data.kind,
    title: parsed.data.title, body: parsed.data.body, status: parsed.data.status,
    due_at: parsed.data.dueAt ?? null, start_at: parsed.data.startAt ?? null, end_at: parsed.data.endAt ?? null,
  };
  const { data, error } = await supabase.from("workspace_items").insert(row).select("*").single();
  if (error?.code === "23505" && parsed.data.id) {
    const { data: existing } = await supabase.from("workspace_items").select("*")
      .eq("id", parsed.data.id).eq("owner_id", user.id).maybeSingle();
    const matches = existing && Object.entries(row).every(([key, value]) => {
      if (["due_at", "start_at", "end_at"].includes(key) && value && existing[key]) {
        return Date.parse(String(existing[key])) === Date.parse(String(value));
      }
      return existing[key] === value;
    });
    if (matches) return NextResponse.json({ item: existing, confirmedRetry: true });
    return NextResponse.json({ error: "This create request was already used. Reload your items before creating another.", code: "work_create_conflict", ...(existing ? { item: existing } : {}) }, { status: 409 });
  }
  if (error || !data) return NextResponse.json({ error: "Could not create item." }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = updateWorkItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid item.", issues: parsed.error.flatten() }, { status: 400 });

  const { data: existing, error: readError } = await supabase.from("workspace_items")
    .select("id, updated_at").eq("id", parsed.data.id).maybeSingle();
  if (readError) return NextResponse.json({ error: "Could not load item." }, { status: 503 });
  if (!existing) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date(Math.max(Date.now(), Date.parse(existing.updated_at) + 1)).toISOString() };
  if (parsed.data.kind !== undefined) patch.kind = parsed.data.kind;
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.body !== undefined) patch.body = parsed.data.body;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.dueAt !== undefined) patch.due_at = parsed.data.dueAt;
  if (parsed.data.startAt !== undefined) patch.start_at = parsed.data.startAt;
  if (parsed.data.endAt !== undefined) patch.end_at = parsed.data.endAt;
  if (parsed.data.businessId !== undefined) patch.business_id = parsed.data.businessId;

  const { data, error } = await supabase.from("workspace_items").update(patch).eq("id", parsed.data.id)
    .eq("updated_at", parsed.data.expectedUpdatedAt ?? existing.updated_at).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update item." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "This item changed or you no longer have edit access. Your local edits were kept.", code: "work_item_conflict" }, { status: 409 });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: Request) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Item id required." }, { status: 400 });
  const revision = new URL(req.url).searchParams.get("expectedUpdatedAt");
  if (revision && !z.string().datetime({ offset: true }).safeParse(revision).success) return NextResponse.json({ error: "Invalid revision." }, { status: 400 });
  let query = supabase.from("workspace_items").delete().eq("id", id);
  if (revision) query = query.eq("updated_at", revision);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not delete item." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Item changed, was removed, or you cannot delete it.", code: "work_item_conflict" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
