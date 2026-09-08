import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** List shop notifications for this store (owner + team copies). */
export async function GET(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const access = await assertShopProjectAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "shop-notifications",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";

  let q = access.db
    .from("shop_owner_notifications")
    .select("id, kind, title, body, href, order_id, read_at, created_at")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  if (unreadOnly) q = q.is("read_at", null);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Apply migration 067_shop_owner_ops.sql for order notifications."
          : "Could not load notifications.",
        notifications: [],
        unread: 0,
      },
      { status: error.message?.includes("does not exist") ? 200 : 500 },
    );
  }

  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return NextResponse.json({ notifications: data ?? [], unread });
}

/** Mark notifications read. Body: { ids?: string[], all?: true } */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const access = await assertShopProjectAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "shop-notifications-read",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: { ids?: string[]; all?: boolean } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const now = new Date().toISOString();
  let q = access.db
    .from("shop_owner_notifications")
    .update({ read_at: now })
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .is("read_at", null);

  if (!body.all && Array.isArray(body.ids) && body.ids.length) {
    q = q.in("id", body.ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)));
  }

  const { error } = await q;
  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Apply migration 067_shop_owner_ops.sql."
          : "Could not update notifications.",
      },
      { status: 500 },
    );
  }

  logCreate("shop.notifications_read", { projectId, all: Boolean(body.all) });
  return NextResponse.json({ ok: true });
}
