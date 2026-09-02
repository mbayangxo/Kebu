import { promises as dns } from "node:dns";
import {
  customDomainDnsTarget,
  cnamePointsAtKebuHosting,
  formatDnsMismatchDetail,
} from "@/lib/create/dns-target";

export * from "@/lib/create/dns-target";

/** Check www CNAME points at Kebu hosting (server-only). */
export async function verifyDomainPointsToKebu(
  hostname: string,
): Promise<{ ok: boolean; detail: string }> {
  const expected = customDomainDnsTarget();
  const wwwHost = `www.${hostname}`;

  function accept(cnames: string[], label: string): { ok: boolean; detail: string } | null {
    if (cnames.some((c) => cnamePointsAtKebuHosting(c))) {
      return { ok: true, detail: `${label} → ${cnames.join(", ")}` };
    }
    return null;
  }

  try {
    const cnames = await dns.resolveCname(wwwHost);
    const hit = accept(cnames, `www.${hostname}`);
    if (hit) return hit;
    return {
      ok: false,
      detail: formatDnsMismatchDetail(cnames, expected),
    };
  } catch {
    try {
      const cnames = await dns.resolveCname(hostname);
      const hit = accept(cnames, hostname);
      if (hit) return hit;
      return {
        ok: false,
        detail: formatDnsMismatchDetail(cnames, expected),
      };
    } catch {
      /* fall through */
    }
    return {
      ok: false,
      detail: `No CNAME found for www.${hostname}. At Namecheap: Host=www, Value=${expected} (or your Vercel *.vercel.app URL). Wait 5–30 min, then verify.`,
    };
  }
}
