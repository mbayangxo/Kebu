import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { ensureAfriqueIdForUser } from "@/lib/afrique-id/ensure-afrique-id";

export const dynamic = "force-dynamic";

/**
 * AfriID profile depth — build-order item 4 of
 * docs/product/KEBU-AFRIID-KEBU-ID-REGISTRATION.md: birth/residence split,
 * occupation/skills, financial status. Explicitly "no biometrics yet" at
 * this step — these are self-reported profile fields, not a verification
 * claim, so no admin review gate here (unlike the heritage/verification
 * flow in ../route.ts's POST handler).
 */
const profileSchema = z.object({
  birthCountryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .optional()
    .nullable(),
  occupation: z.string().trim().max(160).optional().nullable(),
  skills: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  financialStatus: z.enum(["banked", "mobile_money_only", "unbanked"]).optional().nullable(),
});

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const ensured = await ensureAfriqueIdForUser({ supabase, userId: user.id });
  if (!ensured.ok) return NextResponse.json({ error: ensured.error }, { status: 500 });

  const { data } = await supabase
    .from("afrique_ids")
    .select("birth_country_code, occupation, skills, financial_status")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    profile: {
      birthCountryCode: data?.birth_country_code ?? null,
      occupation: data?.occupation ?? null,
      skills: data?.skills ?? [],
      financialStatus: data?.financial_status ?? null,
    },
  });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const ensured = await ensureAfriqueIdForUser({ supabase, userId: user.id });
  if (!ensured.ok) return NextResponse.json({ error: ensured.error }, { status: 500 });

  const patch: Record<string, unknown> = {};
  if (parsed.data.birthCountryCode !== undefined) patch.birth_country_code = parsed.data.birthCountryCode;
  if (parsed.data.occupation !== undefined) patch.occupation = parsed.data.occupation || null;
  if (parsed.data.skills !== undefined) patch.skills = parsed.data.skills;
  if (parsed.data.financialStatus !== undefined) patch.financial_status = parsed.data.financialStatus;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided." }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("afrique_ids")
    .update(patch)
    .eq("user_id", user.id)
    .select("birth_country_code, occupation, skills, financial_status")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save profile." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    profile: {
      birthCountryCode: data.birth_country_code,
      occupation: data.occupation,
      skills: data.skills ?? [],
      financialStatus: data.financial_status,
    },
  });
}
