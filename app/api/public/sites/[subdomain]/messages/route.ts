import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { shopMessageBodySchema } from "@/lib/shop/messaging";
import { builderRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

async function liveProject(subdomain: string) {
  const admin = createServiceClient();
  if (!admin) return { error: NextResponse.json({ error: "Service unavailable." }, { status: 503 }) };
  const { data: live } = await admin
    .from("deployments")
    .select("project_id")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();
  if (!live?.project_id) {
    return { error: NextResponse.json({ error: "Site is not live." }, { status: 404 }) };
  }
  return { projectId: live.project_id as string };
}

/** Customer: load thread + messages with this store. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();
  const live = await liveProject(subdomain);
  if ("error" in live) return live.error;

  const { data: thread, error } = await supabase
    .from("shop_message_threads")
    .select("id, subject, status, last_message_at")
    .eq("project_id", live.projectId)
    .eq("customer_user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Messaging needs migration 050. Apply APPLY_SHOP_ORDERS.sql."
          : "Could not load messages.",
      },
      { status: 500 },
    );
  }

  if (!thread) {
    return NextResponse.json({ thread: null, messages: [] });
  }

  const { data: messages } = await supabase
    .from("shop_messages")
    .select("id, sender_role, body, created_at")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true })
    .limit(200);

  return NextResponse.json({ thread, messages: messages ?? [] });
}

/** Customer: start or continue a message to the store. */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = shopMessageBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  }

  const live = await liveProject(subdomain);
  if ("error" in live) return live.error;

  let { data: thread } = await supabase
    .from("shop_message_threads")
    .select("id")
    .eq("project_id", live.projectId)
    .eq("customer_user_id", user.id)
    .maybeSingle();

  if (!thread) {
    const created = await supabase
      .from("shop_message_threads")
      .insert({
        project_id: live.projectId,
        customer_user_id: user.id,
        subject: parsed.data.subject || "Question about the shop",
        status: "open",
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (created.error || !created.data) {
      return NextResponse.json(
        {
          error: created.error?.message?.includes("does not exist")
            ? "Messaging needs migration 050. Apply APPLY_SHOP_ORDERS.sql."
            : "Could not start conversation.",
        },
        { status: 500 },
      );
    }
    thread = created.data;
  }

  const { data: msg, error: msgErr } = await supabase
    .from("shop_messages")
    .insert({
      thread_id: thread.id,
      project_id: live.projectId,
      sender_role: "customer",
      sender_user_id: user.id,
      body: parsed.data.body,
    })
    .select("id, sender_role, body, created_at")
    .single();

  if (msgErr || !msg) {
    return NextResponse.json({ error: "Could not send message." }, { status: 500 });
  }

  await supabase
    .from("shop_message_threads")
    .update({ last_message_at: new Date().toISOString(), status: "open" })
    .eq("id", thread.id);

  logCreate("shop.message_customer", { userId: user.id, projectId: live.projectId, threadId: thread.id });
  return NextResponse.json({ ok: true, message: msg, threadId: thread.id });
}
