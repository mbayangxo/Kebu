/**
 * Platform hosting: attach custom domains for HTTPS on behalf of the user.
 * Users never open a Vercel account — Kebu uses server credentials (like Shopify/Wix).
 *
 * Ops: set VERCEL_TOKEN + VERCEL_PROJECT_ID (+ optional VERCEL_TEAM_ID) on the Kebu deploy.
 */

const VERCEL_API = "https://api.vercel.com";

export type HostingDomainResult = {
  ok: boolean;
  /** Safe to show in the product UI — never asks users to open Vercel. */
  detail: string;
  configured?: boolean;
  /** Ops-only hint when server env is missing */
  opsHint?: string;
};

export function hostingDomainAutoProvisionEnabled(): boolean {
  return Boolean(process.env.VERCEL_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim());
}

/** @deprecated Use hostingDomainAutoProvisionEnabled */
export function vercelDomainAutoProvisionEnabled(): boolean {
  return hostingDomainAutoProvisionEnabled();
}

function alreadyAttached(code?: string): boolean {
  return (
    code === "domain_already_in_use" ||
    code === "domain_already_exists" ||
    code === "domain_conflict" ||
    code === "conflict"
  );
}

/**
 * Register apex + www on Kebu hosting so SSL can issue after the user sets DNS.
 * Call on domain save and again on verify.
 */
export async function provisionCustomDomainOnHosting(hostname: string): Promise<HostingDomainResult> {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (!token || !projectId) {
    return {
      ok: false,
      detail: "Domain saved. Add the CNAME at your registrar, then Verify — Kebu handles HTTPS for you.",
      opsHint: "Set VERCEL_TOKEN and VERCEL_PROJECT_ID on the Kebu server so domains attach automatically.",
    };
  }

  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const names = Array.from(new Set([hostname.replace(/^www\./, ""), `www.${hostname.replace(/^www\./, "")}`]));
  const errors: string[] = [];
  let anyOk = false;

  for (const name of names) {
    try {
      const res = await fetch(`${VERCEL_API}/v10/projects/${encodeURIComponent(projectId)}/domains${query}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: { code?: string; message?: string };
      };
      if (res.ok || alreadyAttached(body.error?.code)) {
        anyOk = true;
        continue;
      }
      // 409 often means already on project
      if (res.status === 409) {
        anyOk = true;
        continue;
      }
      errors.push(body.error?.message ?? `${name} (${res.status})`);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "request failed");
    }
  }

  if (anyOk) {
    return {
      ok: true,
      configured: true,
      detail: "Kebu attached this domain to hosting. After DNS propagates, HTTPS turns on automatically — no extra accounts.",
    };
  }

  return {
    ok: false,
    detail: "Domain saved. Keep the CNAME at your registrar and tap Verify again in a few minutes — Kebu retries SSL for you.",
    opsHint: errors.join("; ") || "Hosting domain API failed",
  };
}

/** @deprecated Use provisionCustomDomainOnHosting */
export async function provisionCustomDomainOnVercel(hostname: string): Promise<HostingDomainResult> {
  return provisionCustomDomainOnHosting(hostname);
}
