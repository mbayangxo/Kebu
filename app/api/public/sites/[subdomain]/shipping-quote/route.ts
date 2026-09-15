import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/opportunity/admin";
import {
  quoteShippingCorridor,
  shippingDestinationOptions,
  type ShippingQuote,
} from "@/lib/shop/shipping-corridors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

const querySchema = z.object({
  to: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  from: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  goodsValueXof: z.coerce.number().int().min(0).max(100_000_000).optional(),
});

/**
 * Public shipping quote for a live storefront.
 * ECOWAS corridor table v2 — honest estimates, not live carrier booking or legal advice.
 */
export async function GET(req: Request, { params }: Params) {
  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subdomain) || subdomain.length < 3) {
    return NextResponse.json({ error: "Invalid site address." }, { status: 400 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    to: url.searchParams.get("to") ?? "",
    from: url.searchParams.get("from") ?? undefined,
    goodsValueXof: url.searchParams.get("goodsValueXof") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Need ?to=GH (ISO country)." }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: live } = await admin
    .from("deployments")
    .select("project_id")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();

  if (!live?.project_id) {
    return NextResponse.json({ error: "Site is not live." }, { status: 404 });
  }

  const { data: project } = await admin
    .from("projects")
    .select("id, country_code, title")
    .eq("id", live.project_id)
    .maybeSingle();

  const sellerCountry =
    parsed.data.from ||
    (typeof project?.country_code === "string" && project.country_code.trim()
      ? project.country_code.trim().toUpperCase()
      : "SN");

  const quote: ShippingQuote | null = quoteShippingCorridor({
    fromCountry: sellerCountry,
    toCountry: parsed.data.to,
    goodsValueXof: parsed.data.goodsValueXof,
  });

  return NextResponse.json({
    sellerCountry,
    destinations: shippingDestinationOptions(sellerCountry),
    quote,
    unsupported: !quote
      ? `No corridor quote for ${sellerCountry}→${parsed.data.to} in the current table. Contact Kebu to request this route.`
      : null,
    honestNote:
      "Estimates from Kebu corridor table v1 — not a booked shipment. Duties may apply; not legal advice.",
  });
}
