import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { mapReview, type ReviewRow } from "@/lib/shop/product-reviews";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: "Apply migration 066_remaining_slices.sql." }, { status: 500 });
  }

  return NextResponse.json({ reviews: ((data ?? []) as ReviewRow[]).map(mapReview) });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const reviewId = typeof rec.reviewId === "string" ? rec.reviewId : "";
  const status = rec.status === "approved" || rec.status === "rejected" ? rec.status : null;
  if (!reviewId || !status) {
    return NextResponse.json({ error: "reviewId and status required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("product_reviews")
    .update({ status })
    .eq("id", reviewId)
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not update review." }, { status: 500 });
  }

  return NextResponse.json({ review: mapReview(data as ReviewRow) });
}
