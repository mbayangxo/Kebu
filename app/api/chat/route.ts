import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

const createChannelSchema = z.object({
  action: z.literal("create_channel"),
  name: z.string().trim().min(1).max(80),
  businessId: z.string().uuid().nullable().optional(),
});

const sendMessageSchema = z.object({
  action: z.literal("send_message"),
  channelId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});

const bodySchema = z.discriminatedUnion("action", [createChannelSchema, sendMessageSchema]);

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;
  const url = new URL(req.url);
  const channelId = url.searchParams.get("channelId");
  const businessId = url.searchParams.get("businessId");
  const personal = url.searchParams.get("personal") === "1";

  if (channelId) {
    if (!/^[0-9a-f-]{36}$/i.test(channelId)) return NextResponse.json({ error: "Invalid channel." }, { status: 400 });
    const { data, error } = await supabase
      .from("space_messages")
      .select("id, channel_id, author_id, body, created_at")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) return NextResponse.json({ error: "Could not load messages." }, { status: 500 });

    const authorIds = [...new Set((data ?? []).map((row) => row.author_id))];
    let profiles: Array<{ id: string; name: string | null; avatar_url: string | null }> = [];
    if (authorIds.length) {
      const { data: rows } = await supabase.from("user_profiles").select("id, name, avatar_url").in("id", authorIds);
      profiles = rows ?? [];
    }
    return NextResponse.json({ messages: data ?? [], profiles });
  }

  let channelsQuery = supabase
    .from("space_channels")
    .select("id, created_by, business_id, name, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (businessId) channelsQuery = channelsQuery.eq("business_id", businessId);
  else if (personal) channelsQuery = channelsQuery.is("business_id", null);
  const { data, error } = await channelsQuery;
  if (error) return NextResponse.json({ error: error.message.includes("space_channels") ? "Apply space chat migration." : "Could not load chat." }, { status: 500 });
  return NextResponse.json({ channels: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid chat request.", issues: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.action === "create_channel") {
    const { data, error } = await supabase
      .from("space_channels")
      .insert({ created_by: user.id, business_id: parsed.data.businessId ?? null, name: parsed.data.name })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: "Could not create chat." }, { status: 500 });
    return NextResponse.json({ channel: data }, { status: 201 });
  }

  const { data, error } = await supabase
    .from("space_messages")
    .insert({ channel_id: parsed.data.channelId, author_id: user.id, body: parsed.data.body })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Could not send message." }, { status: 500 });
  await supabase.from("space_channels").update({ updated_at: new Date().toISOString() }).eq("id", parsed.data.channelId);
  return NextResponse.json({ message: data }, { status: 201 });
}
