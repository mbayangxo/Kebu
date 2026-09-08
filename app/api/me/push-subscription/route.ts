import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, logCreate } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

const subSchema = z.object({
  endpoint: z.string().trim().url().max(2000),
  keys: z
    .object({
      p256dh: z.string().trim().max(500).default(""),
      auth: z.string().trim().max(200).default(""),
    })
    .optional(),
  projectId: z.string().uuid().optional(),
});

/**
 * Register a Web Push subscription for order alerts.
 * Delivery requires VAPID keys (WEB_PUSH_VAPID_PUBLIC / WEB_PUSH_VAPID_PRIVATE).
 * Until keys exist, browser Notification API still works while Shop is open.
 */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = subSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  const ua = req.headers.get("user-agent")?.slice(0, 400) ?? "";
  const { error } = await supabase.from("shop_push_subscriptions").upsert(
    {
      user_id: user.id,
      project_id: parsed.data.projectId ?? null,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys?.p256dh ?? "",
      auth: parsed.data.keys?.auth ?? "",
      user_agent: ua,
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Apply migration 067_shop_owner_ops.sql for push subscriptions."
          : "Could not save push subscription.",
      },
      { status: 500 },
    );
  }

  logCreate("shop.push_subscribed", { userId: user.id, projectId: parsed.data.projectId });
  return NextResponse.json({
    ok: true,
    webPushReady: Boolean(
      process.env.WEB_PUSH_VAPID_PUBLIC?.trim() && process.env.WEB_PUSH_VAPID_PRIVATE?.trim(),
    ),
  });
}
