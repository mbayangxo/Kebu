import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { createDesignCanvasSchema } from "@/lib/create/create-designs";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const campaignSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().trim().min(1).max(50000),
  bodyText: z.string().trim().max(20000).optional(),
  fromName: z.string().trim().max(120).optional(),
  createDesignId: z.string().uuid().optional().nullable(),
});

function designBlockFromCanvas(canvas: z.infer<typeof createDesignCanvasSchema>): string {
  const img = canvas.imageUrl
    ? `<p style="margin:16px 0"><img src="${canvas.imageUrl}" alt="" style="max-width:100%;border-radius:12px"/></p>`
    : "";
  return `<div style="background:${canvas.backgroundColor};color:#fff;padding:28px 20px;text-align:center;border-radius:16px;margin:0 0 24px">
    <p style="margin:0 0 8px;font-size:12px;opacity:0.85;text-transform:uppercase;letter-spacing:0.12em">${canvas.businessName}</p>
    <h2 style="margin:0 0 12px;font-size:28px;line-height:1.2">${canvas.headline}</h2>
    <p style="margin:0 0 16px;font-size:16px;opacity:0.9">${canvas.subheadline}</p>
    ${img}
    <p style="margin:16px 0 0"><span style="display:inline-block;background:${canvas.accentColor};color:#fff;padding:10px 20px;border-radius:999px;font-weight:700">${canvas.cta}</span></p>
  </div>`;
}

async function assertManager(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  businessId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data && ["founder", "administrator", "store_manager"].includes(data.role));
}

/** List email campaigns for a business. */
export async function GET(_req: Request, { params }: Params) {
  const { id: businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!(await assertManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("business_email_campaigns")
    .select("id, subject, status, recipient_count, sent_at, create_design_id, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("does not exist") ? "Apply migration 025." : "Could not load campaigns." },
      { status: 500 },
    );
  }

  return NextResponse.json({ campaigns: data ?? [] });
}

/** Create a draft email campaign (optionally embed a Kebu Create design). */
export async function POST(req: Request, { params }: Params) {
  const { id: businessId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!(await assertManager(supabase, businessId, user.id))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = campaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid campaign.", issues: parsed.error.flatten() }, { status: 400 });
  }

  let bodyHtml = parsed.data.bodyHtml;
  let createDesignId = parsed.data.createDesignId ?? null;

  if (createDesignId) {
    const { data: design } = await supabase
      .from("create_designs")
      .select("id, canvas, business_id")
      .eq("id", createDesignId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!design) {
      return NextResponse.json({ error: "Kebu Create design not found." }, { status: 404 });
    }
    if (design.business_id && design.business_id !== businessId) {
      return NextResponse.json({ error: "Design belongs to another business." }, { status: 403 });
    }

    const canvas = createDesignCanvasSchema.parse(design.canvas ?? {});
    bodyHtml = `${designBlockFromCanvas(canvas)}${bodyHtml}`;
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("trading_name, legal_name")
    .eq("id", businessId)
    .maybeSingle();

  const fromName =
    parsed.data.fromName?.trim() ||
    business?.trading_name ||
    business?.legal_name ||
    "Your business";

  const { data, error } = await supabase
    .from("business_email_campaigns")
    .insert({
      business_id: businessId,
      create_design_id: createDesignId,
      subject: parsed.data.subject,
      body_html: bodyHtml,
      body_text: parsed.data.bodyText ?? "",
      from_name: fromName,
      status: "draft",
      created_by: user.id,
    })
    .select("id, subject, status, create_design_id, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("does not exist") ? "Apply migration 025." : "Could not create campaign." },
      { status: 500 },
    );
  }

  return NextResponse.json({ campaign: data });
}
