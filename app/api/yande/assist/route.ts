import { type NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { rowToOpportunityProfile } from "@/lib/opportunity/intake-schema";
import { formatProfileForYande } from "@/lib/account/kebu-personalization";
import { createClient } from "@/lib/supabase/server";
import { aiRateLimit, clamp } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  pathname: z.string().trim().max(200).optional(),
});

const YANDE_SYSTEM = `You are Yande — Kebu's AI assistant for African youth.

You help with: exploring Africa (Opportunity OS), learning what to build, Kebu Builder (websites/stores), Kebu Create, optional Kebu ID (business identity), B2B directory, domains, and next steps.

Rules:
- Many users are NOT starting a business yet — do not push registration or Kebu ID unless they want to build.
- Personal intake at /welcome teaches Kebu about the user — use that context when provided.
- Plain language. One clear next action. Short paragraphs.`;

export async function POST(req: NextRequest) {
  const limited = aiRateLimit(req);
  if (limited) return limited;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Yande is not configured on this server yet (missing AI key)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let context = "";
  if (user) {
    const { count } = await supabase
      .from("business_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active");
    const { count: projectCount } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    const { data: intakeRow } = await supabase
      .from("opportunity_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    const personal = intakeRow ? formatProfileForYande(rowToOpportunityProfile(intakeRow)) : "Personal intake not completed — suggest /welcome (no business required).";
    context = `User signed in. Active business memberships: ${count ?? 0}. Website projects: ${projectCount ?? 0}. Personal profile: ${personal}`;
  } else {
    context = "User is not signed in. Suggest sign up — /welcome personalizes Kebu without requiring a business.";
  }

  const path = parsed.data.pathname ?? "/";
  const userMessage = `Page: ${path}\n${context}\n\nUser question:\n${parsed.data.message}`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: YANDE_SYSTEM,
      messages: [{ role: "user", content: clamp(userMessage, 4000) }],
    });

    const text =
      response.content
        .filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("\n")
        .trim() || "I could not answer that — try again in a moment.";

    return NextResponse.json({ reply: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
