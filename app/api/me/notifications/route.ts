import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  id: z.string().uuid().optional(),
  markAllRead: z.boolean().optional(),
}).refine((value) => Boolean(value.id) !== Boolean(value.markAllRead), {
  message: "Choose one notification action.",
});

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("user_notifications")
    .select("id, project_id, kind, title, body, action_url, metadata, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ error: "Could not load notifications." }, { status: 500 });
  const notifications = data ?? [];
  return NextResponse.json({
    notifications,
    unread: notifications.filter((item) => !item.read_at).length,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification action." }, { status: 400 });

  let query = supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (parsed.data.id) query = query.eq("id", parsed.data.id);
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Could not update notifications." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
