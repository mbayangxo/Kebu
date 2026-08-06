import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — reduce ambiguity

/** Public Kebu ID: KEBU-{CC}-01-{6 chars}. Non-sequential. Level 01 = draft. */
export function generatePublicKebuId(countryCode: string): string {
  const cc = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) {
    throw new Error("Invalid country code for Kebu ID");
  }
  const bytes = randomBytes(6);
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `KEBU-${cc}-01-${suffix}`;
}

export function isPublicKebuIdFormat(value: string): boolean {
  return /^KEBU-[A-Z]{2}-[0-9]{2}-[A-Z0-9]{6}$/.test(value);
}
