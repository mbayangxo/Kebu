import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { resolveSupportAuthorization } from "@/lib/create/support-access";
import { createServiceClient } from "@/lib/opportunity/admin";
import { registerMailDomain, verifyMailDomain } from "@/lib/mail/provider-domains";

export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("register"), domain: z.string().trim().toLowerCase() }),
  z.object({ action: z.literal("verify"), domain: z.string().trim().toLowerCase() }),
]);

/**
 * Pushes a Kebu-operated mail domain (e.g. the personal-mail platform
 * domain kebu.africa) through Resend's real domain registration and
 * verification API — the one piece business domains already had
 * (app/api/mail/business/route.ts) that the personal/platform domain
 * never got. Admin-gated: this changes shared infrastructure, not a
 * single business's own mailbox.
 *
 * This route does the real API calls once given real credentials
 * (RESEND_API_KEY) and control of the domain's DNS to publish the
 * records Resend returns — neither of which this route can supply on
 * its own. Until then, "register" and "verify" fail the same way any
 * other unconfigured-provider call does (see lib/mail/provider-domains.ts).
 */
async function requireMailAdmin() {
  const auth = await requireUser();
  if ("error" in auth) return { error: auth.error };
  const service = createServiceClient();
  if (!service) return { error: NextResponse.json({ error: "Service database client unavailable." }, { status: 503 }) };
  let authorization;
  try {
    authorization = await resolveSupportAuthorization(service, auth.user);
  } catch {
    return { error: NextResponse.json({ error: "Could not verify admin authorization." }, { status: 503 }) };
  }
  if (authorization?.role !== "admin") {
    return { error: NextResponse.json({ error: "Only Kebu platform admins can manage mail domains." }, { status: 403 }) };
  }
  return { service, userId: auth.user.id };
}

export async function GET() {
  const auth = await requireMailAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.service
    .from("mail_platform_domains")
    .select("domain, purpose, provider, provider_domain_id, status, sending_enabled, inbound_enabled, reputation_status, dns_records, last_error, verified_at, updated_at")
    .order("domain", { ascending: true });

  if (error) return NextResponse.json({ error: "Could not load platform mail domains." }, { status: 500 });
  return NextResponse.json({ domains: data ?? [] });
}

export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireMailAdmin();
  if ("error" in auth) return auth.error;
  const { service, userId } = auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request.", issues: parsed.error.flatten() }, { status: 400 });

  const { data: platformDomain } = await service
    .from("mail_platform_domains")
    .select("*")
    .eq("domain", parsed.data.domain)
    .maybeSingle();
  if (!platformDomain) return NextResponse.json({ error: "Unknown platform mail domain." }, { status: 404 });

  if (parsed.data.action === "register") {
    if (platformDomain.provider_domain_id) return NextResponse.json({ platformDomain });

    let provider;
    try {
      provider = await registerMailDomain(parsed.data.domain);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Could not register mail domain." }, { status: 502 });
    }
    if (!provider.id) return NextResponse.json({ error: "Mail provider did not return a domain id." }, { status: 502 });

    const { data: updated, error } = await service
      .from("mail_platform_domains")
      .update({
        provider_domain_id: provider.id,
        status: provider.status === "verified" ? "verified" : "pending",
        dns_records: provider.records,
        sending_enabled: provider.status === "verified",
        inbound_enabled: provider.status === "verified",
        verified_at: provider.status === "verified" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("domain", parsed.data.domain)
      .select("*")
      .single();

    if (error || !updated) return NextResponse.json({ error: "Could not save platform mail domain." }, { status: 500 });

    await service.from("mail_audit_events").insert({
      mailbox_id: null,
      business_id: null,
      actor_user_id: userId,
      event_type: "platform_mail.domain_registered",
      metadata: { domain: parsed.data.domain },
    });

    return NextResponse.json({ platformDomain: updated }, { status: 201 });
  }

  if (!platformDomain.provider_domain_id) return NextResponse.json({ error: "Register the domain with the provider first." }, { status: 409 });

  try {
    const provider = await verifyMailDomain(platformDomain.provider_domain_id);
    const verified = provider.status === "verified";
    const { data: updated, error } = await service
      .from("mail_platform_domains")
      .update({
        status: verified ? "verified" : provider.status === "failed" ? "failed" : "pending",
        dns_records: provider.records,
        last_error: verified ? null : "DNS records are not fully verified yet.",
        sending_enabled: verified,
        inbound_enabled: verified,
        verified_at: verified ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("domain", parsed.data.domain)
      .select("*")
      .single();

    if (error || !updated) return NextResponse.json({ error: "Could not update platform mail domain." }, { status: 500 });

    await service.from("mail_audit_events").insert({
      mailbox_id: null,
      business_id: null,
      actor_user_id: userId,
      event_type: verified ? "platform_mail.domain_verified" : "platform_mail.domain_verify_pending",
      metadata: { domain: parsed.data.domain, status: updated.status },
    });

    return NextResponse.json({ platformDomain: updated });
  } catch (error) {
    await service.from("mail_platform_domains").update({
      status: "failed",
      last_error: error instanceof Error ? error.message.slice(0, 500) : "Provider verification failed.",
      updated_at: new Date().toISOString(),
    }).eq("domain", parsed.data.domain);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Domain verification failed." }, { status: 502 });
  }
}
