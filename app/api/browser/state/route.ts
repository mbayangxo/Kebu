import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("new_tab"), url: z.string().max(2000).default(""), title: z.string().max(240).default("New tab") }),
  z.object({ action: z.literal("update_tab"), id: z.string().uuid(), url: z.string().max(2000).optional(), title: z.string().max(240).optional(), position: z.number().int().min(0).max(1000).optional() }),
  z.object({ action: z.literal("close_tab"), id: z.string().uuid() }),
  z.object({ action: z.literal("bookmark"), url: z.string().url().max(2000), title: z.string().trim().min(1).max(240), journeyId: z.string().uuid().nullable().optional() }),
  z.object({ action: z.literal("history"), url: z.string().url().max(2000), title: z.string().max(240).default(""), tabId: z.string().uuid().nullable().optional() }),
  z.object({ action: z.literal("journey"), name: z.string().trim().min(1).max(120) }),
]);

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const [tabs, bookmarks, journeys, history] = await Promise.all([
    supabase.from("browser_tabs").select("*").eq("owner_id", user.id).order("position").order("last_opened_at", { ascending: false }),
    supabase.from("browser_bookmarks").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("browser_journeys").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(100),
    supabase.from("browser_history").select("*").eq("owner_id", user.id).order("visited_at", { ascending: false }).limit(100),
  ]);
  const error = tabs.error || bookmarks.error || journeys.error || history.error;
  if (error) return NextResponse.json({ error: error.message.includes("browser_tabs") ? "Apply Kebu Browser migration." : "Could not load browser state." }, { status: 500 });
  return NextResponse.json({ tabs: tabs.data ?? [], bookmarks: bookmarks.data ?? [], journeys: journeys.data ?? [], history: history.data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid browser action." }, { status: 400 });
  const data = parsed.data;

  if (data.action === "new_tab") {
    const { count } = await supabase.from("browser_tabs").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
    const { data: tab, error } = await supabase.from("browser_tabs").insert({ owner_id: user.id, url: data.url, title: data.title, position: count ?? 0 }).select("*").single();
    return error ? NextResponse.json({ error: "Could not create tab." }, { status: 500 }) : NextResponse.json({ tab }, { status: 201 });
  }
  if (data.action === "update_tab") {
    const patch: Record<string, unknown> = { last_opened_at: new Date().toISOString() };
    if (data.url !== undefined) patch.url = data.url;
    if (data.title !== undefined) patch.title = data.title;
    if (data.position !== undefined) patch.position = data.position;
    const { data: tab, error } = await supabase.from("browser_tabs").update(patch).eq("id", data.id).eq("owner_id", user.id).select("*").single();
    return error ? NextResponse.json({ error: "Could not update tab." }, { status: 500 }) : NextResponse.json({ tab });
  }
  if (data.action === "close_tab") {
    const { error } = await supabase.from("browser_tabs").delete().eq("id", data.id).eq("owner_id", user.id);
    return error ? NextResponse.json({ error: "Could not close tab." }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (data.action === "bookmark") {
    const { data: bookmark, error } = await supabase.from("browser_bookmarks").upsert({ owner_id: user.id, journey_id: data.journeyId ?? null, url: data.url, title: data.title }, { onConflict: "owner_id,url" }).select("*").single();
    return error ? NextResponse.json({ error: "Could not save bookmark." }, { status: 500 }) : NextResponse.json({ bookmark });
  }
  if (data.action === "history") {
    const { data: entry, error } = await supabase.from("browser_history").insert({ owner_id: user.id, tab_id: data.tabId ?? null, url: data.url, title: data.title }).select("*").single();
    return error ? NextResponse.json({ error: "Could not save history." }, { status: 500 }) : NextResponse.json({ entry }, { status: 201 });
  }
  const { data: journey, error } = await supabase.from("browser_journeys").insert({ owner_id: user.id, name: data.name }).select("*").single();
  return error ? NextResponse.json({ error: "Could not create journey." }, { status: 500 }) : NextResponse.json({ journey }, { status: 201 });
}
