import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { reviewInputSchema, mapReview, type ReviewRow } from "@/lib/shop/product-reviews";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

/** Public product review submission (pending moderation). */
export async function POST(req: Request, { params }: Params) {
  const { subdomain } = await params;
  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  const { data: project } = await admin
    .from("projects")
    .select("id, status")
    .eq("subdomain", subdomain)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = reviewInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  }

  const { data: product } = await admin
    .from("project_products")
    .select("id")
    .eq("id", parsed.data.productId)
    .eq("project_id", project.id)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const { data, error } = await admin
    .from("product_reviews")
    .insert({
      project_id: project.id,
      product_id: parsed.data.productId,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      reviewer_name: parsed.data.reviewerName,
      reviewer_email: parsed.data.reviewerEmail ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not submit review." }, { status: 500 });
  }

  return NextResponse.json({ review: mapReview(data as ReviewRow) }, { status: 201 });
}

export async function GET(_req: Request, { params }: Params) {
  const { subdomain } = await params;
  const url = new URL(_req.url);
  const productId = url.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId required." }, { status: 400 });

  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  const { data: project } = await admin.from("projects").select("id").eq("subdomain", subdomain).maybeSingle();
  if (!project) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  const { data, error } = await admin
    .from("product_reviews")
    .select("*")
    .eq("project_id", project.id)
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "Could not load reviews." }, { status: 500 });

  return NextResponse.json({ reviews: ((data ?? []) as ReviewRow[]).map(mapReview) });
}
