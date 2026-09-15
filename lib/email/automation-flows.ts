/**
 * Email automation flows — Klaviyo-style triggered sequences.
 * Enrollment: call enrollInFlows() when a trigger fires (subscribe / order_placed / cart_abandoned).
 * Processing: called by the hourly cron /api/cron/process-email-flows.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCampaignEmail } from "@/lib/email/send-campaign";

export type FlowTrigger = "subscribe" | "order_placed" | "cart_abandoned";

export type FlowEnrollContext = {
  subscriberName?: string;
  subscriberId?: string;
  orderTotal?: string;
  productName?: string;
  cartTotal?: string;
};

type FlowRow = {
  id: string;
  name: string;
  trigger_type: FlowTrigger;
  status: string;
  from_email: string;
  from_name: string;
  reply_to: string | null;
};

type StepRow = {
  id: string;
  flow_id: string;
  sort_order: number;
  delay_hours: number;
  subject: string;
  body_html: string;
  body_text: string;
};

/**
 * Enroll a subscriber in all active flows matching the trigger.
 * Safe to call multiple times — the unique constraint on (flow_id, subscriber_email)
 * means duplicate enrollments are silently ignored.
 */
export async function enrollInFlows(
  supabase: SupabaseClient,
  opts: {
    businessId: string;
    trigger: FlowTrigger;
    email: string;
    context?: FlowEnrollContext;
  },
): Promise<void> {
  const { businessId, trigger, email, context = {} } = opts;

  // Get active flows for this trigger
  const { data: flows } = await supabase
    .from("email_flows")
    .select("id, from_email")
    .eq("business_id", businessId)
    .eq("trigger_type", trigger)
    .eq("status", "active");

  if (!flows?.length) return;

  for (const flow of flows) {
    // Get step 0 to know the initial delay
    const { data: step0 } = await supabase
      .from("email_flow_steps")
      .select("delay_hours")
      .eq("flow_id", flow.id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!step0) continue; // flow has no steps, skip

    const delayMs = (step0.delay_hours ?? 0) * 60 * 60 * 1000;
    const nextStepAt = new Date(Date.now() + delayMs).toISOString();

    await supabase.from("email_flow_enrollments").upsert(
      {
        flow_id: flow.id,
        business_id: businessId,
        subscriber_email: email.toLowerCase(),
        subscriber_name: context.subscriberName ?? null,
        subscriber_id: context.subscriberId ?? null,
        next_step_index: 0,
        next_step_at: nextStepAt,
        status: "active",
        context: context as Record<string, unknown>,
        enrolled_at: new Date().toISOString(),
      },
      { onConflict: "flow_id,subscriber_email", ignoreDuplicates: true },
    );
  }
}

export type ProcessResult = {
  processed: number;
  sent: number;
  failed: number;
  completed: number;
  errors: string[];
};

/**
 * Process all due enrollments — called by the hourly cron job.
 * Sends the current step's email and advances to the next step.
 */
export async function processEmailFlows(
  supabase: SupabaseClient,
): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, sent: 0, failed: 0, completed: 0, errors: [] };
  const now = new Date().toISOString();

  // Fetch due enrollments (process up to 200 per cron run)
  const { data: due, error: dueErr } = await supabase
    .from("email_flow_enrollments")
    .select(
      "id, flow_id, business_id, subscriber_email, subscriber_name, next_step_index, context",
    )
    .eq("status", "active")
    .lte("next_step_at", now)
    .order("next_step_at", { ascending: true })
    .limit(200);

  if (dueErr) {
    result.errors.push(`Query failed: ${dueErr.message}`);
    return result;
  }
  if (!due?.length) return result;

  // Fetch all referenced flows in one shot
  const flowIds = [...new Set(due.map((e) => e.flow_id as string))];
  const { data: flows } = await supabase
    .from("email_flows")
    .select("id, name, status, from_email, from_name, reply_to")
    .in("id", flowIds);
  const flowMap = new Map<string, FlowRow>((flows ?? []).map((f) => [f.id as string, f as FlowRow]));

  // Fetch all steps for those flows in one shot
  const { data: allSteps } = await supabase
    .from("email_flow_steps")
    .select("id, flow_id, sort_order, delay_hours, subject, body_html, body_text")
    .in("flow_id", flowIds)
    .order("sort_order", { ascending: true });
  const stepsByFlow = new Map<string, StepRow[]>();
  for (const s of allSteps ?? []) {
    const list = stepsByFlow.get(s.flow_id as string) ?? [];
    list.push(s as StepRow);
    stepsByFlow.set(s.flow_id as string, list);
  }

  for (const enrollment of due) {
    result.processed++;
    const flow = flowMap.get(enrollment.flow_id as string);
    if (!flow || flow.status !== "active") {
      await supabase
        .from("email_flow_enrollments")
        .update({ status: "failed" })
        .eq("id", enrollment.id);
      result.failed++;
      continue;
    }

    if (!flow.from_email) {
      result.errors.push(`${enrollment.id}: flow ${flow.id} has no from_email`);
      result.failed++;
      continue;
    }

    const steps = stepsByFlow.get(enrollment.flow_id as string) ?? [];
    const stepIndex = enrollment.next_step_index as number;
    const step = steps[stepIndex];

    if (!step) {
      // No more steps — mark completed
      await supabase
        .from("email_flow_enrollments")
        .update({ status: "completed" })
        .eq("id", enrollment.id);
      result.completed++;
      continue;
    }

    // Personalise subject + body
    const ctx = (enrollment.context as Record<string, string | undefined>) ?? {};
    const recipientName = (enrollment.subscriber_name as string | null) ?? "";
    const subject = personalise(step.subject, recipientName, ctx);
    const bodyHtml = personalise(step.body_html, recipientName, ctx);
    const bodyText = personalise(step.body_text, recipientName, ctx);

    const ok = await sendCampaignEmail({
      to: enrollment.subscriber_email as string,
      from: flow.from_email,
      fromName: flow.from_name || undefined,
      replyTo: flow.reply_to ?? undefined,
      subject,
      html: bodyHtml || `<p>${subject}</p>`,
      text: bodyText || undefined,
    });

    if (!ok) {
      result.failed++;
      result.errors.push(`${enrollment.id}: email delivery failed for ${enrollment.subscriber_email}`);
      // Don't mark failed permanently — retry next cron run (leave next_step_at as is)
      continue;
    }

    result.sent++;

    // Advance to next step
    const nextIndex = stepIndex + 1;
    const nextStep = steps[nextIndex];

    if (!nextStep) {
      await supabase
        .from("email_flow_enrollments")
        .update({ status: "completed" })
        .eq("id", enrollment.id);
      result.completed++;
    } else {
      const nextAt = new Date(Date.now() + nextStep.delay_hours * 60 * 60 * 1000).toISOString();
      await supabase
        .from("email_flow_enrollments")
        .update({ next_step_index: nextIndex, next_step_at: nextAt })
        .eq("id", enrollment.id);
    }
  }

  return result;
}

function personalise(
  template: string,
  name: string,
  ctx: Record<string, string | undefined>,
): string {
  return template
    .replace(/\{\{name\}\}/gi, name || "there")
    .replace(/\{\{order_total\}\}/gi, ctx.orderTotal ?? "")
    .replace(/\{\{product_name\}\}/gi, ctx.productName ?? "")
    .replace(/\{\{cart_total\}\}/gi, ctx.cartTotal ?? "");
}
