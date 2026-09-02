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

export type AfriqueIdRecord = {
  userId: string;
  publicAfriqueId: string;
  countryCode: string;
  eligibilityStatus: AfriqueEligibilityStatus;
  verifiedAt: string | null;
  createdAt: string;
};

export type AfriqueIdPublicCard = {
  publicAfriqueId: string;
  displayName: string;
  countryCode: string;
  eligibilityStatus: "verified";
  avatarUrl: string | null;
};

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

export function rowToAfriqueId(row: {
  user_id: string;
  public_afrique_id: string;
  country_code: string;
  eligibility_status: string;
  verified_at: string | null;
  created_at: string;
}): AfriqueIdRecord {
  return {
    userId: row.user_id,
    publicAfriqueId: row.public_afrique_id,
    countryCode: row.country_code,
    eligibilityStatus: row.eligibility_status as AfriqueEligibilityStatus,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
  };
}
