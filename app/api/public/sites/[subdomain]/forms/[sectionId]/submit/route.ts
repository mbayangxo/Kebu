import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { shopOrderRateLimit } from "@/lib/api-guard";
import { publicFormSubmitSchema, validateFormPayload } from "@/lib/create/site-forms";
import { siteFormSectionSchema } from "@/lib/create/site-forms";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { createServiceClient } from "@/lib/opportunity/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string; sectionId: string }> };

/** Public form submit on a live published site. */
export async function POST(req: Request, { params }: Params) {
  const limited = shopOrderRateLimit(req);
  if (limited) return limited;

  const { subdomain: raw, sectionId } = await params;
  const subdomain = raw.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subdomain) || subdomain.length < 3) {
    return NextResponse.json({ error: "Invalid site address." }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(sectionId)) {
    return NextResponse.json({ error: "Invalid form." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = publicFormSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: live } = await admin
    .from("deployments")
    .select("id, project_id, snapshot")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();

  if (!live?.project_id || !live.snapshot) {
    return NextResponse.json({ error: "Site is not live." }, { status: 404 });
  }

  const snapshot = live.snapshot as WebsiteDefinition;
  const section = snapshot.pages
    ?.flatMap((p) => p.sections ?? [])
    .find((s) => s.id === sectionId && s.type === "form" && s.props?.hidden !== true);

  if (!section) {
    return NextResponse.json({ error: "Form not found on this site." }, { status: 404 });
  }

  const formProps = siteFormSectionSchema.safeParse(section.props);
  if (!formProps.success) {
    return NextResponse.json({ error: "Form configuration invalid." }, { status: 500 });
  }

  const validated = validateFormPayload(formProps.data.fields, parsed.data.values);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ipHash = createHash("sha256").update(`${ip}:${subdomain}`).digest("hex").slice(0, 32);

  const submitterName =
    parsed.data.submitterName?.trim() ||
    validated.cleaned.name ||
    validated.cleaned.full_name ||
    "";
  const emailField = formProps.data.fields.find(field => field.type === "email" && validated.cleaned[field.id]);
  const submitterEmail = (emailField ? validated.cleaned[emailField.id] : undefined) || parsed.data.submitterEmail?.trim() || null;
  const submitterPhone =
    parsed.data.submitterPhone?.trim() || validated.cleaned.phone || null;

  const { data: row, error } = await admin
    .from("project_form_submissions")
    .insert({
      ...(parsed.data.submissionId ? { id: parsed.data.submissionId } : {}),
      project_id: live.project_id,
      section_id: sectionId,
      form_name: formProps.data.heading.slice(0, 120),
      payload: validated.cleaned,
      submitter_email: submitterEmail,
      submitter_name: submitterName || null,
      submitter_phone: submitterPhone,
      ip_hash: ipHash,
    })
    .select("id, created_at")
    .single();

  // A lost HTTP reply must not create a second enquiry on an unchanged retry.
  if (error?.code === "23505" && parsed.data.submissionId) {
    const { data: existing } = await admin.from("project_form_submissions")
      .select("id, created_at, payload, submitter_email, submitter_name, submitter_phone")
      .eq("id", parsed.data.submissionId).eq("project_id", live.project_id).eq("section_id", sectionId).maybeSingle();
    const samePayload = existing && Object.keys(existing.payload ?? {}).length === Object.keys(validated.cleaned).length && Object.entries(validated.cleaned).every(([key,value]) => existing.payload[key] === value);
    if (samePayload && existing.submitter_email === submitterEmail && existing.submitter_name === (submitterName || null) && existing.submitter_phone === submitterPhone) {
      return NextResponse.json({ ok: true, submissionId: existing.id, message: formProps.data.successMessage });
    }
    return NextResponse.json({ error: "This message could not be reconciled. Review your message and try again." }, { status: 409 });
  }

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message?.includes("does not exist") ? "Contact form storage is unavailable. Please contact the site owner." : "Could not save submission." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    submissionId: row.id,
    message: formProps.data.successMessage,
  });
}
