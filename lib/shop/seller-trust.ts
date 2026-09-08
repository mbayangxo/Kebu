import type { SupabaseClient } from "@supabase/supabase-js";
import type { AfriqueEligibilityStatus } from "@/lib/afrique-id/types";

/** Products allowed without linked Kebu ID (informal soft start). */
export const SELLER_TRUST_PRODUCTS_WITHOUT_KEBU_ID = 3;

export type SellerTrustSnapshot = {
  projectId: string;
  businessId: string | null;
  hasKebuId: boolean;
  kebuPublicId: string | null;
  afriqueIdPresent: boolean;
  afriquePublicId: string | null;
  eligibilityStatus: AfriqueEligibilityStatus | "missing";
  /** Plain-language status for Shop UI */
  label: string;
  nextAction: string | null;
  nextActionHref: string | null;
  /** Can turn on Joko (Cauris) pay */
  canEnableJoko: boolean;
  /** Can add another product beyond soft limit */
  canAddProduct: boolean;
  productCount: number;
  productSoftLimitWithoutKebuId: number;
  reasonsBlocked: string[];
};

const ELIGIBILITY_OK_FOR_JOKO: AfriqueEligibilityStatus[] = [
  "unverified",
  "pending",
  "verified",
  "manual_review",
];

function eligibilityLabel(status: AfriqueEligibilityStatus | "missing"): string {
  switch (status) {
    case "verified":
      return "AfriID verified";
    case "pending":
      return "AfriID in review";
    case "manual_review":
      return "AfriID needs manual review";
    case "rejected":
      return "AfriID rejected — contact support";
    case "expired":
      return "AfriID expired — renew verification";
    case "suspended":
      return "AfriID suspended";
    case "unverified":
      return "AfriID created — not verified yet (OK to sell small)";
    case "missing":
    default:
      return "No AfriID on this account yet";
  }
}

/**
 * Resolve seller trust for a shop project.
 * Does NOT use african_opportunity_access (that is Opportunity OS only).
 */
export async function resolveSellerTrust(
  supabase: SupabaseClient,
  opts: { projectId: string; userId: string },
): Promise<SellerTrustSnapshot> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, business_id, owner_id")
    .eq("id", opts.projectId)
    .maybeSingle();

  const businessId = (project?.business_id as string | null) ?? null;
  let kebuPublicId: string | null = null;
  let founderUserId: string | null = project?.owner_id ?? opts.userId;

  if (businessId) {
    const { data: business } = await supabase
      .from("businesses")
      .select("id, public_kebu_id, created_by")
      .eq("id", businessId)
      .maybeSingle();
    kebuPublicId = (business?.public_kebu_id as string | null) ?? null;
    if (business?.created_by) founderUserId = business.created_by as string;
  }

  const aidUserId = founderUserId || opts.userId;
  const { data: aid } = await supabase
    .from("afrique_ids")
    .select("public_afrique_id, eligibility_status")
    .eq("user_id", aidUserId)
    .maybeSingle();

  const eligibilityStatus = (aid?.eligibility_status as AfriqueEligibilityStatus | undefined) ?? "missing";
  const afriqueIdPresent = Boolean(aid?.public_afrique_id);
  const hasKebuId = Boolean(businessId);

  const { count } = await supabase
    .from("project_products")
    .select("id", { count: "exact", head: true })
    .eq("project_id", opts.projectId);

  const productCount = count ?? 0;
  const reasonsBlocked: string[] = [];

  const canEnableJoko =
    hasKebuId &&
    afriqueIdPresent &&
    eligibilityStatus !== "missing" &&
    eligibilityStatus !== "rejected" &&
    eligibilityStatus !== "suspended" &&
    ELIGIBILITY_OK_FOR_JOKO.includes(eligibilityStatus as AfriqueEligibilityStatus);

  if (!hasKebuId) reasonsBlocked.push("Link or create a Kebu ID (business) for this shop.");
  if (!afriqueIdPresent) reasonsBlocked.push("Create your AfriID (person ID) on this account.");
  if (eligibilityStatus === "rejected" || eligibilityStatus === "suspended") {
    reasonsBlocked.push(eligibilityLabel(eligibilityStatus));
  }

  const underSoftCap = productCount < SELLER_TRUST_PRODUCTS_WITHOUT_KEBU_ID;
  const canAddProduct = hasKebuId || underSoftCap;

  let nextAction: string | null = null;
  let nextActionHref: string | null = null;
  if (!hasKebuId) {
    nextAction = "Create or link a Kebu business to sell more and turn on Joko.";
    nextActionHref = "/business";
  } else if (!afriqueIdPresent) {
    nextAction = "Open AfriID and create your person ID (takes a minute).";
    nextActionHref = "/account";
  } else if (eligibilityStatus === "unverified") {
    nextAction = "Optional: request AfriID verification for stronger trust later.";
    nextActionHref = "/account";
  }

  return {
    projectId: opts.projectId,
    businessId,
    hasKebuId,
    kebuPublicId,
    afriqueIdPresent,
    afriquePublicId: (aid?.public_afrique_id as string | null) ?? null,
    eligibilityStatus,
    label: hasKebuId
      ? `Kebu ID linked · ${eligibilityLabel(eligibilityStatus)}`
      : `No Kebu ID yet · ${eligibilityLabel(eligibilityStatus)}`,
    nextAction,
    nextActionHref,
    canEnableJoko,
    canAddProduct,
    productCount,
    productSoftLimitWithoutKebuId: SELLER_TRUST_PRODUCTS_WITHOUT_KEBU_ID,
    reasonsBlocked,
  };
}

export function sellerTrustDenyProductMessage(trust: SellerTrustSnapshot): string {
  return (
    `Link a Kebu ID to add more than ${trust.productSoftLimitWithoutKebuId} products. ` +
    `You have ${trust.productCount}. Informal businesses are welcome — create a draft Kebu ID first.`
  );
}

export function sellerTrustDenyJokoMessage(trust: SellerTrustSnapshot): string {
  if (!trust.hasKebuId) {
    return "Link a Kebu ID to this shop before offering Joko (pay in Cauris).";
  }
  if (!trust.afriqueIdPresent) {
    return "Create your AfriID (person ID) before offering Joko. Informal sellers are welcome — verification can come later.";
  }
  if (trust.eligibilityStatus === "rejected" || trust.eligibilityStatus === "suspended") {
    return `Cannot enable Joko while AfriID is ${trust.eligibilityStatus}.`;
  }
  return "Seller trust requirements not met for Joko.";
}
