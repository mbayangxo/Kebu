import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Merchant: list B2B company accounts. */
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
    .from("shop_companies")
    .select("id, name, contact_name, contact_phone, contact_email, address, note, order_count, total_xof, created_at")
    .eq("project_id", projectId)
    .order("name", { ascending: true })
    .limit(200);

  if (error) {
    if (/relation.*does not exist/i.test(error.message) || error.code === "42P01") {
      return NextResponse.json({ companies: [], tableReady: false });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type CompanyRow = {
    id: string;
    name: string;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    address: string | null;
    note: string | null;
    order_count: number | null;
    total_xof: number | null;
    created_at: string;
  };
  const companies = (rows as CompanyRow[] ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    contactName: r.contact_name ?? "",
    contactPhone: r.contact_phone ?? "",
    contactEmail: r.contact_email ?? "",
    address: r.address ?? "",
    note: r.note ?? "",
    orderCount: r.order_count ?? 0,
    totalXof: r.total_xof ?? 0,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ companies });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(150),
  contactName: z.string().trim().max(120).optional().default(""),
  contactPhone: z.string().trim().max(30).optional().default(""),
  contactEmail: z.string().trim().email().max(120).optional().or(z.literal("")).default(""),
  address: z.string().trim().max(300).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
});

/** Create a company account. */
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
    return NextResponse.json({ error: "Invalid data." }, { status: 400 });
  }

  const d = parsed.data;
  const { data: row, error } = await access.db
    .from("shop_companies")
    .insert({
      project_id: projectId,
      name: d.name,
      contact_name: d.contactName || null,
      contact_phone: d.contactPhone || null,
      contact_email: d.contactEmail || null,
      address: d.address || null,
      note: d.note || null,
    })
    .select("id, name, created_at")
    .single();

  if (error) {
    if (/relation.*does not exist/i.test(error.message) || error.code === "42P01") {
      return NextResponse.json({ error: "Companies table not set up yet. Ask Kebu support to run migration 089_shop_companies." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, company: row });
}
