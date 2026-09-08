import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser, logCreate } from "@/lib/create/auth";
import { assertBusinessManager, appBaseUrl } from "@/lib/business/assert-manager";
import {
  createInvoiceSchema,
  invoicePublicPath,
  newOpsPublicId,
  sumInvoiceLines,
} from "@/lib/business/ops-docs";
import { sendCampaignEmail } from "@/lib/email/send-campaign";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id: businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  if (!(await assertBusinessManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("business_invoices")
    .select(
      "id, public_id, invoice_number, client_name, client_email, client_phone, amount_xof, status, due_at, sent_at, paid_at, created_at",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Invoices missing. Apply migration 053_business_invoices_contracts.sql."
          : "Could not load invoices.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    invoices: (data ?? []).map((r) => ({
      ...r,
      publicPath: invoicePublicPath(r.public_id),
    })),
  });
}

async function sendInvoice(supabase: SupabaseClient, businessId: string, body: unknown) {
  const invoiceId = (body as { invoiceId?: string }).invoiceId;
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId required." }, { status: 400 });
  }

  const { data: inv } = await supabase
    .from("business_invoices")
    .select("id, public_id, invoice_number, client_name, client_email, amount_xof, status")
    .eq("id", invoiceId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!inv) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const path = invoicePublicPath(inv.public_id);
  const url = `${appBaseUrl()}${path}`;
  let emailed = false;

  if (inv.client_email) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("trading_name, legal_name, business_email")
      .eq("id", businessId)
      .maybeSingle();
    const from =
      process.env.RESEND_FROM_EMAIL?.trim() || biz?.business_email || "noreply@kebu.africa";
    const name = biz?.trading_name || biz?.legal_name || "Kebu business";
    emailed = await sendCampaignEmail({
      to: inv.client_email,
      from,
      fromName: name,
      subject: `Invoice ${inv.invoice_number} from ${name}`,
      html: `<p>Hi ${inv.client_name},</p><p>Your invoice <strong>${inv.invoice_number}</strong> for <strong>${inv.amount_xof.toLocaleString()} XOF</strong> is ready.</p><p><a href="${url}">View invoice</a></p>`,
      text: `Invoice ${inv.invoice_number}: ${url}`,
    });
  }

  await supabase
    .from("business_invoices")
    .update({
      status: inv.status === "draft" ? "sent" : inv.status,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", inv.id);

  logCreate("ops.invoice_sent", { businessId, invoiceId: inv.id, emailed });

  return NextResponse.json({
    ok: true,
    publicPath: path,
    url,
    emailed,
    message: emailed
      ? "Invoice emailed and marked sent."
      : inv.client_email
        ? "Link ready — email not sent (configure RESEND_API_KEY). Share the link."
        : "Link ready — add client email to send, or share the link.",
  });
}

export async function POST(req: Request, { params }: Params) {
  const { id: businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  if (!(await assertBusinessManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if ((body as { action?: string })?.action === "send") {
    return sendInvoice(supabase, businessId, body);
  }

  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invoice.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const amount = sumInvoiceLines(
    input.lines.map((l) => ({ quantity: l.quantity, unitAmountXof: l.unitAmountXof })),
  );
  const publicId = newOpsPublicId("inv");
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

  const { data: inv, error } = await supabase
    .from("business_invoices")
    .insert({
      business_id: businessId,
      public_id: publicId,
      invoice_number: invoiceNumber,
      client_name: input.clientName,
      client_email: input.clientEmail || null,
      client_phone: input.clientPhone || "",
      notes: input.notes || "",
      amount_xof: amount,
      status: "draft",
      due_at: input.dueAt ? new Date(input.dueAt).toISOString() : null,
      created_by: user.id,
    })
    .select("id, public_id, invoice_number, amount_xof, status")
    .single();

  if (error || !inv) {
    return NextResponse.json(
      {
        error: error?.message.includes("does not exist")
          ? "Invoices missing. Apply migration 053_business_invoices_contracts.sql."
          : error?.message ?? "Could not create invoice.",
      },
      { status: 500 },
    );
  }

  await supabase.from("business_invoice_lines").insert(
    input.lines.map((l, i) => ({
      invoice_id: inv.id,
      business_id: businessId,
      description: l.description,
      quantity: l.quantity,
      unit_amount_xof: l.unitAmountXof,
      sort_order: i,
    })),
  );

  logCreate("ops.invoice_created", { businessId, invoiceId: inv.id });

  return NextResponse.json(
    { invoice: { ...inv, publicPath: invoicePublicPath(inv.public_id) } },
    { status: 201 },
  );
}

export async function PATCH(req: Request, { params }: Params) {
  const { id: businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  if (!(await assertBusinessManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  let body: { invoiceId?: string; status?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.invoiceId || !body.status) {
    return NextResponse.json({ error: "invoiceId and status required." }, { status: 400 });
  }
  if (!["paid", "void", "sent", "draft", "overdue"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    status: body.status,
    updated_at: new Date().toISOString(),
  };
  if (body.status === "paid") patch.paid_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("business_invoices")
    .update(patch)
    .eq("id", body.invoiceId)
    .eq("business_id", businessId)
    .select("id, status, paid_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  return NextResponse.json({ invoice: data });
}
