import { promises as dns } from "node:dns";

const HOSTNAME_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

const BLOCKED_SUFFIXES = [".kebu.africa", ".localhost", ".vercel.app"];

export type DnsInstructions = {
  hostname: string;
  dnsTarget: string;
  cnameHost: string;
  steps: string[];
  namecheapUrl: string;
};

export function normalizeHostname(input: string): string {
  let h = input.trim().toLowerCase();
  h = h.replace(/^https?:\/\//, "");
  h = h.replace(/\/.*$/, "");
  h = h.replace(/^www\./, "");
  return h;
}

export function validateCustomHostname(hostname: string): { ok: true } | { ok: false; error: string } {
  if (!hostname) return { ok: false, error: "Enter your domain (e.g. mybrand.com)." };
  if (hostname.length > 253) return { ok: false, error: "Domain name is too long." };
  if (!HOSTNAME_RE.test(hostname)) {
    return { ok: false, error: "Use a valid domain like mybrand.com (no paths or spaces)." };
  }
  if (BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s))) {
    return { ok: false, error: "Use your own domain — not a Kebu subdomain." };
  }
  if (hostname.includes("..") || hostname.startsWith("-") || hostname.endsWith("-")) {
    return { ok: false, error: "Invalid domain format." };
  }
  return { ok: true };
}

export function kebuSubdomainTarget(subdomain: string): string {
  return `${subdomain.trim().toLowerCase()}.kebu.africa`;
}

export function buildDnsInstructions(subdomain: string, hostname: string): DnsInstructions {
  const dnsTarget = kebuSubdomainTarget(subdomain);
  const namecheapUrl = `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(hostname)}`;

  return {
    hostname,
    dnsTarget,
    cnameHost: `www.${hostname}`,
    namecheapUrl,
    steps: [
      `At Namecheap (or your registrar), open DNS settings for ${hostname}.`,
      `Add a CNAME record: Host = www → Value = ${dnsTarget}`,
      `For the bare domain (${hostname}), set URL Redirect to https://www.${hostname} (or use their ALIAS/ANAME if available).`,
      `Wait 5–30 minutes for DNS to propagate, then click Verify in Kebu.`,
      `For HTTPS on your domain, the domain must also be added to Kebu hosting (Vercel). If SSL errors appear after verify, contact support — automated SSL is coming soon.`,
      `After verify, your site opens at https://www.${hostname}.`,
    ],
  };
}

/** Check www CNAME (or A/ALIAS) points at the Kebu subdomain target. */
export async function verifyDomainPointsToKebu(
  hostname: string,
  expectedTarget: string,
): Promise<{ ok: boolean; detail: string }> {
  const wwwHost = `www.${hostname}`;
  const expected = expectedTarget.toLowerCase().replace(/\.$/, "");

  try {
    const cnames = await dns.resolveCname(wwwHost);
    const match = cnames.some((c) => c.toLowerCase().replace(/\.$/, "") === expected);
    if (match) {
      return { ok: true, detail: `www.${hostname} CNAME points to ${expectedTarget}.` };
    }
    return {
      ok: false,
      detail: `Found CNAME ${cnames.join(", ")} — expected ${expectedTarget}.`,
    };
  } catch {
    // Some setups use ALIAS/A to same target — try CNAME on apex
    try {
      const cnames = await dns.resolveCname(hostname);
      const match = cnames.some((c) => c.toLowerCase().replace(/\.$/, "") === expected);
      if (match) {
        return { ok: true, detail: `${hostname} CNAME points to ${expectedTarget}.` };
      }
    } catch {
      /* fall through */
    }
    return {
      ok: false,
      detail: `Could not find CNAME for www.${hostname} → ${expectedTarget}. Check Namecheap DNS and wait for propagation.`,
    };
  }
}

export function namecheapManageUrl(hostname: string): string {
  return `https://ap.www.namecheap.com/domains/domaincontrolpanel/${encodeURIComponent(hostname)}/advancedns`;
}
