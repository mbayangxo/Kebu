import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { ensureAfriqueIdForUser } from "@/lib/afrique-id/ensure-afrique-id";

export const dynamic = "force-dynamic";

/**
 * Optional, explicit-consent-only AfriID fields — build-order item 5 of
 * docs/product/KEBU-AFRIID-KEBU-ID-REGISTRATION.md: next of kin and a land
 * declaration. (Ethnic/ancestral group is already captured inside
 * heritage_notes as part of the verification-request flow in
 * ../route.ts's POST handler — not duplicated here.) Hard rule from the
 * spec, enforced here: never a KA Score/credit input, never public, and
 * never saved without that field's own explicit consent flag in the same
 * request — no implicit consent via a UI default or a bundled checkbox.
 */
const sensitiveSchema = z.object({
  nextOfKin: z
    .object({
      name: z.string().trim().min(1).max(160),
      relationship: z.string().trim().min(1).max(80),
      contact: z.string().trim().max(160).optional(),
    })
    .optional(),
  landDeclaration: z
    .object({
      description: z.string().trim().min(1).max(500),
      location: z.string().trim().max(200).optional(),
    })
    .optional(),
  consent: z.object({
    nextOfKin: z.boolean().optional(),
    landDeclaration: z.boolean().optional(),
  }),
});

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data } = await supabase
    .from("afrique_ids")
    .select("next_of_kin, land_declaration, sensitive_fields_consent")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    nextOfKin: data?.next_of_kin ?? null,
    landDeclaration: data?.land_declaration ?? null,
    consent: data?.sensitive_fields_consent ?? {},
  });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = sensitiveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { nextOfKin, landDeclaration, consent } = parsed.data;

  if (nextOfKin !== undefined && !consent.nextOfKin) {
    return NextResponse.json(
      { error: "Next of kin requires its own explicit consent flag in the same request." },
      { status: 400 },
    );
  }
  if (landDeclaration !== undefined && !consent.landDeclaration) {
    return NextResponse.json(
      { error: "Land declaration requires its own explicit consent flag in the same request." },
      { status: 400 },
    );
  }
  if (nextOfKin === undefined && landDeclaration === undefined) {
    return NextResponse.json({ error: "No field provided." }, { status: 400 });
  }

  const ensured = await ensureAfriqueIdForUser({ supabase, userId: user.id });
  if (!ensured.ok) return NextResponse.json({ error: ensured.error }, { status: 500 });

  const { data: existing } = await supabase
    .from("afrique_ids")
    .select("sensitive_fields_consent")
    .eq("user_id", user.id)
    .maybeSingle();
  const consentLog = (existing?.sensitive_fields_consent as Record<string, { consentedAt: string }>) ?? {};

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const now = new Date().toISOString();
  if (nextOfKin !== undefined) {
    patch.next_of_kin = nextOfKin;
    consentLog.nextOfKin = { consentedAt: now };
  }
  if (landDeclaration !== undefined) {
    patch.land_declaration = landDeclaration;
    consentLog.landDeclaration = { consentedAt: now };
  }
  patch.sensitive_fields_consent = consentLog;

  const { error } = await supabase.from("afrique_ids").update(patch).eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Saved. This is never used for Kebu Score or credit decisions and is never shown on your public profile.",
  });
}
