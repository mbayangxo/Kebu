import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireCronSecret } from "@/lib/api-guard";
import { recordPlatformCronRun } from "@/lib/platform/cron-runs";
import { enrollInFlows } from "@/lib/email/automation-flows";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Cron — every 2 hours.
 * Finds open carts idle for ≥2 hours with a customer email and not yet enrolled in any
 * cart_abandoned flow. Batch-looks up business_id per project, enrolls each cart in
 * matching active flows, then marks flow_enrolled_at so they are never re-enrolled.
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const startedAt = new Date();
  let enrolled = 0;
  let skipped = 0;
  let errorMessage: string | undefined;

  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Fetch enrollable carts (open, has email, not yet enrolled, idle ≥2h)
    const { data: carts, error: cartsErr } = await supabase
      .from("shop_cart_drafts")
      .select("id, project_id, customer_email, customer_name, items")
      .eq("status", "open")
      .not("customer_email", "is", null)
      .is("flow_enrolled_at", null)
      .lt("last_seen_at", cutoff)
      .limit(100);

    if (cartsErr) {
      throw new Error(cartsErr.message);
    }

    if (!carts || carts.length === 0) {
      await recordPlatformCronRun(supabase, {
        jobName: "cart-abandonment",
        status: "ok",
        startedAt,
        summary: { enrolled: 0, skipped: 0 },
      });
      return NextResponse.json({ ok: true, enrolled: 0, skipped: 0 });
    }

    // Batch-lookup business_id for each unique project_id
    const projectIds = [...new Set(carts.map((c) => c.project_id as string).filter(Boolean))];
    const { data: projects } = await supabase
      .from("projects")
      .select("id, business_id")
      .in("id", projectIds);

    const businessByProject = new Map<string, string>();
    for (const p of projects ?? []) {
      if (p.business_id) businessByProject.set(p.id as string, p.business_id as string);
    }

    const enrolledIds: string[] = [];

    for (const cart of carts) {
      const businessId = businessByProject.get(cart.project_id as string);
      if (!businessId || !cart.customer_email) {
        skipped++;
        continue;
      }

      const itemCount = Array.isArray(cart.items)
        ? (cart.items as { quantity?: number }[]).reduce(
            (s, it) => s + (typeof it?.quantity === "number" ? it.quantity : 1),
            0,
          )
        : 0;

      await enrollInFlows(supabase, {
        businessId,
        trigger: "cart_abandoned",
        email: cart.customer_email as string,
        context: {
          subscriberName: (cart.customer_name as string | null) ?? undefined,
          cartTotal: `${itemCount} article${itemCount !== 1 ? "s" : ""}`,
        },
      });

      enrolledIds.push(cart.id as string);
      enrolled++;
    }

    // Mark all enrolled carts so they are never re-processed
    if (enrolledIds.length > 0) {
      await supabase
        .from("shop_cart_drafts")
        .update({ flow_enrolled_at: new Date().toISOString() })
        .in("id", enrolledIds);
    }

    await recordPlatformCronRun(supabase, {
      jobName: "cart-abandonment",
      status: "ok",
      startedAt,
      summary: { enrolled, skipped },
    });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    const supabase2 = createClient(supabaseUrl, serviceKey);
    await recordPlatformCronRun(supabase2, {
      jobName: "cart-abandonment",
      status: "error" as const,
      startedAt,
      errorMessage,
      summary: { enrolled, skipped },
    });
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }

  return NextResponse.json({ ok: true, enrolled, skipped });
}
