import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/opportunity/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const subscribeSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().max(120).optional(),
});

/** Public newsletter signup from a published Kebu Builder site. */
export async function POST(req: Request, { params }: Params) {
  const { id: projectId } = await params;
  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: project } = await admin
    .from("projects")
    .select("id, status, business_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  const { data: deployment } = await admin
    .from("deployments")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "live")
    .maybeSingle();

  if (!deployment && project.status !== "published") {
    return NextResponse.json({ error: "This site is not published yet." }, { status: 403 });
  }

  if (!project.business_id) {
    return NextResponse.json(
      { error: "This site is not linked to a Kebu business yet. Link it from your business dashboard." },
      { status: 400 },
    );
  }

  const { error } = await admin.from("business_email_subscribers").upsert(
    {
      business_id: project.business_id,
      project_id: projectId,
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name ?? null,
      source: "site",
      unsubscribed_at: null,
    },
    { onConflict: "business_id,email" },
  );

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("does not exist") ? "Apply migration 025." : "Could not save email." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
