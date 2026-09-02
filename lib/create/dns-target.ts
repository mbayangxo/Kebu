const HOSTNAME_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

const BLOCKED_SUFFIXES = [".kebu.africa", ".localhost", ".vercel.app"];

/** Canonical CNAME for custom domains on Kebu hosting today. */
export const KEBU_DNS_CNAME_TARGET = "cname.vercel-dns.com";

export type DnsInstructions = {
  hostname: string;
  dnsTarget: string;
  cnameHost: string;
  cnameRecordType: "CNAME";
  steps: string[];
  registrarNote: string;
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

export function isObsoleteDnsTarget(stored: string | null | undefined): boolean {
  if (!stored?.trim()) return false;
  const s = stored.trim().toLowerCase().replace(/\.$/, "");
  return (
    s.includes("kebu.africa") ||
    s === "kebu.africa" ||
    s.endsWith(".kebu.africa") ||
    s.includes("alkebulan.com") ||
    s.includes("alkebulan.co")
  );
}

/** The only CNAME value Kebu should tell users — never derived from NEXT_PUBLIC_APP_URL. */
export function customDomainDnsTarget(_subdomain?: string): string {
  const override = process.env.CUSTOM_DOMAIN_DNS_TARGET?.trim();
  if (override && !isObsoleteDnsTarget(override)) {
    return override.replace(/\.$/, "");
  }
  return KEBU_DNS_CNAME_TARGET;
}

export function resolveDnsTarget(stored: string | null | undefined, subdomain?: string): string {
  if (!stored?.trim() || isObsoleteDnsTarget(stored)) {
    return customDomainDnsTarget(subdomain);
  }
  return stored.trim().replace(/\.$/, "");
}

export function deploymentAppHostname(): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) return null;
  const host = appUrl.replace(/^https?:\/\//i, "").split("/")[0]?.toLowerCase().replace(/\.$/, "");
  if (!host || host.includes("localhost") || isObsoleteDnsTarget(host)) return null;
  return host;
}

export function buildDnsInstructions(subdomain: string, hostname: string): DnsInstructions {
  const dnsTarget = customDomainDnsTarget(subdomain);
  const steps = [
    `Publish your site first (path: /sites/${subdomain}).`,
    `In your registrar DNS panel, add a CNAME record.`,
    `Host / Name: www`,
    `Value / Points to: ${dnsTarget}`,
    `TTL: Automatic or 300 seconds.`,
    `Do not use kebu.africa or any *.kebu.africa address — that branded DNS is not live yet.`,
    `For the bare domain (${hostname}), set a redirect to https://www.${hostname}.`,
    `Wait 5–30 minutes, then click Verify in Kebu. HTTPS is automatic — you never open a hosting account.`,
  ];
  return {
    hostname,
    dnsTarget,
    cnameHost: `www.${hostname}`,
    cnameRecordType: "CNAME",
    registrarNote: "Buy domains in Kebu Domains, or connect one you already own.",
    steps,
  };
}

export function normalizeCnameHost(value: string): string {
  return value.toLowerCase().replace(/\.$/, "");
}

export function cnamePointsAtKebuHosting(found: string, _expectedTarget?: string): boolean {
  const f = normalizeCnameHost(found);
  const canonical = normalizeCnameHost(customDomainDnsTarget());

  if (f === canonical) return true;
  if (f.endsWith("vercel-dns.com")) return true;
  if (f.endsWith(".vercel.app")) return true;

  const appHost = deploymentAppHostname();
  if (appHost && f === appHost) return true;

  return false;
}

const PARKING_CNAME_PATTERNS = [
  "parkingpage",
  "sedoparking",
  "domainpark",
  "parked",
  "placeholder",
  "dns-parking",
];

export function isRegistrarParkingCname(cname: string): boolean {
  const f = cname.toLowerCase();
  return PARKING_CNAME_PATTERNS.some((p) => f.includes(p));
}

export function formatDnsMismatchDetail(found: string[], expectedTarget: string): string {
  const joined = found.join(", ");
  const parking = found.find(isRegistrarParkingCname);
  const canonical = customDomainDnsTarget();
  const vercelApp = found.find((f) => f.toLowerCase().includes(".vercel.app"));
  const vercelDns = found.find((f) => f.toLowerCase().includes("vercel-dns.com"));

  if (vercelApp || vercelDns) {
    return `DNS looks correct (www → ${joined}). Click Verify again — HTTPS is handled by Kebu.`;
  }

  if (parking) {
    return `Your domain is still on a registrar parking page (${parking}). Delete that CNAME, then set Host=www → Value=${canonical}. Wait 5–30 minutes and verify again.`;
  }

  if (isObsoleteDnsTarget(expectedTarget)) {
    return `Found www CNAME ${joined}. Set Host=www → Value=${canonical}. Do not use kebu.africa — that DNS is not live.`;
  }

  return `Found www CNAME ${joined}. Set Host=www → Value=${canonical}, wait 5–30 min, then verify again in Kebu.`;
}
