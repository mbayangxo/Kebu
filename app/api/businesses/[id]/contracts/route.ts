import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser, logCreate } from "@/lib/create/auth";
import { assertBusinessManager, appBaseUrl } from "@/lib/business/assert-manager";
import {
  createContractSchema,
  contractPublicPath,
  newOpsPublicId,
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
    .from("business_contracts")
    .select(
      "id, public_id, title, counterparty_name, counterparty_email, status, sent_at, accepted_at, accepted_name, created_at",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Contracts missing. Apply migration 053_business_invoices_contracts.sql."
          : "Could not load contracts.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    contracts: (data ?? []).map((r) => ({
      ...r,
      publicPath: contractPublicPath(r.public_id),
    })),
  });
}

async function sendContract(supabase: SupabaseClient, businessId: string, body: unknown) {
  const contractId = (body as { contractId?: string }).contractId;
  if (!contractId) {
    return NextResponse.json({ error: "contractId required." }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("business_contracts")
    .select("id, public_id, title, counterparty_name, counterparty_email, status")
    .eq("id", contractId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Contract not found." }, { status: 404 });

  const path = contractPublicPath(row.public_id);
  const url = `${appBaseUrl()}${path}`;
  let emailed = false;

  if (row.counterparty_email) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("trading_name, legal_name, business_email")
      .eq("id", businessId)
      .maybeSingle();
    const from =
      process.env.RESEND_FROM_EMAIL?.trim() || biz?.business_email || "noreply@kebu.africa";
    const name = biz?.trading_name || biz?.legal_name || "Kebu business";
    emailed = await sendCampaignEmail({
      to: row.counterparty_email,
      from,
      fromName: name,
      subject: `Contract: ${row.title}`,
      html: `<p>Hi ${row.counterparty_name},</p><p><strong>${name}</strong> sent you a contract to review and accept.</p><p><a href="${url}">Open contract</a></p>`,
      text: `Contract ${row.title}: ${url}`,
    });
  }

  await supabase
    .from("business_contracts")
    .update({
      status: row.status === "draft" ? "sent" : row.status,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  logCreate("ops.contract_sent", { businessId, contractId: row.id, emailed });

  return NextResponse.json({
    ok: true,
    publicPath: path,
    url,
    emailed,
    message: emailed
      ? "Contract emailed and marked sent."
      : "Share link ready (email sent only when Resend + counterparty email are set).",
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
    return sendContract(supabase, businessId, body);
  }

  const parsed = createContractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid contract.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const publicId = newOpsPublicId("ctr");

  const { data: row, error } = await supabase
    .from("business_contracts")
    .insert({
      business_id: businessId,
      public_id: publicId,
      title: input.title,
      counterparty_name: input.counterpartyName,
      counterparty_email: input.counterpartyEmail || null,
      body_text: input.bodyText,
      status: "draft",
      created_by: user.id,
    })
    .select("id, public_id, title, status")
    .single();

  if (error || !row) {
    return NextResponse.json(
      {
        error: error?.message.includes("does not exist")
          ? "Contracts missing. Apply migration 053_business_invoices_contracts.sql."
          : error?.message ?? "Could not create contract.",
      },
      { status: 500 },
    );
  }

  logCreate("ops.contract_created", { businessId, contractId: row.id });

  return NextResponse.json(
    { contract: { ...row, publicPath: contractPublicPath(row.public_id) } },
    { status: 201 },
  );
}
