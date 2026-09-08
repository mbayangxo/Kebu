export const AFRIQUE_ELIGIBILITY_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "rejected",
  "expired",
  "suspended",
  "manual_review",
] as const;

export type AfriqueEligibilityStatus = (typeof AFRIQUE_ELIGIBILITY_STATUSES)[number];

/** African ID (AID) person type — separate from eligibility verification. */
export const AFRICAN_ID_TYPES = ["indigenous", "visitor"] as const;
export type AfricanIdType = (typeof AFRICAN_ID_TYPES)[number];

export type AfriqueIdRecord = {
  userId: string;
  publicAfriqueId: string;
  countryCode: string;
  identityType: AfricanIdType;
  eligibilityStatus: AfriqueEligibilityStatus;
  verifiedAt: string | null;
  createdAt: string;
};

export type AfriqueIdPublicCard = {
  publicAfriqueId: string;
  displayName: string;
  countryCode: string;
  identityType: AfricanIdType;
  eligibilityStatus: "verified";
  avatarUrl: string | null;
};

export function africanIdTypeLabel(type: AfricanIdType): string {
  return type === "indigenous" ? "Indigenous African" : "Visitor";
}

export function africanIdProductName(): string {
  return "African ID";
}

export function africanIdShortName(): string {
  return "AID";
}

export function eligibilityStatusLabel(status: AfriqueEligibilityStatus): string {
  const labels: Record<AfriqueEligibilityStatus, string> = {
    unverified: "Not verified yet",
    pending: "Verification in review",
    verified: "Verified",
    rejected: "Verification declined",
    expired: "Verification expired",
    suspended: "Suspended",
    manual_review: "Under manual review",
  };
  return labels[status];
}

export function parseAfricanIdType(raw: unknown): AfricanIdType {
  if (raw === "indigenous" || raw === "visitor") return raw;
  return "visitor";
}

export function rowToAfriqueId(row: {
  user_id: string;
  public_afrique_id: string;
  country_code: string;
  eligibility_status: string;
  verified_at: string | null;
  created_at: string;
  identity_type?: string | null;
}): AfriqueIdRecord {
  return {
    userId: row.user_id,
    publicAfriqueId: row.public_afrique_id,
    countryCode: row.country_code,
    identityType: parseAfricanIdType(row.identity_type),
    eligibilityStatus: row.eligibility_status as AfriqueEligibilityStatus,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
  };
}
