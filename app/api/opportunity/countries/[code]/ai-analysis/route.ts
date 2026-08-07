import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { aiRateLimit } from "@/lib/api-guard";
import { requireUser, logCreate } from "@/lib/create/auth";
import { createClient } from "@/lib/supabase/server";
import { countryCodeParamSchema } from "@/lib/opportunity/country-schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

/**
 * Generate AI opportunity analysis for a country.
 * Stored separately from verified profile fields.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const limited = aiRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { code: raw } = await params;
  const parsed = countryCodeParamSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid country code." }, { status: 400 });
  }
  const code = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured. Verified country data remains available without AI." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("country_profiles")
    .select("country, country_code, industries, overview, economy_overview, major_exports, major_imports")
    .eq("country_code", code)
    .eq("publish_status", "published")
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Country not found." }, { status: 404 });
  }

  const anthropic = new Anthropic({ apiKey });
  const prompt = `You are Kebu Opportunity AI. Write an opportunity analysis for entrepreneurs considering ${profile.country} (${code}).

Use this curated context (treat as background, not gospel):
Industries: ${(profile.industries ?? []).join(", ")}
Overview: ${profile.overview ?? "n/a"}
Economy: ${profile.economy_overview ?? "n/a"}
Exports: ${(profile.major_exports ?? []).join(", ")}
Imports: ${(profile.major_imports ?? []).join(", ")}

Rules:
- Clearly mark assumptions.
- Do NOT invent precise official statistics.
- Structure with markdown headings.
- Include: promising opportunity themes, skills/capital considerations, risks, and what to validate next.
- End with a short "Requires validation" checklist.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "AI returned no text." }, { status: 502 });
    }

    const { data: row, error } = await supabase
      .from("country_ai_analyses")
      .insert({
        country_code: code,
        label: "ai_generated",
        prompt_summary: `Opportunity analysis for ${profile.country}`,
        analysis_markdown: textBlock.text,
        model_version: "claude-sonnet-4-20250514",
        confidence: "low",
        created_by: user.id,
      })
      .select("id, country_code, label, prompt_summary, analysis_markdown, model_version, confidence, created_at")
      .single();

    if (error || !row) {
      logCreate("opportunity.ai_save_failed", { userId: user.id, code, message: error?.message });
      return NextResponse.json(
        {
          error: error?.message?.includes("does not exist")
            ? "Apply migration 009 for country_ai_analyses."
            : "Could not save AI analysis.",
          detail: error?.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analysis: row,
      disclaimer:
        "This analysis is AI-generated. It is not verified public data and requires validation before business decisions.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI generation failed" },
      { status: 502 }
    );
  }
}
