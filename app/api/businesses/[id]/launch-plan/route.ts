import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { assertBusinessManager } from "@/lib/business/assert-manager";
import {
  defaultAgencyLaunchChecklist,
  upsertLaunchPlanSchema,
} from "@/lib/business/ops-docs";

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
    .from("business_launch_plans")
    .select(
      "id, title, status, checklist, popup_heading, popup_body, popup_cta, updated_at, created_at",
    )
    .eq("business_id", businessId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Launch plans missing. Apply migration 053_business_invoices_contracts.sql."
          : "Could not load launch plan.",
      },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({
      plan: null,
      defaults: {
        checklist: defaultAgencyLaunchChecklist(),
        popupHeading: "We're launching soon",
        popupBody: "Leave your email for early access, tickets, or the drop.",
        popupCta: "Join the list",
      },
    });
  }

  return NextResponse.json({ plan: data });
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

  const parsed = upsertLaunchPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid launch plan." }, { status: 400 });
  }

  const input = parsed.data;
  const { data: existing } = await supabase
    .from("business_launch_plans")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "active")
    .maybeSingle();

  const row = {
    title: input.title ?? "Launch plan",
    status: input.status ?? "active",
    checklist: input.checklist ?? defaultAgencyLaunchChecklist(),
    popup_heading: input.popupHeading ?? "We're launching soon",
    popup_body: input.popupBody ?? "Leave your email for early access.",
    popup_cta: input.popupCta ?? "Join the list",
    updated_at: new Date().toISOString(),
  };

  let plan;
  if (existing?.id) {
    const { data, error } = await supabase
      .from("business_launch_plans")
      .update(row)
      .eq("id", existing.id)
      .select(
        "id, title, status, checklist, popup_heading, popup_body, popup_cta, updated_at",
      )
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
    }
    plan = data;
  } else {
    const { data, error } = await supabase
      .from("business_launch_plans")
      .insert({ business_id: businessId, ...row })
      .select(
        "id, title, status, checklist, popup_heading, popup_body, popup_cta, updated_at",
      )
      .single();
    if (error || !data) {
      return NextResponse.json(
        {
          error: error?.message.includes("does not exist")
            ? "Launch plans missing. Apply migration 053."
            : error?.message ?? "Create failed.",
        },
        { status: 500 },
      );
    }
    plan = data;
  }

  logCreate("ops.launch_plan_saved", { businessId, planId: plan.id, userId: user.id });
  return NextResponse.json({ plan });
}
