import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { loadActiveBusinessMailContext } from "@/lib/mail/business-mail";
import { normalizeMailboxLocalPart } from "@/lib/mail/address";
import { registerMailDomain, verifyMailDomain } from "@/lib/mail/provider-domains";

export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("register_domain"),
    siteDomainId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("verify_domain"),
    mailDomainId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("create_mailbox"),
    mailDomainId: z.string().uuid(),
    localPart: z.string().trim().min(1).max(48),
    displayName: z.string().trim().min(1).max(120),
  }),
]);

async function loadBusinessDomainState(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  businessId: string,
) {
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("business_id", businessId);

  const projectIds = (projects ?? []).map((project) => project.id);
  const { data: siteDomains } = projectIds.length
    ? await supabase
        .from("site_domains")
        .select("id, project_id, hostname, status, verified, is_primary, verified_at")
        .in("project_id", projectIds)
        .eq("verified", true)
        .eq("status", "verified")
        .order("is_primary", { ascending: false })
    : { data: [] };

  const { data: mailDomains } = await supabase
    .from("mail_domains")
    .select("id, business_id, site_domain_id, domain, provider, provider_domain_id, status, dns_records, last_error, verified_at, created_at, updated_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  const { data: mailboxes } = await supabase
    .from("mailboxes")
    .select("id, business_id, mailbox_type, address, display_name, mail_domain_id, local_part, is_active, created_at")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return {
    siteDomains: siteDomains ?? [],
    mailDomains: mailDomains ?? [],
    mailboxes: mailboxes ?? [],
  };
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const context = await loadActiveBusinessMailContext(supabase, user.id);
  if (context.mode !== "business" || !context.businessId) {
    return NextResponse.json({ error: "Switch to a Business Kebu to manage business mail." }, { status: 409 });
  }

  const state = await loadBusinessDomainState(supabase, context.businessId);
  return NextResponse.json({ context, ...state });
}

export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const context = await loadActiveBusinessMailContext(supabase, user.id);
  if (context.mode !== "business" || !context.businessId) {
    return NextResponse.json({ error: "Switch to a Business Kebu first." }, { status: 409 });
  }
  if (!context.canManage) {
    return NextResponse.json({ error: "Your business role cannot manage mail settings." }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid business mail request.", issues: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.action === "register_domain") {
    const { data: projectRows } = await supabase.from("projects").select("id").eq("business_id", context.businessId);
    const projectIds = (projectRows ?? []).map((project) => project.id);
    if (!projectIds.length) return NextResponse.json({ error: "This business has no site with a verified domain." }, { status: 409 });

    const { data: siteDomain } = await supabase
      .from("site_domains")
      .select("id, project_id, hostname, status, verified")
      .eq("id", parsed.data.siteDomainId)
      .in("project_id", projectIds)
      .eq("verified", true)
      .eq("status", "verified")
      .maybeSingle();

    if (!siteDomain) {
      return NextResponse.json({ error: "That domain is not verified for this Business Kebu." }, { status: 403 });
    }

    const domain = siteDomain.hostname.toLowerCase().replace(/^www\./, "");
    const { data: existing } = await supabase
      .from("mail_domains")
      .select("*")
      .eq("business_id", context.businessId)
      .eq("domain", domain)
      .maybeSingle();
    if (existing) return NextResponse.json({ mailDomain: existing });

    let provider;
    try {
      provider = await registerMailDomain(domain);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Could not register mail domain." }, { status: 502 });
    }
    if (!provider.id) return NextResponse.json({ error: "Mail provider did not return a domain id." }, { status: 502 });

    const { data: mailDomain, error } = await supabase
      .from("mail_domains")
      .insert({
        business_id: context.businessId,
        site_domain_id: siteDomain.id,
        domain,
        provider: "resend",
        provider_domain_id: provider.id,
        status: provider.status === "verified" ? "verified" : "pending",
        dns_records: provider.records,
        verified_at: provider.status === "verified" ? new Date().toISOString() : null,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error || !mailDomain) return NextResponse.json({ error: "Could not save business mail domain." }, { status: 500 });

    await supabase.from("mail_audit_events").insert({
      business_id: context.businessId,
      actor_user_id: user.id,
      event_type: "business_mail.domain_registered",
      metadata: { domain, siteDomainId: siteDomain.id },
    });

    return NextResponse.json({ mailDomain }, { status: 201 });
  }

  if (parsed.data.action === "verify_domain") {
    const { data: mailDomain } = await supabase
      .from("mail_domains")
      .select("*")
      .eq("id", parsed.data.mailDomainId)
      .eq("business_id", context.businessId)
      .maybeSingle();

    if (!mailDomain?.provider_domain_id) return NextResponse.json({ error: "Mail domain not found." }, { status: 404 });

    try {
      const provider = await verifyMailDomain(mailDomain.provider_domain_id);
      const verified = provider.status === "verified";
      const { data: updated, error } = await supabase
        .from("mail_domains")
        .update({
          status: verified ? "verified" : provider.status === "failed" ? "failed" : "pending",
          dns_records: provider.records,
          last_error: verified ? null : "DNS records are not fully verified yet.",
          verified_at: verified ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mailDomain.id)
        .select("*")
        .single();

      if (error || !updated) return NextResponse.json({ error: "Could not update mail domain." }, { status: 500 });
      return NextResponse.json({ mailDomain: updated });
    } catch (error) {
      await supabase.from("mail_domains").update({
        status: "failed",
        last_error: error instanceof Error ? error.message.slice(0, 500) : "Provider verification failed.",
        updated_at: new Date().toISOString(),
      }).eq("id", mailDomain.id);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Domain verification failed." }, { status: 502 });
    }
  }

  const { data: mailDomain } = await supabase
    .from("mail_domains")
    .select("id, domain, status")
    .eq("id", parsed.data.mailDomainId)
    .eq("business_id", context.businessId)
    .eq("status", "verified")
    .maybeSingle();

  if (!mailDomain) return NextResponse.json({ error: "Verify the business mail domain before creating an address." }, { status: 409 });

  const localPart = normalizeMailboxLocalPart(parsed.data.localPart);
  const address = localPart + "@" + mailDomain.domain;

  const { data: mailbox, error } = await supabase
    .from("mailboxes")
    .insert({
      owner_user_id: null,
      business_id: context.businessId,
      mailbox_type: "business",
      address,
      display_name: parsed.data.displayName,
      mail_domain_id: mailDomain.id,
      local_part: localPart,
      is_active: true,
    })
    .select("*")
    .single();

  if (error?.code === "23505") return NextResponse.json({ error: "That business email address already exists." }, { status: 409 });
  if (error || !mailbox) return NextResponse.json({ error: "Could not create business mailbox." }, { status: 500 });

  await supabase.from("mail_audit_events").insert({
    mailbox_id: mailbox.id,
    business_id: context.businessId,
    actor_user_id: user.id,
    event_type: "business_mail.mailbox_created",
    metadata: { address },
  });

  return NextResponse.json({ mailbox }, { status: 201 });
}
