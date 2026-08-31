import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, logCreate } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import {
  buildDnsInstructions,
  normalizeHostname,
  validateCustomHostname,
  kebuSubdomainTarget,
} from "@/lib/create/custom-domains";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const addDomainSchema = z.object({
  hostname: z.string().trim().min(3).max(253),
  isPrimary: z.boolean().optional().default(true),
  provider: z.enum(["manual", "namecheap", "kebu"]).optional().default("manual"),
});

async function assertOwnedProject(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  projectId: string,
) {
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, subdomain")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();
  return project;
}

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const project = await assertOwnedProject(supabase, user.id, projectId);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { data: domains, error } = await supabase
    .from("site_domains")
    .select(
      "id, hostname, status, verified, is_primary, dns_target, provider, verified_at, last_check_at, last_error, created_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Custom domains table missing. Apply migration 015."
          : "Could not load domains.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  const subdomain = project.subdomain ?? "";
  const primary = domains?.find((d) => d.is_primary) ?? domains?.[0] ?? null;
  const instructions =
    subdomain && primary ? buildDnsInstructions(subdomain, primary.hostname) : null;

  return NextResponse.json({
    domains: domains ?? [],
    subdomain,
    kebuUrl: subdomain ? `https://${kebuSubdomainTarget(subdomain)}` : null,
    instructions,
  });
}

export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const project = await assertOwnedProject(supabase, user.id, projectId);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  if (!project.subdomain?.trim()) {
    return NextResponse.json(
      { error: "Choose a Kebu subdomain first — it powers your custom domain connection." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = addDomainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const hostname = normalizeHostname(parsed.data.hostname);
  const valid = validateCustomHostname(hostname);
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });

  const { data: taken } = await supabase
    .from("site_domains")
    .select("id, project_id")
    .eq("hostname", hostname)
    .maybeSingle();

  if (taken && taken.project_id !== projectId) {
    return NextResponse.json({ error: "This domain is connected to another Kebu site." }, { status: 409 });
  }

  const dnsTarget = kebuSubdomainTarget(project.subdomain);

  if (parsed.data.isPrimary) {
    await supabase.from("site_domains").update({ is_primary: false }).eq("project_id", projectId);
  }

  const row = {
    project_id: projectId,
    hostname,
    dns_target: dnsTarget,
    provider: parsed.data.provider,
    status: "pending",
    verified: false,
    is_primary: parsed.data.isPrimary,
    last_error: null,
    updated_at: new Date().toISOString(),
  };

  const { data: domain, error } = taken
    ? await supabase.from("site_domains").update(row).eq("id", taken.id).select("*").single()
    : await supabase.from("site_domains").insert(row).select("*").single();

  if (error || !domain) {
    return NextResponse.json({ error: "Could not save domain.", detail: error?.message }, { status: 500 });
  }

  logCreate("domains.add", { userId: user.id, projectId, hostname });

  return NextResponse.json({
    domain,
    instructions: buildDnsInstructions(project.subdomain, hostname),
    message: "Domain saved. Update DNS at Namecheap (or your registrar), then verify.",
  });
}

const deleteSchema = z.object({ domainId: z.string().uuid() });

export async function DELETE(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: projectId } = await params;

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const project = await assertOwnedProject(supabase, user.id, projectId);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { error } = await supabase
    .from("site_domains")
    .delete()
    .eq("id", parsed.data.domainId)
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: "Could not remove domain.", detail: error.message }, { status: 500 });
  }

  logCreate("domains.remove", { userId: user.id, projectId, domainId: parsed.data.domainId });

  return NextResponse.json({ ok: true });
}
