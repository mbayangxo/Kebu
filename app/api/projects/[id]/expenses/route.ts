import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Merchant: list business expenses. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const access = await assertShopProjectAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "shop-orders",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: rows, error } = await access.db
    .from("shop_expenses")
    .select("id, description, category, amount_xof, currency, date, note, created_at")
    .eq("project_id", projectId)
    .order("date", { ascending: false })
    .limit(200);

  if (error) {
    // Table may not exist yet in this deployment
    if (/relation.*does not exist/i.test(error.message) || error.code === "42P01") {
      return NextResponse.json({ expenses: [], tableReady: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expenses: rows ?? [], tableReady: true });
}

const createSchema = z.object({
  description: z.string().trim().min(1).max(200),
  category: z.enum(["inventory", "shipping", "marketing", "salary", "rent", "utilities", "equipment", "fees", "other"]),
  amount_xof: z.number().min(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(500).optional().default(""),
});

/** Add a business expense. */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const access = await assertShopProjectAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "shop-orders",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data.", issues: parsed.error.issues }, { status: 400 });
  }

  const d = parsed.data;
  const { data: row, error } = await access.db
    .from("shop_expenses")
    .insert({
      project_id: projectId,
      description: d.description,
      category: d.category,
      amount_xof: d.amount_xof,
      date: d.date,
      note: d.note,
    })
    .select("id, description, category, amount_xof, date, note, created_at")
    .single();

  if (error) {
    if (/relation.*does not exist/i.test(error.message) || error.code === "42P01") {
      return NextResponse.json({ error: "Expenses table not set up yet. Ask Kebu support to run migration 087_shop_expenses." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, expense: row });
}

/** Delete an expense. */
export async function DELETE(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const access = await assertShopProjectAccess(supabase, {
    userId: user.id,
    email: user.email,
    projectId,
    action: "shop-orders",
  });
  if (!access) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const expenseId = url.searchParams.get("id");
  if (!expenseId) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const { error } = await access.db
    .from("shop_expenses")
    .delete()
    .eq("id", expenseId)
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
