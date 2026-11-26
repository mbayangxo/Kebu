/**
 * Deterministic identities for website-v1 content (3C S2).
 *
 * website-v1 section ids are optional and are not UUIDs ("hero-1", "kebu-chrome-header"), and
 * pages have no ids at all. The model requires UUIDs, so the adapter mints RFC 4122 version-5
 * UUIDs from (document id, kind, legacy key): converting the same definition twice yields the
 * same ids, and ids from different documents never collide.
 *
 * SHA-1 is implemented here (synchronous, no host crypto) so the adapter runs identically on the
 * server and in the browser. It is used for identity only, never for security.
 */
import type { NodeId, PageId } from "@/lib/creative-core";

/** Kebu namespace for KCD adapter identities (random, fixed forever). */
export const KCD_ADAPTER_NAMESPACE = "6f1d2c8e-3b7a-4e52-9c41-0a8d5e7f2b13";

function utf8(text: string): number[] {
  return [...new TextEncoder().encode(text)];
}

function uuidBytes(uuid: string): number[] {
  const hex = uuid.replace(/-/g, "");
  const out: number[] = [];
  for (let i = 0; i < 32; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16));
  return out;
}

function rotl(x: number, n: number): number {
  return (x << n) | (x >>> (32 - n));
}

/** SHA-1 digest (20 bytes) of `bytes`. */
export function sha1(bytes: readonly number[]): number[] {
  const msg = [...bytes, 0x80];
  while (msg.length % 64 !== 56) msg.push(0);
  const bitLength = bytes.length * 8;
  const hi = Math.floor(bitLength / 0x100000000);
  const lo = bitLength >>> 0;
  msg.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255);
  msg.push((lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Array<number>(80);
  for (let block = 0; block < msg.length; block += 64) {
    for (let i = 0; i < 16; i++) {
      const j = block + i * 4;
      w[i] = (msg[j] << 24) | (msg[j + 1] << 16) | (msg[j + 2] << 8) | msg[j + 3];
    }
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const t = (rotl(a, 5) + f + e + k + w[i]) | 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = t;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }
  const out: number[] = [];
  for (const h of [h0, h1, h2, h3, h4]) out.push((h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, h & 255);
  return out;
}

/** RFC 4122 §4.3 name-based UUID (version 5). */
export function uuidV5(name: string, namespace: string = KCD_ADAPTER_NAMESPACE): string {
  const hash = sha1([...uuidBytes(namespace), ...utf8(name)]).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// NUL separators keep (document, kind, key) triples unambiguous.
const nameOf = (docId: string, kind: string, key: string) => `${docId}\u0000${kind}\u0000${key}`;

/** Node id for a website-v1 section id that is not already a UUID. */
export function mintSectionId(docId: string, legacyId: string): NodeId {
  return uuidV5(nameOf(docId, "section", legacyId)) as NodeId;
}

/** Node id for a website-v1 section without an id (position on its page is its only identity). */
export function mintAnonymousSectionId(docId: string, pageSlug: string, index: number): NodeId {
  return uuidV5(nameOf(docId, "section@", `${pageSlug}#${index}`)) as NodeId;
}

/** Page id for a website-v1 page (slugs are unique within a definition). */
export function mintPageId(docId: string, slug: string): PageId {
  return uuidV5(nameOf(docId, "page", slug)) as PageId;
}
