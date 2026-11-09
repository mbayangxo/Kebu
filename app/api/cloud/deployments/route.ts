import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { DEPLOYMENT_SLUG_PATTERN } from "@/lib/cloud/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: deployments, error } = await supabase
    .from("cloud_deployments")
    .select("id, name, slug, live_version_id, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Apply the Kebu Cloud storage migration."
          : "Could not load deployments.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    deployments: (deployments ?? []).map((d) => ({
      ...d,
      liveUrl: d.live_version_id ? `https://${d.slug}.cloud.kebu.africa` : null,
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = typeof rec.name === "string" ? rec.name.trim() : "";
  const slug = typeof rec.slug === "string" ? rec.slug.trim().toLowerCase() : "";

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Name is required (max 120 characters)." }, { status: 400 });
  }
  if (!slug || slug.length > 63 || !DEPLOYMENT_SLUG_PATTERN.test(slug)) {
    return NextResponse.json(
      { error: "Slug must be lowercase letters, numbers and dashes, and can't start or end with a dash." },
      { status: 400 },
    );
  }

  const { data: row, error } = await supabase
    .from("cloud_deployments")
    .insert({ owner_id: user.id, name, slug })
    .select("id, name, slug, live_version_id, created_at, updated_at")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message.includes("duplicate") ? "That slug is already taken." : "Could not create deployment." },
      { status: error?.message.includes("duplicate") ? 409 : 500 },
    );
  }

  logCreate("cloud.deployment_created", { userId: user.id, deploymentId: row.id, slug });
  return NextResponse.json({ deployment: { ...row, liveUrl: null } });
}
