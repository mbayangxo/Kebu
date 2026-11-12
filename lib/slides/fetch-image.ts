/**
 * Shared safe-image-fetch boundary for both Slides exporters.
 *
 * An image layer's `imageUrl` is editor-supplied (anyone who can edit the
 * deck, not just the owner), so the bytes behind it are attacker-controlled
 * input from this feature's own trust boundary -- and so is the URL itself.
 * Before ever opening a connection we resolve the hostname (or read it
 * directly, if it's already a literal IP) and refuse anything that resolves
 * into a private/loopback/link-local/multicast range, so this can't be used
 * as a probe against internal infrastructure. Redirects are followed
 * manually, one hop at a time, re-running that same check against each
 * target -- otherwise a validated public host could redirect straight into
 * a blocked range and bypass the check entirely.
 *
 * Once a response is in hand, this fetches with a byte cap and timeout,
 * then sniffs the real magic bytes itself and only ever tells callers "this
 * is a PNG" / "this is a JPEG" for the two formats we actually support --
 * never runs a generic/auto-detecting image parser against the bytes.
 * Callers (PDF export's embedPng/embedJpg, PPTX export's addImage with a
 * data: URI) only ever receive bytes this function has already classified
 * as one of those two formats.
 */
import { isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";

const FETCH_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;

export type FetchedImage = { bytes: Uint8Array; kind: "png" | "jpg" };

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true; // malformed -> fail closed
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 0) return true; // 0.0.0.0/8
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 shared/CGNAT
  if (a === 192 && b === 0 && parts[2] === 0) return true; // 192.0.0.0/24 IETF protocol assignments
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true; // loopback
  if (normalized === "::" || normalized === "::0") return true; // unspecified
  if (normalized.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 -- unwrap and check the embedded IPv4 address.
    const mapped = normalized.slice("::ffff:".length);
    if (isIP(mapped) === 4) return isBlockedIpv4(mapped);
  }
  const firstHextet = normalized.split(":")[0] ?? "";
  const firstByte = parseInt(firstHextet.padStart(4, "0").slice(0, 2), 16);
  if (!Number.isNaN(firstByte) && firstByte >= 0xfc && firstByte <= 0xfd) return true; // fc00::/7 unique local
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true; // fe80::/10 link-local
  if (normalized.startsWith("ff")) return true; // ff00::/8 multicast
  return false;
}

function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true; // not a recognizable IP -> fail closed
}

/** Resolves `hostname` and returns true if it is -- or resolves to -- a blocked address. Fails closed on any error. */
async function hostIsBlocked(hostname: string): Promise<boolean> {
  const direct = isIP(hostname);
  if (direct) return isBlockedIp(hostname);
  try {
    const records = await dnsLookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) return true;
    return records.some((r) => isBlockedIp(r.address));
  } catch {
    return true; // DNS failure -> fail closed, never fetch against an unresolved host
  }
}

async function validateUrlOrNull(raw: string): Promise<URL | null> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (await hostIsBlocked(parsed.hostname)) return null;
  return parsed;
}

export async function fetchImageBytes(url: string): Promise<FetchedImage | null> {
  let target = await validateUrlOrNull(url);
  if (!target) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(target.toString(), { signal: controller.signal, redirect: "manual" });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location || hop === MAX_REDIRECTS) return null;
        const next = await validateUrlOrNull(new URL(location, target).toString());
        if (!next) return null;
        target = next;
        continue;
      }

      if (!res.ok || !res.body) return null;
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;
      if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { bytes: buf, kind: "png" };
      if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { bytes: buf, kind: "jpg" };
      return null;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
