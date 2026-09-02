/**
 * Optional: register custom domains on the Vercel project for HTTPS.
 * Requires VERCEL_TOKEN + VERCEL_PROJECT_ID (or VERCEL_PROJECT_NAME + team).
 */

const VERCEL_API = "https://api.vercel.com";

export type VercelDomainResult = {
  ok: boolean;
  detail: string;
  configured?: boolean;
};

export function vercelDomainAutoProvisionEnabled(): boolean {
  return Boolean(process.env.VERCEL_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim());
}

/** Add apex + www to the Vercel project so SSL can issue after DNS is correct. */
export async function provisionCustomDomainOnVercel(hostname: string): Promise<VercelDomainResult> {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (!token || !projectId) {
    return {
      ok: false,
      detail: "Auto-SSL: set VERCEL_TOKEN and VERCEL_PROJECT_ID on the server to attach domains automatically.",
    };
  }

  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const names = [hostname, `www.${hostname}`];
  const errors: string[] = [];
  let anyOk = false;

  for (const name of names) {
    try {
      const res = await fetch(`${VERCEL_API}/v10/projects/${projectId}/domains${query}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
      if (res.ok || body.error?.code === "domain_already_in_use" || body.error?.code === "domain_already_exists") {
        anyOk = true;
        continue;
      }
      errors.push(`${name}: ${body.error?.message ?? res.statusText}`);
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : "request failed"}`);
    }
  }

  if (anyOk) {
    return {
      ok: true,
      configured: true,
      detail: "Domain registered on Kebu hosting (Vercel). SSL may take a few minutes after DNS propagates.",
    };
  }

  return { ok: false, detail: errors.join("; ") || "Could not register domain on Vercel." };
}
