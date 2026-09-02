import { NextResponse } from "next/server";
import { z } from "zod";
import { promises as dns } from "node:dns";
import { normalizeHostname, validateCustomHostname } from "@/lib/create/dns-target";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ hostname: z.string().trim().min(3).max(253) });

/** Rough availability: no DNS records on apex usually means unregistered (not a registrar API). */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
  }

  const hostname = normalizeHostname(parsed.data.hostname);
  const valid = validateCustomHostname(hostname);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  let hasDns = false;
  try {
    await dns.resolve4(hostname);
    hasDns = true;
  } catch {
    try {
      await dns.resolveNs(hostname);
      hasDns = true;
    } catch {
      try {
        await dns.resolveCname(hostname);
        hasDns = true;
      } catch {
        hasDns = false;
      }
    }
  }

  const available = !hasDns;

  return NextResponse.json({
    hostname,
    available,
    message: available
      ? `${hostname} looks available — you can register it at a registrar, then connect it in Kebu Domains / My sites.`
      : `${hostname} already has DNS records — if you own it, connect it in My sites → Domain & SEO.`,
  });
}
