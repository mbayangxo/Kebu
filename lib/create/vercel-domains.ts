/**
 * Platform hosting: attach custom domains for HTTPS on behalf of the user.
 * Users never open a Vercel account — Kebu uses server credentials (like Shopify/Wix).
 *
 * Ops (Kebu production env):
 *   VERCEL_TOKEN
 *   VERCEL_PROJECT_ID
 *   VERCEL_TEAM_ID  — set to the orgId from `vercel link` / .vercel/project.json
 *                     even on a personal/Hobby account (it still looks like team_…).
 */

const VERCEL_API = "https://api.vercel.com";

export type HostingDomainResult = {
  ok: boolean;
  /** Safe to show in the product UI — never asks users to open Vercel. */
  detail: string;
  configured?: boolean;
  /** Ops-only hint when server env is missing or domain is stuck on another project */
  opsHint?: string;
};

export function hostingDomainAutoProvisionEnabled(): boolean {
  return Boolean(process.env.VERCEL_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim());
}

/** @deprecated Use hostingDomainAutoProvisionEnabled */
export function vercelDomainAutoProvisionEnabled(): boolean {
  return hostingDomainAutoProvisionEnabled();
}

/** Prefer explicit team id; always also try without (personal scope). */
function teamIdCandidates(): Array<string | undefined> {
  const teamId = process.env.VERCEL_TEAM_ID?.trim() || undefined;
  // Unique, stable order: with team first (if set), then without.
  return teamId ? [teamId, undefined] : [undefined];
}

function withTeamQuery(teamId: string | undefined): string {
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

async function domainOnProject(
  token: string,
  projectId: string,
  name: string,
  teamId: string | undefined,
): Promise<boolean> {
  const res = await fetch(
    `${VERCEL_API}/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(name)}${withTeamQuery(teamId)}`,
    { headers: { Authorization: `Bearer ${token}` }, method: "GET" },
  );
  return res.ok;
}

async function addDomainToProject(
  token: string,
  projectId: string,
  name: string,
  teamId: string | undefined,
): Promise<{ ok: boolean; status: number; code?: string; message?: string }> {
  const res = await fetch(
    `${VERCEL_API}/v10/projects/${encodeURIComponent(projectId)}/domains${withTeamQuery(teamId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    },
  );
  const body = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  };
  return {
    ok: res.ok,
    status: res.status,
    code: body.error?.code,
    message: body.error?.message,
  };
}

/**
 * Register apex + www on Kebu hosting so SSL can issue after the user sets DNS.
 * Call on domain save and again on verify.
 *
 * Important: `domain_already_in_use` on *another* Vercel project is NOT success —
 * that causes browser DEPLOYMENT_NOT_FOUND while Kebu still shows DNS verified.
 */
export async function provisionCustomDomainOnHosting(hostname: string): Promise<HostingDomainResult> {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (!token || !projectId) {
    return {
      ok: false,
      detail:
        "DNS can be verified, but hosting is not fully set up yet. Your site may show an error until Kebu finishes attaching HTTPS — tap Verify again in a few minutes.",
      opsHint:
        "Set VERCEL_TOKEN + VERCEL_PROJECT_ID on the Kebu production deploy. If the project is under an account orgId (team_… from .vercel/project.json), also set VERCEL_TEAM_ID.",
    };
  }

  const apex = hostname.replace(/^www\./, "").toLowerCase();
  const names = Array.from(new Set([apex, `www.${apex}`]));
  const errors: string[] = [];
  let attached = 0;
  let stuckOnOtherProject = false;
  let sawForbidden = false;
  const teams = teamIdCandidates();

  for (const name of names) {
    let nameOk = false;

    for (const teamId of teams) {
      try {
        if (await domainOnProject(token, projectId, name, teamId)) {
          nameOk = true;
          break;
        }

        const result = await addDomainToProject(token, projectId, name, teamId);
        if (result.ok) {
          nameOk = true;
          break;
        }

        if (
          result.status === 409 ||
          result.code === "domain_already_exists" ||
          result.code === "domain_already_in_use" ||
          result.code === "domain_conflict" ||
          result.code === "conflict"
        ) {
          // Confirm it is on *this* project under any team scope we try.
          let onOurs = false;
          for (const t of teams) {
            if (await domainOnProject(token, projectId, name, t)) {
              onOurs = true;
              break;
            }
          }
          if (onOurs) {
            nameOk = true;
            break;
          }
          stuckOnOtherProject = true;
          errors.push(
            `${name} is on a different Vercel project (not this Kebu app). In Vercel → that other project → Domains → remove ${name}, then add it to the Kebu project, then Verify again.`,
          );
          break;
        }

        if (result.status === 403 || result.status === 401) {
          sawForbidden = true;
        }

        errors.push(result.message ?? `${name} (${result.status}${teamId ? "+team" : ""})`);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "request failed");
      }
    }

    if (nameOk) attached += 1;
  }

  if (attached === names.length) {
    return {
      ok: true,
      configured: true,
      detail: `Hosting attached. Open https://www.${apex} — you should see your Kebu site.`,
    };
  }

  if (stuckOnOtherProject) {
    return {
      ok: false,
      detail:
        "DNS looks fine, but this domain is stuck on another Vercel project — browsers show DEPLOYMENT_NOT_FOUND until you remove it there and add it to the Kebu project.",
      opsHint: errors.join("; "),
    };
  }

  if (sawForbidden && !process.env.VERCEL_TEAM_ID?.trim()) {
    return {
      ok: false,
      detail:
        "Hosting attach was denied. If your Vercel project shows an org/team id (team_…), add VERCEL_TEAM_ID on the Kebu deploy (same value as orgId in .vercel/project.json), redeploy, then Verify again.",
      opsHint: errors.join("; "),
    };
  }

  if (attached > 0) {
    return {
      ok: true,
      configured: true,
      detail: `Partial hosting attach — try https://www.${apex}. If it fails, tap Verify again.`,
      opsHint: errors.join("; ") || undefined,
    };
  }

  return {
    ok: false,
    detail:
      "DNS may be ready, but hosting attach failed. The custom domain will not load your Kebu site until this succeeds — tap Verify again shortly.",
    opsHint: errors.join("; ") || "Hosting domain API failed",
  };
}

/** @deprecated Use provisionCustomDomainOnHosting */
export async function provisionCustomDomainOnVercel(hostname: string): Promise<HostingDomainResult> {
  return provisionCustomDomainOnHosting(hostname);
}
