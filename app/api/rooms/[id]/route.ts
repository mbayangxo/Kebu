import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

const tabSchema = z.enum(["overview","wall","tasks","calendar","links","decisions","people","chat"]);

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const { id } = await context.params;
  const tab = tabSchema.catch("overview").parse(new URL(req.url).searchParams.get("tab") || "overview");

  const { data: room, error } = await supabase
    .from("rooms")
    .select("id, created_by, business_id, name, description, room_type, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !room) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const payload: Record<string, unknown> = { room, tab };

  if (tab === "overview" || tab === "people") {
    const { data: members } = await supabase.from("room_members").select("room_id, user_id, role, joined_at").eq("room_id", id);
    const ids = [...new Set((members ?? []).map((member) => member.user_id))];
    let profiles: unknown[] = [];
    if (ids.length) {
      const { data } = await supabase.from("user_profiles").select("id, name, email, avatar_url").in("id", ids);
      profiles = data ?? [];
    }
    payload.members = members ?? [];
    payload.profiles = profiles;
  }

  if (tab === "overview" || tab === "wall") {
    const { data } = await supabase.from("room_posts").select("id, author_id, body, created_at, updated_at").eq("room_id", id).order("created_at", { ascending: false }).limit(80);
    payload.posts = data ?? [];
  }

  if (tab === "overview" || tab === "tasks" || tab === "calendar") {
    const kind = tab === "calendar" ? "event" : tab === "tasks" ? "task" : null;
    let query = supabase.from("workspace_items").select("*").eq("room_id", id).order("updated_at", { ascending: false }).limit(100);
    if (kind) query = query.eq("kind", kind);
    else query = query.in("kind", ["task","event"]);
    const { data } = await query;
    payload.items = data ?? [];
  }

  if (tab === "overview" || tab === "links") {
    const { data } = await supabase.from("room_links").select("*").eq("room_id", id).order("created_at", { ascending: false }).limit(100);
    payload.links = data ?? [];
  }

  if (tab === "overview" || tab === "decisions") {
    const { data } = await supabase.from("room_decisions").select("*").eq("room_id", id).order("decided_at", { ascending: false }).limit(100);
    payload.decisions = data ?? [];
  }

  if (tab === "overview" || tab === "chat") {
    const { data: channel } = await supabase.from("space_channels").select("id, name").eq("room_id", id).maybeSingle();
    payload.channel = channel ?? null;
    if (channel) {
      const { data } = await supabase.from("space_messages").select("id, author_id, body, created_at").eq("channel_id", channel.id).order("created_at", { ascending: true }).limit(200);
      payload.messages = data ?? [];
    }
  }

  return NextResponse.json(payload);
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("post"), body: z.string().trim().min(1).max(8000) }),
  z.object({ action: z.literal("task"), title: z.string().trim().min(1).max(160), body: z.string().max(20000).default(""), dueAt: z.string().datetime().nullable().optional() }),
  z.object({ action: z.literal("event"), title: z.string().trim().min(1).max(160), body: z.string().max(20000).default(""), startAt: z.string().datetime(), endAt: z.string().datetime().nullable().optional() }),
  z.object({ action: z.literal("link"), label: z.string().trim().min(1).max(160), url: z.string().url().max(2000) }),
  z.object({ action: z.literal("decision"), title: z.string().trim().min(1).max(200), detail: z.string().max(8000).default("") }),
  z.object({ action: z.literal("message"), body: z.string().trim().min(1).max(5000) }),
  z.object({ action: z.literal("member"), userId: z.string().uuid(), role: z.enum(["admin","member","viewer"]).default("member") }),
]);

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await context.params;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid room action.", issues: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.action === "post") {
    const { data, error } = await supabase.from("room_posts").insert({ room_id: id, author_id: user.id, body: parsed.data.body }).select("*").single();
    return error ? NextResponse.json({ error: "Could not post." }, { status: 500 }) : NextResponse.json({ post: data }, { status: 201 });
  }
  if (parsed.data.action === "task") {
    const { data, error } = await supabase.from("workspace_items").insert({ owner_id: user.id, room_id: id, kind: "task", title: parsed.data.title, body: parsed.data.body, status: "open", due_at: parsed.data.dueAt ?? null }).select("*").single();
    return error ? NextResponse.json({ error: "Could not create task." }, { status: 500 }) : NextResponse.json({ item: data }, { status: 201 });
  }
  if (parsed.data.action === "event") {
    const { data, error } = await supabase.from("workspace_items").insert({ owner_id: user.id, room_id: id, kind: "event", title: parsed.data.title, body: parsed.data.body, status: "open", start_at: parsed.data.startAt, end_at: parsed.data.endAt ?? null }).select("*").single();
    return error ? NextResponse.json({ error: "Could not create event." }, { status: 500 }) : NextResponse.json({ item: data }, { status: 201 });
  }
  if (parsed.data.action === "link") {
    const { data, error } = await supabase.from("room_links").insert({ room_id: id, created_by: user.id, label: parsed.data.label, url: parsed.data.url }).select("*").single();
    return error ? NextResponse.json({ error: "Could not add link." }, { status: 500 }) : NextResponse.json({ link: data }, { status: 201 });
  }
  if (parsed.data.action === "decision") {
    const { data, error } = await supabase.from("room_decisions").insert({ room_id: id, created_by: user.id, title: parsed.data.title, detail: parsed.data.detail }).select("*").single();
    return error ? NextResponse.json({ error: "Could not record decision." }, { status: 500 }) : NextResponse.json({ decision: data }, { status: 201 });
  }
  if (parsed.data.action === "message") {
    const { data: channel } = await supabase.from("space_channels").select("id").eq("room_id", id).maybeSingle();
    if (!channel) return NextResponse.json({ error: "Room chat is unavailable." }, { status: 404 });
    const { data, error } = await supabase.from("space_messages").insert({ channel_id: channel.id, author_id: user.id, body: parsed.data.body }).select("*").single();
    return error ? NextResponse.json({ error: "Could not send message." }, { status: 500 }) : NextResponse.json({ message: data }, { status: 201 });
  }

  const { data, error } = await supabase.from("room_members").upsert({ room_id: id, user_id: parsed.data.userId, role: parsed.data.role }, { onConflict: "room_id,user_id" }).select("*").single();
  return error ? NextResponse.json({ error: "Could not add room member." }, { status: 500 }) : NextResponse.json({ member: data }, { status: 201 });
}
