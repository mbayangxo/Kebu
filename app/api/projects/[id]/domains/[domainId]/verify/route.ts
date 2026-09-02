import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { customDomainDnsTarget, buildDnsInstructions } from "@/lib/create/dns-target";
import { verifyDomainPointsToKebu } from "@/lib/create/custom-domains";
import { provisionCustomDomainOnHosting, hostingDomainAutoProvisionEnabled } from "@/lib/create/vercel-domains";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; domainId: string }> };

/** Verify DNS points custom domain at this project's Kebu subdomain. */
export async function POST(_req: Request, { params }: Params) {
  const limited = builderRateLimit(_req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId, domainId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, subdomain")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: domain } = await supabase
    .from("site_domains")
    .select("id, hostname, dns_target, project_id")
    .eq("id", domainId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!domain) {
    return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  }

  const subdomain = project.subdomain ?? "";
  const expected = customDomainDnsTarget(subdomain || "site");

  if (domain.dns_target !== expected) {
    await supabase.from("site_domains").update({ dns_target: expected }).eq("id", domainId);
  }

  const check = await verifyDomainPointsToKebu(domain.hostname);
  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("site_domains")
    .update({
      status: check.ok ? "verified" : "failed",
      verified: check.ok,
      verified_at: check.ok ? now : null,
      last_check_at: now,
      last_error: check.ok ? null : check.detail,
      updated_at: now,
    })
    .eq("id", domainId)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Could not update domain.", detail: error?.message }, { status: 500 });
  }

  logCreate(check.ok ? "domains.verified" : "domains.verify_failed", {
    userId: user.id,
    projectId,
    hostname: domain.hostname,
  });

  let sslNote: string | null = null;
  // Always try to attach hosting (even if DNS not ready yet) so SSL can issue as soon as CNAME propagates.
  const hosting = await provisionCustomDomainOnHosting(domain.hostname);
  if (hosting.opsHint) {
    console.warn("[domains.verify] hosting provision", hosting.opsHint);
  }
  if (check.ok) {
    sslNote = hosting.ok
      ? hosting.detail
      : hosting.detail ||
        "DNS is correct, but hosting is not attached yet — the custom domain may still show an error until this finishes.";
  } else if (hosting.ok) {
    sslNote = "Kebu prepared HTTPS. Finish DNS (CNAME www → cname.vercel-dns.com), then Verify again.";
  }

  return NextResponse.json({
    domain: updated,
    ok: check.ok,
    detail: check.detail,
    liveUrl: check.ok && hosting.ok ? `https://www.${domain.hostname}` : check.ok ? null : null,
    sslNote,
    hostingOk: hosting.ok,
    hostingAutoSsl: hostingDomainAutoProvisionEnabled(),
    instructions: check.ok ? null : buildDnsInstructions(subdomain, domain.hostname),
  });
}
