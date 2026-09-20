import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type SafePublicTarget = {
  url: URL;
  addresses: Array<{ address: string; family: 4 | 6 }>;
};

function isPrivateV4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a,b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || a >= 224;
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice("::ffff:".length);
    return isPrivateV4(v4);
  }
  return false;
}

export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateV4(ip);
  if (version === 6) return isPrivateV6(ip);
  return true;
}

export async function resolveSafePublicUrl(input: string): Promise<SafePublicTarget> {
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http and https URLs are supported.");
  if (url.username || url.password) throw new Error("Credential-bearing URLs are not allowed.");
  const expectedPort = url.protocol === "https:" ? "443" : "80";
  if (url.port && url.port !== expectedPort) throw new Error("Reader only supports standard web ports.");
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Private hosts are not allowed.");

  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Private network addresses are not allowed.");
    return { url, addresses: [{ address: host, family: isIP(host) as 4 | 6 }] };
  } else {
    const addresses = await lookup(host, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) throw new Error("URL resolves to a private network.");
    return {
      url,
      addresses: addresses.map((entry) => ({
        address: entry.address,
        family: entry.family as 4 | 6,
      })),
    };
  }
}

export async function assertSafePublicUrl(input: string): Promise<URL> {
  return (await resolveSafePublicUrl(input)).url;
}
