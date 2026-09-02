import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Public Afrique ID: AFRI-{CC}-01-{6 chars}. Personal identity — not Kebu ID (business). */
export function generatePublicAfriqueId(countryCode: string): string {
  const cc = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) {
    throw new Error("Invalid country code for Afrique ID");
  }
  const bytes = randomBytes(6);
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `AFRI-${cc}-01-${suffix}`;
}

export function isPublicAfriqueIdFormat(value: string): boolean {
  return /^AFRI-[A-Z]{2}-[0-9]{2}-[A-Z0-9]{6}$/.test(value);
}
