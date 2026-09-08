/**
 * Shop commerce intelligence — patterns from real Supabase rows only.
 * Insight shape: WHAT HAPPENED → WHY IT MATTERS → WHAT TO DO NEXT.
 * Never invents charts from hard-coded production numbers.
 */

export type CommerceOrderInput = {
  id: string;
  product_name: string | null;
  quantity: number;
  payment_status: string | null;
  payment_preference: string | null;
  status: string | null;
  amount_xof: number | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_user_id: string | null;
  discount_code: string | null;
  channel?: string | null;
  created_at: string;
};

export type CommerceDraftInput = {
  id: string;
  status: string;
  last_seen_at: string;
  customer_email: string | null;
  customer_phone: string | null;
};

export type CommerceInsight = {
  id: string;
  severity: "info" | "watch" | "act";
  confidence: "low" | "moderate" | "high";
  what: string;
  why: string;
  next: string;
  href?: string;
};

export type CommerceAnalyticsSummary = {
  rangeDays: number;
  generatedAt: string;
  orders: {
    total: number;
    paid: number;
    awaitingPayment: number;
    unpaid: number;
    pendingFulfillment: number;
    contactedOrDone: number;
    revenuePaidXof: number;
    revenueAtRiskXof: number;
    withDiscount: number;
  };
  byDay: Array<{ day: string; orders: number; paid: number }>;
  paymentMix: Array<{ preference: string; count: number; pct: number }>;
  topProducts: Array<{ name: string; units: number; orders: number }>;
  customers: {
    uniqueKeys: number;
    repeatKeys: number;
  };
  carts: {
    openAbandoned: number;
    convertedInRange: number;
    recoveredInRange: number;
  };
  traffic: {
    pageviews: number | null;
    /** orders / pageviews when both known; null if not enough data */
    orderPerView: number | null;
    funnel?: {
      productViews: number;
      addToCart: number;
      checkoutStart: number;
      purchases: number;
    };
  };
  /** Where orders came from (channel column + payment preference fallback). */
  orderSources: Array<{ source: string; count: number; pct: number }>;
  /** Visitor geography / referrer from pageview meta (honest — empty until tracked). */
  visitorSources: {
    countries: Array<{ country: string; count: number; pct: number }>;
    referrers: Array<{ referrer: string; count: number; pct: number }>;
    devices: Array<{ device: string; count: number; pct: number }>;
  };
  insights: CommerceInsight[];
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function customerKey(o: CommerceOrderInput): string | null {
  if (o.customer_user_id) return `u:${o.customer_user_id}`;
  const email = o.customer_email?.trim().toLowerCase();
  if (email) return `e:${email}`;
  const phone = o.customer_phone?.replace(/\D/g, "");
  if (phone && phone.length >= 8) return `p:${phone}`;
  return null;
}

function confidenceFromN(n: number): CommerceInsight["confidence"] {
  if (n >= 30) return "high";
  if (n >= 8) return "moderate";
  return "low";
}

/** Pure pattern engine — unit-tested; no DB. */
export function buildCommerceAnalytics(opts: {
  rangeDays: number;
  orders: CommerceOrderInput[];
  drafts: CommerceDraftInput[];
  pageviews?: number | null;
  funnel?: {
    productViews?: number;
    addToCart?: number;
    checkoutStart?: number;
    purchases?: number;
  };
  /** Aggregated from site_analytics_events pageviews meta */
  visitorBuckets?: {
    countries?: Record<string, number>;
    referrers?: Record<string, number>;
    devices?: Record<string, number>;
  };
  projectId: string;
  now?: Date;
}): CommerceAnalyticsSummary {
  const now = opts.now ?? new Date();
  const sinceMs = now.getTime() - opts.rangeDays * 24 * 60 * 60 * 1000;
  const orders = opts.orders.filter((o) => new Date(o.created_at).getTime() >= sinceMs);
  const drafts = opts.drafts;

  let paid = 0;
  let awaiting = 0;
  let unpaid = 0;
  let pending = 0;
  let contacted = 0;
  let revenuePaid = 0;
  let revenueRisk = 0;
  let withDiscount = 0;

  const dayMap = new Map<string, { orders: number; paid: number }>();
  const payMap = new Map<string, number>();
  const channelMap = new Map<string, number>();
  const productMap = new Map<string, { units: number; orders: number }>();
  const custMap = new Map<string, number>();

  for (const o of orders) {
    const ps = o.payment_status || "unpaid";
    if (ps === "paid") {
      paid += 1;
      revenuePaid += Math.max(0, o.amount_xof ?? 0);
    } else if (ps === "awaiting_payment") {
      awaiting += 1;
      revenueRisk += Math.max(0, o.amount_xof ?? 0);
    } else {
      unpaid += 1;
      revenueRisk += Math.max(0, o.amount_xof ?? 0);
    }

    const st = o.status || "pending";
    if (st === "pending") pending += 1;
    else contacted += 1;

    if (o.discount_code) withDiscount += 1;

    const day = dayKey(o.created_at);
    const d = dayMap.get(day) ?? { orders: 0, paid: 0 };
    d.orders += 1;
    if (ps === "paid") d.paid += 1;
    dayMap.set(day, d);

    const pref = o.payment_preference || "whatsapp";
    payMap.set(pref, (payMap.get(pref) ?? 0) + 1);

    const ch = (o.channel || "").trim() || (pref === "whatsapp" ? "whatsapp" : "web");
    channelMap.set(ch, (channelMap.get(ch) ?? 0) + 1);

    const name = (o.product_name || "Unknown").trim() || "Unknown";
    const p = productMap.get(name) ?? { units: 0, orders: 0 };
    p.units += Math.max(1, o.quantity || 1);
    p.orders += 1;
    productMap.set(name, p);

    const ck = customerKey(o);
    if (ck) custMap.set(ck, (custMap.get(ck) ?? 0) + 1);
  }

  const total = orders.length;
  const paymentMix = [...payMap.entries()]
    .map(([preference, count]) => ({
      preference,
      count,
      pct: total ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const orderSources = [...channelMap.entries()]
    .map(([source, count]) => ({
      source,
      count,
      pct: total ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  function pctBuckets(map: Record<string, number> | undefined) {
    const entries = Object.entries(map ?? {});
    const sum = entries.reduce((a, [, n]) => a + n, 0);
    return entries
      .map(([k, count]) => ({
        key: k,
        count,
        pct: sum ? Math.round((count / sum) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }
  const vb = opts.visitorBuckets ?? {};
  const visitorSources = {
    countries: pctBuckets(vb.countries).map(({ key, count, pct }) => ({
      country: key,
      count,
      pct,
    })),
    referrers: pctBuckets(vb.referrers).map(({ key, count, pct }) => ({
      referrer: key,
      count,
      pct,
    })),
    devices: pctBuckets(vb.devices).map(({ key, count, pct }) => ({
      device: key,
      count,
      pct,
    })),
  };

  const topProducts = [...productMap.entries()]
    .map(([name, v]) => ({ name, units: v.units, orders: v.orders }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 8);

  const byDay = [...dayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, v]) => ({ day, orders: v.orders, paid: v.paid }));

  const uniqueKeys = custMap.size;
  const repeatKeys = [...custMap.values()].filter((n) => n >= 2).length;

  const openAbandoned = drafts.filter((d) => d.status === "open").length;
  const convertedInRange = drafts.filter((d) => d.status === "converted").length;
  const recoveredInRange = drafts.filter((d) => d.status === "recovered").length;

  const pageviews = opts.pageviews ?? null;
  const orderPerView =
    pageviews != null && pageviews > 0 ? Math.round((total / pageviews) * 10000) / 10000 : null;

  const insights = deriveInsights({
    projectId: opts.projectId,
    total,
    paid,
    awaiting,
    unpaid,
    pending,
    revenuePaid,
    revenueRisk,
    withDiscount,
    paymentMix,
    topProducts,
    uniqueKeys,
    repeatKeys,
    openAbandoned,
    convertedInRange,
    pageviews,
    orderPerView,
    byDay,
  });

  return {
    rangeDays: opts.rangeDays,
    generatedAt: now.toISOString(),
    orders: {
      total,
      paid,
      awaitingPayment: awaiting,
      unpaid,
      pendingFulfillment: pending,
      contactedOrDone: contacted,
      revenuePaidXof: revenuePaid,
      revenueAtRiskXof: revenueRisk,
      withDiscount,
    },
    byDay,
    paymentMix,
    topProducts,
    customers: { uniqueKeys, repeatKeys },
    carts: {
      openAbandoned,
      convertedInRange,
      recoveredInRange,
    },
    traffic: {
      pageviews,
      orderPerView,
      funnel: opts.funnel
        ? {
            productViews: opts.funnel.productViews ?? 0,
            addToCart: opts.funnel.addToCart ?? 0,
            checkoutStart: opts.funnel.checkoutStart ?? 0,
            purchases: opts.funnel.purchases ?? paid,
          }
        : undefined,
    },
    orderSources,
    visitorSources,
    insights,
  };
}

function deriveInsights(s: {
  projectId: string;
  total: number;
  paid: number;
  awaiting: number;
  unpaid: number;
  pending: number;
  revenuePaid: number;
  revenueRisk: number;
  withDiscount: number;
  paymentMix: Array<{ preference: string; count: number; pct: number }>;
  topProducts: Array<{ name: string; units: number }>;
  uniqueKeys: number;
  repeatKeys: number;
  openAbandoned: number;
  convertedInRange: number;
  pageviews: number | null;
  orderPerView: number | null;
  byDay: Array<{ day: string; orders: number }>;
}): CommerceInsight[] {
  const out: CommerceInsight[] = [];
  const conf = confidenceFromN(s.total);
  const shop = `/shop/${s.projectId}`;

  if (s.total === 0) {
    out.push({
      id: "no_orders",
      severity: "info",
      confidence: "low",
      what: "No orders in this period yet.",
      why: "Patterns need real checkouts — empty charts would be fake.",
      next: "Share your live shop link, confirm products have prices, and turn on at least one pay method.",
      href: `${shop}?tab=products`,
    });
    if (s.openAbandoned > 0) {
      out.push({
        id: "drafts_without_orders",
        severity: "act",
        confidence: "moderate",
        what: `${s.openAbandoned} open cart${s.openAbandoned === 1 ? "" : "s"} never finished checkout.`,
        why: "People started buying but did not place an order — recovery can still win the sale.",
        next: "Open Abandoned and message or email those shoppers.",
        href: `${shop}?tab=abandoned`,
      });
    }
    return out;
  }

  if (s.awaiting + s.unpaid > 0 && s.revenueRisk > 0) {
    out.push({
      id: "unpaid_risk",
      severity: "act",
      confidence: conf,
      what: `${s.awaiting + s.unpaid} order${s.awaiting + s.unpaid === 1 ? "" : "s"} still unpaid (~${s.revenueRisk.toLocaleString()} XOF at risk).`,
      why: "Money is not confirmed until webhook/capture or you confirm on WhatsApp — unpaid orders clog fulfillment.",
      next: "Check Orders → Money status, follow up on WhatsApp, or finish live payment setup.",
      href: `${shop}?tab=orders`,
    });
  }

  if (s.paid > 0 && s.paid / s.total >= 0.5) {
    out.push({
      id: "paid_strength",
      severity: "info",
      confidence: conf,
      what: `${s.paid} of ${s.total} orders marked paid (${Math.round((s.paid / s.total) * 100)}%).`,
      why: "Verified payment share is a core health signal for your shop — and later for business score inputs.",
      next: "Keep payment adapters + product XOF prices accurate so paid status stays trustworthy.",
      href: `${shop}?tab=payments`,
    });
  } else if (s.total >= 3 && s.paid === 0) {
    out.push({
      id: "zero_paid",
      severity: "watch",
      confidence: conf,
      what: "Orders exist but none are Money: paid yet.",
      why: "Either customers pay offline (WhatsApp/COD) or live checkout is not completing.",
      next: "If you use WhatsApp pay, mark fulfillment honestly; if you want auto-paid, configure JOKO/PayPal/Wave/Paystack.",
      href: `${shop}?tab=payments`,
    });
  }

  if (s.pending >= 3 && s.pending / s.total >= 0.4) {
    out.push({
      id: "fulfillment_backlog",
      severity: "act",
      confidence: conf,
      what: `${s.pending} orders still pending fulfillment.`,
      why: "Slow follow-up hurts trust and repeat buys — reliability matters more than vanity traffic.",
      next: "Work the Orders tab: contact customers, update status when you ship or hand over.",
      href: `${shop}?tab=orders`,
    });
  }

  if (s.openAbandoned >= 2) {
    out.push({
      id: "abandonment",
      severity: "act",
      confidence: confidenceFromN(s.openAbandoned + s.convertedInRange),
      what: `${s.openAbandoned} abandoned cart${s.openAbandoned === 1 ? "" : "s"} waiting.`,
      why: "Cart drafts show intent; leaving them idle wastes demand you already earned.",
      next: "Recover via WhatsApp/email from Abandoned — offer a code only if it fits your margins.",
      href: `${shop}?tab=abandoned`,
    });
  }

  const top = s.topProducts[0];
  if (top && top.units >= 2) {
    out.push({
      id: "hero_product",
      severity: "info",
      confidence: conf,
      what: `“${top.name}” leads with ${top.units} unit${top.units === 1 ? "" : "s"} ordered.`,
      why: "Concentration in one SKU is a demand pattern — stock and ads should follow it.",
      next: "Keep stock accurate on that product; feature it on your home/shop page.",
      href: `${shop}?tab=products`,
    });
  }

  if (s.repeatKeys >= 1) {
    out.push({
      id: "repeat_buyers",
      severity: "info",
      confidence: confidenceFromN(s.uniqueKeys),
      what: `${s.repeatKeys} customer${s.repeatKeys === 1 ? "" : "s"} ordered more than once (${s.uniqueKeys} identified).`,
      why: "Repeat behavior is stronger than one-off traffic — loyalty compounds revenue.",
      next: "Message them from Customers / Messages; consider a small loyalty code.",
      href: `${shop}?tab=customers`,
    });
  }

  const wa = s.paymentMix.find((p) => p.preference === "whatsapp");
  if (wa && wa.pct >= 60 && s.total >= 5) {
    out.push({
      id: "whatsapp_heavy",
      severity: "watch",
      confidence: conf,
      what: `${wa.pct}% of orders prefer WhatsApp.`,
      why: "Chat-first commerce is African-native — but paid verification stays manual unless you add adapters.",
      next: "Keep WhatsApp sharp, and offer Wave/JOKO/card for shoppers who want instant pay.",
      href: `${shop}?tab=payments`,
    });
  }

  if (s.pageviews != null && s.pageviews >= 20 && s.orderPerView != null) {
    const pct = Math.round(s.orderPerView * 10000) / 100;
    if (pct < 0.5) {
      out.push({
        id: "low_conversion",
        severity: "watch",
        confidence: confidenceFromN(s.pageviews),
        what: `About ${pct}% of visits became an order (${s.total} orders / ${s.pageviews} views).`,
        why: "Traffic without checkout means friction: price clarity, trust, or pay methods.",
        next: "Simplify Place order, show prices in XOF, and test mobile checkout yourself.",
        href: `${shop}?tab=pages`,
      });
    } else {
      out.push({
        id: "healthy_conversion",
        severity: "info",
        confidence: confidenceFromN(s.pageviews),
        what: `Rough conversion ~${pct}% (orders ÷ pageviews).`,
        why: "This is a proxy from real beacons + orders — not a fake industry benchmark.",
        next: "Protect what works: keep load fast and payment options honest.",
      });
    }
  }

  if (s.withDiscount > 0 && s.withDiscount / s.total >= 0.3) {
    out.push({
      id: "discount_heavy",
      severity: "watch",
      confidence: conf,
      what: `${Math.round((s.withDiscount / s.total) * 100)}% of orders used a discount code.`,
      why: "Heavy discount reliance can hide weak pricing — fine for launches, risky as a habit.",
      next: "Review Discounts: cap uses, expire old codes, track margin on top SKUs.",
      href: `${shop}?tab=discounts`,
    });
  }

  // Momentum: compare last 3 days vs previous 3 in range
  if (s.byDay.length >= 4) {
    const recent = s.byDay.slice(-3).reduce((a, d) => a + d.orders, 0);
    const prior = s.byDay.slice(-6, -3).reduce((a, d) => a + d.orders, 0);
    if (prior > 0 && recent >= prior * 1.5) {
      out.push({
        id: "momentum_up",
        severity: "info",
        confidence: "moderate",
        what: `Orders rose recently (${recent} in last 3 days vs ${prior} before).`,
        why: "Short-term lift is a behavior pattern — reinforce the channel that drove it.",
        next: "Note what you changed (post, price, WhatsApp blast) and repeat it.",
      });
    } else if (prior >= 3 && recent === 0) {
      out.push({
        id: "momentum_down",
        severity: "watch",
        confidence: "moderate",
        what: `Orders slowed (0 in last 3 days vs ${prior} just before).`,
        why: "Silence after activity often means forgotten follow-ups or a broken live site.",
        next: "Open the live site, place a test order, and nudge warm customers.",
        href: `${shop}?tab=orders`,
      });
    }
  }

  return out.slice(0, 8);
}

export function formatXof(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 XOF";
  return `${Math.round(n).toLocaleString()} XOF`;
}
