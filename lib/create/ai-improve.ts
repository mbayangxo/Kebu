import Anthropic from "@anthropic-ai/sdk";
import type { AiImproveBrief, WebsiteDefinition } from "./website-schema";
import { validateWebsiteDefinition } from "./website-schema";

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("AI did not return JSON");
  }
}

/**
 * Rewrite an existing validated website-v1 definition with AI.
 * Never returns unvalidated JSON. One repair attempt, then fail closed.
 */
export async function improveWebsiteWithAi(
  current: WebsiteDefinition,
  brief: AiImproveBrief
): Promise<
  | { ok: true; definition: WebsiteDefinition; repaired: boolean }
  | { ok: false; error: string }
> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "AI is not set up yet. Ask Kebu support to enable ANTHROPIC_API_KEY, or keep editing by hand.",
    };
  }

  const anthropic = new Anthropic({ apiKey });
  const system = `You improve Kebu website structures. Return ONLY JSON matching schemaVersion "website-v1".
Allowed section types: navigation, hero, text, image, gallery, features, testimonials, faq, contact, whatsapp, footer.
Do not include HTML, scripts, or markdown. Keep copy clear for African youth entrepreneurs — plain language, mobile-friendly, concrete next actions.
Preserve useful facts from the current site (phones, emails, WhatsApp, brand name) unless the user asks to change them.
Keep at least one home page with navigation, hero, content, and footer when possible.`;

  const focus =
    brief.focusSectionTypes && brief.focusSectionTypes.length > 0
      ? `Focus changes on these section types: ${brief.focusSectionTypes.join(", ")}. Leave other sections mostly intact.`
      : "Improve clarity, offer strength, and contact readiness across the whole home page.";

  const userInstruction = brief.instruction?.trim()
    ? `User request: ${brief.instruction.trim()}`
    : "User request: Make this website clearer and more persuasive for first-time visitors on mobile.";

  const userPrompt = `${userInstruction}
${focus}

Current website JSON:
${JSON.stringify(current)}

Return a full improved website-v1 JSON object only.`;

  async function call(prompt: string) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        { role: "user", content: system },
        { role: "user", content: prompt },
      ],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text in AI response");
    return extractJson(textBlock.text);
  }

  try {
    let raw = await call(userPrompt);
    let validated = validateWebsiteDefinition(raw);
    if (validated.ok) {
      return { ok: true, definition: validated.data, repaired: false };
    }

    raw = await call(
      `${userPrompt}\n\nPREVIOUS OUTPUT FAILED VALIDATION:\n${validated.error}\n${JSON.stringify(validated.issues)}\nReturn corrected JSON only.`
    );
    validated = validateWebsiteDefinition(raw);
    if (validated.ok) {
      return { ok: true, definition: validated.data, repaired: true };
    }

    return {
      ok: false,
      error: `AI output failed schema validation after repair: ${validated.error}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "AI improve failed",
    };
  }
}
