import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { createWorkItemSchema, updateWorkItemSchema, workItemKindSchema } from "@/lib/work/items";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const url = new URL(req.url);
  const kindParsed = workItemKindSchema.safeParse(url.searchParams.get("kind"));

  let query = supabase
    .from("workspace_items")
    .select("id, owner_id, business_id, kind, title, body, status, due_at, start_at, end_at, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (kindParsed.success) query = query.eq("kind", kindParsed.data);
  const businessId = url.searchParams.get("businessId");
  if (businessId) query = query.eq("business_id", businessId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message.includes("workspace_items") ? "Apply workspace items migration." : "Could not load work items." }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = createWorkItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid item.", issues: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("workspace_items")
    .insert({
      owner_id: user.id,
      business_id: parsed.data.businessId ?? null,
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body,
      status: parsed.data.status,
      due_at: parsed.data.dueAt ?? null,
      start_at: parsed.data.startAt ?? null,
      end_at: parsed.data.endAt ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Could not create item." }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = updateWorkItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid item.", issues: parsed.error.flatten() }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.kind !== undefined) patch.kind = parsed.data.kind;
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.body !== undefined) patch.body = parsed.data.body;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.dueAt !== undefined) patch.due_at = parsed.data.dueAt;
  if (parsed.data.startAt !== undefined) patch.start_at = parsed.data.startAt;
  if (parsed.data.endAt !== undefined) patch.end_at = parsed.data.endAt;
  if (parsed.data.businessId !== undefined) patch.business_id = parsed.data.businessId;

  const { data, error } = await supabase.from("workspace_items").update(patch).eq("id", parsed.data.id).select("*").single();
  if (error) return NextResponse.json({ error: "Could not update item." }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Item id required." }, { status: 400 });
  const { error } = await supabase.from("workspace_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete item." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
