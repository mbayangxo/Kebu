import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { publicSiteRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ publicId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { publicId: raw } = await params;
  const publicId = raw.trim().toLowerCase();
  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: inv, error } = await admin
    .from("business_invoices")
    .select(
      "id, public_id, invoice_number, client_name, amount_xof, status, due_at, notes, business_id, currency",
    )
    .eq("public_id", publicId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Invoices missing. Apply migration 053."
          : "Could not load invoice.",
      },
      { status: 500 },
    );
  }
  if (!inv || inv.status === "draft" || inv.status === "void") {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const { data: biz } = await admin
    .from("businesses")
    .select("trading_name, legal_name, business_email, business_phone")
    .eq("id", inv.business_id)
    .maybeSingle();

  const { data: lines } = await admin
    .from("business_invoice_lines")
    .select("description, quantity, unit_amount_xof")
    .eq("invoice_id", inv.id)
    .order("sort_order", { ascending: true });

  if (inv.status === "sent") {
    await admin
      .from("business_invoices")
      .update({ status: "viewed", updated_at: new Date().toISOString() })
      .eq("id", inv.id)
      .eq("status", "sent");
  }

  return NextResponse.json({
    invoice: {
      publicId: inv.public_id,
      number: inv.invoice_number,
      clientName: inv.client_name,
      amountXof: inv.amount_xof,
      status: inv.status === "sent" ? "viewed" : inv.status,
      dueAt: inv.due_at,
      notes: inv.notes,
      currency: inv.currency,
      businessName: biz?.trading_name || biz?.legal_name || "Business",
      businessEmail: biz?.business_email,
      businessPhone: biz?.business_phone,
      lines: (lines ?? []).map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitAmountXof: l.unit_amount_xof,
        lineTotal: l.quantity * l.unit_amount_xof,
      })),
    },
  });
}

/** No public mark-paid — owner only. */
export async function POST(req: NextRequest) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;
  return NextResponse.json(
    { error: "Clients cannot mark invoices paid from the browser." },
    { status: 405 },
  );
}
