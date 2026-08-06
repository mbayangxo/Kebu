import { NextRequest, NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { aiRateLimit } from "@/lib/api-guard";
import { assertBusinessEditor } from "@/lib/create/business-access";
import {
  buildStructuredSiteFromBrief,
  definitionFromTemplateSlug,
  generateWebsiteWithAi,
  suggestSubdomain,
} from "@/lib/create/ai-generate";
import { persistWebsiteDefinition } from "@/lib/create/persist-site";
import { createWebsiteBriefSchema, validateWebsiteDefinition } from "@/lib/create/website-schema";

export const dynamic = "force-dynamic";

/** Create website from blank, template, or AI (validated structured schema). */
export async function POST(req: NextRequest) {
  const limited = aiRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createWebsiteBriefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }
  const brief = parsed.data;

  const access = await assertBusinessEditor(supabase, brief.businessId, user.id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const subdomain = brief.subdomain || suggestSubdomain(brief.businessName);

  let definition;
  let usedAi = false;
  let repaired = false;
  let templateId: string | null = null;

  if (brief.mode === "blank") {
    definition = buildStructuredSiteFromBrief(brief);
  } else if (brief.mode === "template") {
    if (!brief.templateSlug) {
      return NextResponse.json({ error: "templateSlug required for template mode." }, { status: 400 });
    }
    const fromTemplate = definitionFromTemplateSlug(brief.templateSlug, brief);
    if (!fromTemplate) {
      return NextResponse.json({ error: "Unknown template." }, { status: 404 });
    }
    definition = fromTemplate;
    const { data: tpl } = await supabase
      .from("site_templates")
      .select("id")
      .eq("slug", brief.templateSlug)
      .maybeSingle();
    templateId = tpl?.id ?? null;
  } else {
    const ai = await generateWebsiteWithAi(brief);
    if (!ai.ok) {
      return NextResponse.json({ error: ai.error }, { status: 502 });
    }
    definition = ai.definition;
    usedAi = ai.usedAi;
    repaired = ai.repaired;
  }

  const validated = validateWebsiteDefinition(definition);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error, issues: validated.issues }, { status: 400 });
  }

  const result = await persistWebsiteDefinition({
    supabase,
    user,
    businessId: brief.businessId,
    definition: validated.data,
    meta: {
      source: brief.mode,
      category: brief.category,
      description: brief.description,
      countryCode: brief.countryCode,
      locale: brief.locale,
      visualDirection: brief.visualDirection,
      subdomain,
      templateId,
    },
  });

  if (!result.ok) {
    logCreate("website.create_failed", { userId: user.id, error: result.error });
    return NextResponse.json({ error: result.error, detail: result.detail }, { status: result.status });
  }

  logCreate("website.created", {
    userId: user.id,
    projectId: result.project.id,
    mode: brief.mode,
    usedAi,
    repaired,
  });

  return NextResponse.json(
    {
      project: result.project,
      usedAi,
      repaired,
      publicPathPreview: `/sites/${subdomain}`,
    },
    { status: 201 }
  );
}
