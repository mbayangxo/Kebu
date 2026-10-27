import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import {
  AFRICAN_OPPORTUNITY_ACCESS_KEY,
  loadAfricanOpportunityEntitlement,
  optInAfricanOpportunityAccess,
  revokeAfricanOpportunityAccess,
} from "@/lib/entitlements/african-opportunity-access";

export const dynamic = "force-dynamic";

/**
 * The account control center's privacy surface (docs/product/KEBU-UNIFIED-ACCOUNT.md
 * § "Privacy: control center, not surveillance"). Only entitlement keys this
 * codebase actually gates real behavior with are listed here -- adding a row
 * to CONNECTED_SERVICES or KNOWN_ENTITLEMENT_KEYS without real backing would
 * be exactly the "fake hub button" the product rules forbid.
 */
const CONNECTED_SERVICES = [
  { key: "search", label: "Search", detail: "Always available with your Kebu Account." },
  { key: "mail", label: "Mail", detail: "Always available with your Kebu Account." },
  { key: "builder", label: "Builder", detail: "Always available with your Kebu Account." },
  { key: "analytics", label: "Analytics", detail: "Always available with your Kebu Account." },
] as const;

const KNOWN_ENTITLEMENT_KEYS = [AFRICAN_OPPORTUNITY_ACCESS_KEY] as const;
type KnownEntitlementKey = (typeof KNOWN_ENTITLEMENT_KEYS)[number];

const patchSchema = z.object({
  key: z.enum(KNOWN_ENTITLEMENT_KEYS),
  action: z.enum(["revoke", "optIn"]),
});

function labelFor(key: KnownEntitlementKey): { label: string; detail: string } {
  if (key === AFRICAN_OPPORTUNITY_ACCESS_KEY) {
    return {
      label: "Opportunity personalization",
      detail: "Kebu Opportunity OS may use your verified African ID to show you a personalized opportunity feed.",
    };
  }
  return { label: key, detail: "" };
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const entitlements = await Promise.all(
    KNOWN_ENTITLEMENT_KEYS.map(async (key) => {
      const entitlement = await loadAfricanOpportunityEntitlement({ supabase, userId: user.id });
      return { ...labelFor(key), ...entitlement };
    }),
  );

  return NextResponse.json({ connectedServices: CONNECTED_SERVICES, entitlements });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid entitlement action." }, { status: 400 });
  }

  if (parsed.data.action === "revoke") {
    await revokeAfricanOpportunityAccess({ supabase, userId: user.id });
  } else {
    await optInAfricanOpportunityAccess({ supabase, userId: user.id });
  }

  const entitlement = await loadAfricanOpportunityEntitlement({ supabase, userId: user.id });
  return NextResponse.json({ ...labelFor(parsed.data.key), ...entitlement });
}
