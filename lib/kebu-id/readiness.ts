export const READINESS_MODEL_VERSION = "business-readiness-v3";

export type RegistrationProgressStepDef = {
  stepKey: string;
  label: string;
  sortOrder: number;
};

/** Canonical registration timeline — progress rows are stored per business in DB. */
export const REGISTRATION_TIMELINE: RegistrationProgressStepDef[] = [
  { stepKey: "business_created", label: "Application Started", sortOrder: 10 },
  { stepKey: "documents_uploaded", label: "Documents Uploaded", sortOrder: 20 },
  { stepKey: "business_information_complete", label: "Identity Verified", sortOrder: 30 },
  { stepKey: "government_review", label: "Government Review", sortOrder: 40 },
  { stepKey: "payment_confirmed", label: "Payment Confirmed", sortOrder: 50 },
  { stepKey: "approved", label: "Registration Approved", sortOrder: 60 },
  { stepKey: "registration_certificate", label: "Registration Certificate Ready", sortOrder: 70 },
  { stepKey: "tax_registration", label: "Tax Registration", sortOrder: 80 },
  { stepKey: "active_business", label: "Business Active", sortOrder: 90 },
];

export type BusinessProfileForReadiness = {
  legalName: string;
  tradingName?: string | null;
  countryCode: string;
  region?: string | null;
  category: string;
  description: string;
  businessEmail?: string | null;
  businessPhone?: string | null;
  website?: string | null;
  legalStructure?: string | null;
  founderName?: string | null;
  founderEmail?: string | null;
  ownershipPercent?: number | null;
  /** Required gov-prep documents (founder ID + business plan) uploaded. */
  registrationDocumentsComplete?: boolean;
  /** At least one Kebu website project is published for this business. */
  hasPublishedWebsite?: boolean;
  /** Server-generated Kebu Business Record on file. */
  kebuOfficialRecordGenerated?: boolean;
  /** Optional: RCCM / tax certs uploaded for gov registration track. */
  hasGovRegistrationCerts?: boolean;
  /** Optional: ECOWAS / West Africa trade packet uploaded (requires validation). */
  hasWestAfricaTradeDocs?: boolean;
  /** Favicon or social image on a linked Kebu site. */
  hasSiteLogo?: boolean;
  /** Active catalog products across linked sites. */
  siteProductCount?: number;
  /** Saved Kebu Create designs (posters, flyers, social). */
  createAssetCount?: number;
};

export type ReadinessResult = {
  scoreValue: number;
  scoreBand: "building" | "developing" | "established" | "strong" | "opportunity_ready";
  confidenceLevel: "low" | "moderate" | "high";
  modelVersion: string;
  helpingFactors: string[];
  limitingFactors: string[];
  missingItems: string[];
  explanation: {
    summary: string;
    note: string;
  };
};

function bandFor(score: number): ReadinessResult["scoreBand"] {
  if (score < 25) return "building";
  if (score < 50) return "developing";
  if (score < 70) return "established";
  if (score < 85) return "strong";
  return "opportunity_ready";
}

/**
 * Server-side Business Readiness Score (not financing / lending / investment).
 * Honest scoring: profile alone cannot reach 100 — documents, digital presence, and Kebu record matter.
 */
export function calculateBusinessReadiness(profile: BusinessProfileForReadiness): ReadinessResult {
  const helping: string[] = [];
  const limiting: string[] = [];
  const missing: string[] = [];
  let points = 0;

  const profileChecks: { ok: boolean; pts: number; help: string; miss: string }[] = [
    { ok: Boolean(profile.legalName?.trim()), pts: 6, help: "Legal business name on file.", miss: "Add a legal business name." },
    { ok: Boolean(profile.countryCode?.trim()), pts: 4, help: "Country set.", miss: "Select a country." },
    { ok: Boolean(profile.region?.trim()), pts: 4, help: "Region / state set.", miss: "Add region / state." },
    { ok: Boolean(profile.category?.trim()), pts: 4, help: "Business category set.", miss: "Choose a business category." },
    {
      ok: Boolean(profile.description?.trim()) && profile.description.trim().length >= 20,
      pts: 5,
      help: "Business description complete.",
      miss: "Add a short description (at least 20 characters).",
    },
    { ok: Boolean(profile.businessEmail?.trim()), pts: 5, help: "Business email on file.", miss: "Add a business email." },
    { ok: Boolean(profile.businessPhone?.trim()), pts: 4, help: "Business phone on file.", miss: "Add a business phone." },
    {
      ok: Boolean(profile.legalStructure?.trim()),
      pts: 7,
      help: "Legal structure selected.",
      miss: "Select a legal business structure.",
    },
    { ok: Boolean(profile.founderName?.trim()), pts: 5, help: "Founder name recorded.", miss: "Add founder name." },
    { ok: Boolean(profile.founderEmail?.trim()), pts: 4, help: "Founder email recorded.", miss: "Add founder email." },
    {
      ok:
        typeof profile.ownershipPercent === "number" &&
        profile.ownershipPercent > 0 &&
        profile.ownershipPercent <= 100,
      pts: 2,
      help: "Ownership percentage recorded.",
      miss: "Add founder ownership percentage.",
    },
  ];

  let profileFilled = 0;
  for (const c of profileChecks) {
    if (c.ok) {
      points += c.pts;
      helping.push(c.help);
      profileFilled += 1;
    } else {
      limiting.push(c.miss);
      missing.push(c.miss);
    }
  }

  if (profile.tradingName?.trim()) {
    points += 2;
    helping.push("Trading name on file.");
  }

  // Gov-prep documents — 25 points (required for serious readiness)
  if (profile.registrationDocumentsComplete === true) {
    points += 25;
    helping.push("Required gov-prep documents uploaded (founder ID + business plan).");
  } else {
    missing.push("Upload founder ID and business plan for government registration prep.");
    limiting.push("Gov-prep documents missing — score capped until uploaded.");
  }

  if (profile.hasGovRegistrationCerts) {
    points += 5;
    helping.push("Government registration certificates on file (RCCM / tax).");
  } else {
    missing.push("Optional: upload RCCM or tax certificates after you receive them from authorities.");
  }

  // Digital presence — published site + branding
  if (profile.hasPublishedWebsite) {
    points += 12;
    helping.push("Website published on Kebu.");
  } else if (profile.website?.trim()) {
    points += 4;
    helping.push("Website URL on file.");
    missing.push("Publish your website on Kebu — a URL alone is not a live site.");
    limiting.push("No published Kebu website yet.");
  } else {
    missing.push("Build and publish a website on Kebu (or add a website URL).");
    limiting.push("No digital storefront or site published.");
  }

  if (profile.hasSiteLogo) {
    points += 5;
    helping.push("Site logo or brand image set (favicon / social preview).");
  } else {
    missing.push("Add a logo or brand image in Builder → Site & SEO (favicon or social image).");
  }

  const productCount = Math.max(0, profile.siteProductCount ?? 0);
  if (productCount >= 5) {
    points += 10;
    helping.push(`${productCount} products in your site catalog — strong storefront signal.`);
  } else if (productCount >= 3) {
    points += 6;
    helping.push(`${productCount} products listed — keep adding to grow readiness.`);
  } else if (productCount >= 1) {
    points += 3;
    helping.push("At least one product listed on your site.");
    missing.push("Add more products in Builder to show a fuller catalog.");
  } else {
    missing.push("Add products in Kebu Builder so customers can see what you sell.");
    limiting.push("No products listed on your site yet.");
  }

  const createCount = Math.max(0, profile.createAssetCount ?? 0);
  if (createCount >= 3) {
    points += 6;
    helping.push(`${createCount} marketing designs saved in Kebu Create.`);
  } else if (createCount >= 1) {
    points += 3;
    helping.push("Marketing poster or graphic created in Kebu Create.");
    missing.push("Create more posters or social graphics in Kebu Create.");
  } else {
    missing.push("Optional: design a poster or flyer in Kebu Create for your business.");
  }

  // Kebu official record — 10 points
  if (profile.kebuOfficialRecordGenerated) {
    points += 10;
    helping.push("Official Kebu Business Record generated — your permanent Kebu ID snapshot.");
  } else {
    missing.push("Generate your official Kebu Business Record (like an EIN letter, but for Kebu).");
  }

  if (profile.hasWestAfricaTradeDocs) {
    points += 3;
    helping.push("West Africa trade readiness packet uploaded (requires validation).");
  } else {
    missing.push(
      "Optional: upload ECOWAS / West Africa trade documents when preparing to sell across the region.",
    );
  }

  const scoreValue = Math.max(0, Math.min(100, points));
  const scoreBand = bandFor(scoreValue);

  const profileRatio = profileFilled / profileChecks.length;
  let confidenceLevel: ReadinessResult["confidenceLevel"] = "low";
  if (
    profileRatio >= 0.85 &&
    profile.registrationDocumentsComplete &&
    (profile.hasPublishedWebsite || profile.website?.trim())
  ) {
    confidenceLevel = "high";
  } else if (profileRatio >= 0.5) {
    confidenceLevel = "moderate";
  }

  const summary =
    scoreValue >= 85 && profile.registrationDocumentsComplete && profile.hasPublishedWebsite
      ? `Strong registration readiness at ${scoreValue} — profile, documents, site, and operations signals are in place.`
      : scoreValue < 50
        ? "Early stage — add your logo, products, documents, and publish your site to raise readiness."
        : `Readiness is ${scoreValue} (${scoreBand.replace("_", " ")}). Keep improving — logo, products, and a live site all help.`;

  return {
    scoreValue,
    scoreBand,
    confidenceLevel,
    modelVersion: READINESS_MODEL_VERSION,
    helpingFactors: helping,
    limitingFactors: limiting,
    missingItems: missing,
    explanation: {
      summary,
      note: "Business Readiness helps you prepare for government registration — it is not financing approval. Kebu ID is your permanent business identifier (like an EIN). Kebu Score comes later with real operations data.",
    },
  };
}

export function infoCompleteFromProfile(profile: BusinessProfileForReadiness): boolean {
  return Boolean(
    profile.legalName?.trim() &&
      profile.countryCode?.trim() &&
      profile.region?.trim() &&
      profile.category?.trim() &&
      profile.description?.trim() &&
      profile.description.trim().length >= 20 &&
      profile.businessEmail?.trim() &&
      profile.businessPhone?.trim() &&
      profile.legalStructure?.trim() &&
      profile.founderName?.trim() &&
      profile.founderEmail?.trim() &&
      typeof profile.ownershipPercent === "number" &&
      profile.ownershipPercent > 0,
  );
}
