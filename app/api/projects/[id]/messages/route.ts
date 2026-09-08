import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { shopMessageBodySchema } from "@/lib/shop/messaging";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function assertOwner(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  projectId: string,
) {
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();
  return Boolean(project);
}

/** Merchant: list threads, or messages for ?threadId= */
export async function GET(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { id: projectId } = await params;

  if (!(await assertOwner(supabase, user.id, projectId))) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const threadId = new URL(req.url).searchParams.get("threadId");
  if (threadId) {
    if (!/^[0-9a-f-]{36}$/i.test(threadId)) {
      return NextResponse.json({ error: "Invalid thread." }, { status: 400 });
    }
    const { data: thread } = await supabase
      .from("shop_message_threads")
      .select("id")
      .eq("id", threadId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!thread) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }
    const { data: messages } = await supabase
      .from("shop_messages")
      .select("id, sender_role, body, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(200);
    return NextResponse.json({ messages: messages ?? [] });
  }

  const { data: threads, error } = await supabase
    .from("shop_message_threads")
    .select("id, customer_user_id, subject, status, last_message_at, created_at")
    .eq("project_id", projectId)
    .order("last_message_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Messaging needs migration 050. Apply APPLY_SHOP_ORDERS.sql."
          : "Could not load messages.",
        threads: [],
      },
      { status: error.message?.includes("does not exist") ? 503 : 500 },
    );
  }

  return NextResponse.json({ threads: threads ?? [] });
}

const replySchema = shopMessageBodySchema.extend({
  threadId: z.string().uuid(),
});

/** Merchant: reply on a thread. */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;
  const { id: projectId } = await params;

  if (!(await assertOwner(supabase, user.id, projectId))) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reply." }, { status: 400 });
  }

  const { data: thread } = await supabase
    .from("shop_message_threads")
    .select("id")
    .eq("id", parsed.data.threadId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const { data: msg, error } = await supabase
    .from("shop_messages")
    .insert({
      thread_id: thread.id,
      project_id: projectId,
      sender_role: "merchant",
      sender_user_id: user.id,
      body: parsed.data.body,
    })
    .select("id, sender_role, body, created_at")
    .single();

  if (error || !msg) {
    return NextResponse.json({ error: "Could not send reply." }, { status: 500 });
  }

  await supabase
    .from("shop_message_threads")
    .update({ last_message_at: new Date().toISOString(), status: "open" })
    .eq("id", thread.id);

  logCreate("shop.message_merchant", { userId: user.id, projectId, threadId: thread.id });
  return NextResponse.json({ ok: true, message: msg });
}
