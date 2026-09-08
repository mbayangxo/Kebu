import { randomBytes } from "node:crypto";
import type { AfricanIdType } from "@/lib/afrique-id/types";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Public African ID (AID): AID-{CC}-01-{6 chars}.
 * Legacy Afrique IDs used AFRI-{CC}-01-{6} — still accepted by isPublicAfricanIdFormat.
 * Personal identity — not Kebu ID (business).
 */
export function generatePublicAfricanId(countryCode: string, _type: AfricanIdType = "visitor"): string {
  const cc = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) {
    throw new Error("Invalid country code for African ID");
  }
  const bytes = randomBytes(6);
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  // Same public shape for both types; type lives in DB `identity_type`.
  return `AID-${cc}-01-${suffix}`;
}

/** @deprecated Use generatePublicAfricanId */
export function generatePublicAfriqueId(countryCode: string): string {
  return generatePublicAfricanId(countryCode, "visitor");
}

export function isPublicAfricanIdFormat(value: string): boolean {
  const v = value.trim().toUpperCase();
  return /^(AID|AFRI)-[A-Z]{2}-[0-9]{2}-[A-Z0-9]{6}$/.test(v);
}

/** @deprecated Use isPublicAfricanIdFormat */
export function isPublicAfriqueIdFormat(value: string): boolean {
  return isPublicAfricanIdFormat(value);
}

export function normalizePublicAfricanId(value: string): string {
  return value.trim().toUpperCase();
}
