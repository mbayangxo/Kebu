import { readCompanyJson } from "@/lib/company/read-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { builderRateLimit } from "@/lib/api-guard";
import { companyPortalEnabled } from "@/lib/company/model";
import {
  businessNamePattern,
  nameResearchSources,
} from "@/lib/business/name-research";
import { reviewedEmployerIds } from "@/lib/liguey/employer-safety";
const reply = (data: object, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const r = await auth.supabase
    .from("business_name_shortlists")
    .select("id,name,country_code,goods_services,created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return r.error
    ? reply({ error: "Could not load your saved names." }, 503)
    : reply({ names: r.data, sources: nameResearchSources });
}
export async function POST(req: Request) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const limited = builderRateLimit(req);
  if (limited) return limited;
  if (!companyPortalEnabled())
    return reply({ error: "Naming research is not enabled here yet." }, 503);
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const p = z
    .object({
      id: z.uuid(),
      name: z.string().trim().min(2).max(120),
      country: z.string().regex(/^[A-Z]{2}$/),
      goods: z.string().trim().min(2).max(1000),
    })
    .safeParse(await readCompanyJson(req));
  if (!p.success)
    return reply(
      {
        error:
          "Enter a name, country code and the goods or services you plan to offer.",
      },
      400,
    );
  const db = createServiceClient();
  if (!db) return reply({ error: "Company research is unavailable." }, 503);
  const s = p.data,
    pattern = businessNamePattern(s.name);
  const found = await Promise.all(
    ["legal_name", "trading_name"].map((field) =>
      db
        .from("businesses")
        .select("id,legal_name,trading_name,public_kebu_id,country_code")
        .eq("lifecycle_status", "active")
        .eq("country_code", s.country)
        .ilike(field, pattern)
        .limit(50),
    ),
  );
  if (found.some((r) => r.error))
    return reply(
      {
        error:
          "Could not check company names. No trademark conclusion was made.",
      },
      503,
    );
  const rows = [
    ...new Map(
      found.flatMap((r) => r.data ?? []).map((row) => [row.id, row]),
    ).values(),
  ];
  const approved = await reviewedEmployerIds(
    db,
    rows.map((row) => row.id),
  );
  if (approved.error)
    return reply({ error: "Company review information is unavailable." }, 503);
  const inserted = await auth.supabase
    .from("business_name_shortlists")
    .upsert(
      {
        id: s.id,
        user_id: auth.user.id,
        name: s.name,
        country_code: s.country,
        goods_services: s.goods,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (inserted.error)
    return reply(
      { error: "Could not save this research. Your input is kept." },
      503,
    );
  const saved = await auth.supabase
    .from("business_name_shortlists")
    .select("name,country_code,goods_services")
    .eq("id", s.id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (
    saved.error ||
    saved.data?.name !== s.name ||
    saved.data?.country_code !== s.country ||
    saved.data?.goods_services !== s.goods
  )
    return reply(
      { error: "This research request changed. Refresh before retrying." },
      409,
    );
  return reply({
    saved: true,
    matches: rows
      .filter((row) => approved.ids.has(row.id))
      .map((row) => ({
        name: row.trading_name || row.legal_name,
        kebuId: row.public_kebu_id,
        country: row.country_code,
      })),
    coverage:
      "Reviewed, active Kebu employers in the selected country only. Substring matching; up to 50 legal and 50 trading names examined. This is not a complete business or trademark register.",
    trademarkCheck: "not_performed",
    sources: nameResearchSources,
  });
}
