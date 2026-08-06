export const READINESS_MODEL_VERSION = "business-readiness-v1";

export type RegistrationProgressStepDef = {
  stepKey: string;
  label: string;
  sortOrder: number;
};

/** Canonical registration timeline — progress rows are stored per business in DB. */
export const REGISTRATION_TIMELINE: RegistrationProgressStepDef[] = [
  { stepKey: "business_created", label: "Business Created", sortOrder: 10 },
  { stepKey: "business_information_complete", label: "Business Information Complete", sortOrder: 20 },
  { stepKey: "documents_uploaded", label: "Documents Uploaded", sortOrder: 30 },
  { stepKey: "ready_to_submit", label: "Ready To Submit", sortOrder: 40 },
  { stepKey: "submitted", label: "Submitted", sortOrder: 50 },
  { stepKey: "government_review", label: "Government Review", sortOrder: 60 },
  { stepKey: "approved", label: "Approved", sortOrder: 70 },
  { stepKey: "registration_certificate", label: "Registration Certificate", sortOrder: 80 },
  { stepKey: "active_business", label: "Active Business", sortOrder: 90 },
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

function confidenceFor(filledRequired: number, requiredTotal: number): ReadinessResult["confidenceLevel"] {
  const ratio = filledRequired / requiredTotal;
  if (ratio < 0.5) return "low";
  if (ratio < 0.85) return "moderate";
  return "high";
}

/**
 * Server-side Business Readiness Score (not financing / lending / investment).
 * Based only on profile completion for this registration slice.
 */
export function calculateBusinessReadiness(profile: BusinessProfileForReadiness): ReadinessResult {
  const helping: string[] = [];
  const limiting: string[] = [];
  const missing: string[] = [];
  let points = 0;
  const max = 100;

  const checks: { ok: boolean; pts: number; help: string; miss: string }[] = [
    {
      ok: Boolean(profile.legalName?.trim()),
      pts: 12,
      help: "Legal business name is on file.",
      miss: "Add a legal business name.",
    },
    {
      ok: Boolean(profile.countryCode?.trim()),
      pts: 8,
      help: "Country is set.",
      miss: "Select a country.",
    },
    {
      ok: Boolean(profile.region?.trim()),
      pts: 8,
      help: "Region / state is set.",
      miss: "Add region / state.",
    },
    {
      ok: Boolean(profile.category?.trim()),
      pts: 8,
      help: "Business category is set.",
      miss: "Choose a business category.",
    },
    {
      ok: Boolean(profile.description?.trim()) && profile.description.trim().length >= 20,
      pts: 10,
      help: "Short description is complete.",
      miss: "Add a short description (at least 20 characters).",
    },
    {
      ok: Boolean(profile.businessEmail?.trim()),
      pts: 10,
      help: "Business email is on file.",
      miss: "Add a business email.",
    },
    {
      ok: Boolean(profile.businessPhone?.trim()),
      pts: 8,
      help: "Business phone is on file.",
      miss: "Add a business phone.",
    },
    {
      ok: Boolean(profile.legalStructure?.trim()),
      pts: 14,
      help: "Business structure is selected for your country.",
      miss: "Select a legal business structure.",
    },
    {
      ok: Boolean(profile.founderName?.trim()),
      pts: 10,
      help: "Founder name is recorded.",
      miss: "Add founder name.",
    },
    {
      ok: Boolean(profile.founderEmail?.trim()),
      pts: 8,
      help: "Founder email is recorded.",
      miss: "Add founder email.",
    },
    {
      ok:
        typeof profile.ownershipPercent === "number" &&
        profile.ownershipPercent > 0 &&
        profile.ownershipPercent <= 100,
      pts: 4,
      help: "Ownership percentage is recorded.",
      miss: "Add founder ownership percentage.",
    },
  ];

  let filled = 0;
  for (const c of checks) {
    if (c.ok) {
      points += c.pts;
      helping.push(c.help);
      filled += 1;
    } else {
      limiting.push(c.miss);
      missing.push(c.miss);
    }
  }

  // Optional website bonus (does not punish absence beyond opportunity note)
  if (profile.website?.trim()) {
    points = Math.min(max, points + 5);
    helping.push("Website URL is on file.");
  } else {
    missing.push("Optional: add a website when you have one.");
  }

  if (profile.tradingName?.trim()) {
    points = Math.min(max, points + 3);
    helping.push("Trading name is on file.");
  }

  const scoreValue = Math.max(0, Math.min(100, points));
  const scoreBand = bandFor(scoreValue);
  const confidenceLevel = confidenceFor(filled, checks.length);

  return {
    scoreValue,
    scoreBand,
    confidenceLevel,
    modelVersion: READINESS_MODEL_VERSION,
    helpingFactors: helping,
    limitingFactors: limiting,
    missingItems: missing,
    explanation: {
      summary:
        confidenceLevel === "low"
          ? "Not enough verified information yet for a strong readiness reading."
          : `Business Readiness is ${scoreValue} (${scoreBand.replace("_", " ")}).`,
      note: "This is a Business Readiness score — not financing, lending, or investment approval. KA Score is one input and does not guarantee funding.",
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
      profile.ownershipPercent > 0
  );
}
