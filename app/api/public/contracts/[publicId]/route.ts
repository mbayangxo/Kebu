import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { acceptContractSchema } from "@/lib/business/ops-docs";
import { logCreate } from "@/lib/create/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ publicId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { publicId: raw } = await params;
  const publicId = raw.trim().toLowerCase();
  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: row, error } = await admin
    .from("business_contracts")
    .select(
      "id, public_id, title, counterparty_name, body_text, status, accepted_at, accepted_name, business_id",
    )
    .eq("public_id", publicId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Contracts missing. Apply migration 053."
          : "Could not load contract.",
      },
      { status: 500 },
    );
  }
  if (!row || row.status === "draft" || row.status === "void") {
    return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  }

  const { data: biz } = await admin
    .from("businesses")
    .select("trading_name, legal_name")
    .eq("id", row.business_id)
    .maybeSingle();

  if (row.status === "sent") {
    await admin
      .from("business_contracts")
      .update({ status: "viewed", updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "sent");
  }

  return NextResponse.json({
    contract: {
      publicId: row.public_id,
      title: row.title,
      counterpartyName: row.counterparty_name,
      bodyText: row.body_text,
      status: row.status === "sent" ? "viewed" : row.status,
      acceptedAt: row.accepted_at,
      acceptedName: row.accepted_name,
      businessName: biz?.trading_name || biz?.legal_name || "Business",
    },
  });
}

/** Counterparty accepts — records name + timestamp; not a full e-sign product yet. */
export async function POST(req: NextRequest, { params }: Params) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { publicId: raw } = await params;
  const publicId = raw.trim().toLowerCase();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = acceptContractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your full name to accept." }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: row } = await admin
    .from("business_contracts")
    .select("id, status, business_id")
    .eq("public_id", publicId)
    .maybeSingle();

  if (!row || row.status === "draft" || row.status === "void") {
    return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  }
  if (row.status === "accepted") {
    return NextResponse.json({ ok: true, alreadyAccepted: true });
  }
  if (row.status === "declined") {
    return NextResponse.json({ error: "This contract was declined." }, { status: 409 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const { error } = await admin
    .from("business_contracts")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_name: parsed.data.acceptedName,
      accepted_ip: ip,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logCreate("ops.contract_accepted", {
    contractId: row.id,
    businessId: row.business_id,
  });

  return NextResponse.json({ ok: true, status: "accepted" });
}
