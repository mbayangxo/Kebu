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

const KD_VISUAL_KEYS = [
  "backgroundCss",
  "backgroundImage",
  "logoImage",
  "collagePhotos",
  "displayFont",
  "navButtonBg",
  "logoColor",
  "logoMirrorColor",
  "gradientFrom",
  "gradientVia",
  "gradientTo",
] as const;

const LB_VISUAL_KEYS = [
  "backgroundLayer",
  "titleLogo",
  "cutoutLeft",
  "cutoutRight",
  "cutoutAccent",
  "cutoutSparkle",
  "macbook",
  "sparkleGif",
  "heroPhoto",
  "displayFont",
  "scrollMode",
  "extraCutouts",
  "layerMoves",
] as const;

function isBlankUrl(v: unknown): boolean {
  return typeof v !== "string" || !v.trim();
}

function collageLooksWiped(next: unknown, prev: unknown): boolean {
  if (!Array.isArray(prev) || prev.length === 0) return false;
  if (!Array.isArray(next) || next.length === 0) return true;
  const nextHasSrc = next.some(
    (p) => p && typeof p === "object" && String((p as { src?: string }).src ?? "").trim(),
  );
  return !nextHasSrc;
}

function mergeSocialIcons(
  prev: unknown,
  next: unknown,
): { label: string; href: string; iconUrl: string }[] | undefined {
  if (!Array.isArray(prev) && !Array.isArray(next)) return undefined;
  const prevLinks = Array.isArray(prev) ? prev : [];
  const nextLinks = Array.isArray(next) ? next : prevLinks;
  return nextLinks.map((link, i) => {
    const n = (link && typeof link === "object" ? link : {}) as {
      label?: string;
      href?: string;
      iconUrl?: string;
    };
    const p = (prevLinks[i] && typeof prevLinks[i] === "object" ? prevLinks[i] : {}) as {
      iconUrl?: string;
    };
    return {
      label: String(n.label ?? ""),
      href: String(n.href ?? ""),
      iconUrl: !isBlankUrl(n.iconUrl) ? String(n.iconUrl) : String(p.iconUrl ?? ""),
    };
  });
}

/**
 * Deterministic preserve: AI may rewrite copy, but must not wipe Wix/Tilda visual assets.
 */
export function preserveTemplateVisualAssets(
  current: WebsiteDefinition,
  improved: WebsiteDefinition,
): WebsiteDefinition {
  const pages = improved.pages.map((page) => {
    const currentPage =
      current.pages.find((p) => p.slug === page.slug) ??
      (page.slug === "home" ? current.pages.find((p) => p.slug === "home") : undefined);

    const sections = page.sections.map((section, idx) => {
      const prev =
        currentPage?.sections.find((s) => s.type === section.type && s.id && section.id && s.id === section.id) ??
        currentPage?.sections.find((s) => s.type === section.type) ??
        currentPage?.sections[idx];

      if (!prev || prev.type !== section.type) return section;

      if (section.type === "kdirection-home" || section.type === "kdirection-page") {
        const nextProps = { ...(section.props as Record<string, unknown>) };
        const prevProps = prev.props as Record<string, unknown>;
        for (const key of KD_VISUAL_KEYS) {
          if (key === "collagePhotos") {
            if (collageLooksWiped(nextProps.collagePhotos, prevProps.collagePhotos)) {
              nextProps.collagePhotos = prevProps.collagePhotos;
            }
            continue;
          }
          if (isBlankUrl(nextProps[key]) && !isBlankUrl(prevProps[key])) {
            nextProps[key] = prevProps[key];
          }
          if (key === "backgroundCss" && !String(nextProps.backgroundCss ?? "").includes("radial-gradient")) {
            if (String(prevProps.backgroundCss ?? "").includes("radial-gradient")) {
              nextProps.backgroundCss = prevProps.backgroundCss;
            }
          }
          if (key === "displayFont" && !nextProps.displayFont && prevProps.displayFont) {
            nextProps.displayFont = prevProps.displayFont;
          }
        }
        const social = mergeSocialIcons(prevProps.socialLinks, nextProps.socialLinks);
        if (social) nextProps.socialLinks = social;
        return { ...section, props: nextProps };
      }

      if (section.type === "legally-blonde-hero") {
        const nextProps = { ...(section.props as Record<string, unknown>) };
        const prevProps = prev.props as Record<string, unknown>;
        for (const key of LB_VISUAL_KEYS) {
          if (key === "extraCutouts" || key === "layerMoves") {
            if (
              (key === "extraCutouts" && collageLooksWiped(nextProps.extraCutouts, prevProps.extraCutouts)) ||
              (key === "layerMoves" &&
                (!nextProps.layerMoves || Object.keys(nextProps.layerMoves as object).length === 0) &&
                prevProps.layerMoves &&
                Object.keys(prevProps.layerMoves as object).length > 0)
            ) {
              nextProps[key] = prevProps[key];
            }
            continue;
          }
          if (isBlankUrl(nextProps[key]) && !isBlankUrl(prevProps[key])) {
            nextProps[key] = prevProps[key];
          }
        }
        // Only force Russian restore when AI wiped cutouts to empty — not when user uploaded custom URLs.
        const aiWipedCutouts =
          isBlankUrl(nextProps.cutoutLeft) &&
          isBlankUrl(nextProps.cutoutRight) &&
          isBlankUrl(nextProps.cutoutAccent) &&
          (String(prevProps.cutoutLeft ?? "").includes("tildacdn") ||
            String(prevProps.cutoutLeft ?? "").includes("templates/legally-blonde"));
        if (aiWipedCutouts) {
          for (const key of LB_VISUAL_KEYS) {
            if (key === "extraCutouts" || key === "layerMoves") continue;
            if (prevProps[key] !== undefined) nextProps[key] = prevProps[key];
          }
        }
        const social = mergeSocialIcons(prevProps.socialLinks, nextProps.socialLinks);
        if (social) nextProps.socialLinks = social;
        return { ...section, props: nextProps };
      }

      return section;
    });

    return { ...page, sections };
  });

  return { ...improved, pages };
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
  const system = `You are Yande, Kebu's AI site assistant. Improve Kebu website structures. Return ONLY JSON matching schemaVersion "website-v1".
Allowed section types: navigation, hero, text, image, gallery, features, testimonials, faq, contact, whatsapp, footer, maylecor-home, maylecor-music, legally-blonde-hero, kdirection-home, kdirection-page.
Do not include HTML, scripts, or markdown. Keep copy clear for African youth entrepreneurs — plain language, mobile-friendly, concrete next actions.
Preserve useful facts from the current site (phones, emails, WhatsApp, brand name, photo URLs, collagePhotos positions, socialLinks hrefs/icons, logoImage) unless the user asks to change them.
For kdirection-home: keep Wix structure (backgroundCss radial gradients, Oswald displayFont, yellow navButtonBg, mirrored wordmark, collagePhotos array with rotate/topPct/leftPct/widthPct). You may rewrite mission, brandLine1/2, footerText, nav link labels, and social link labels/hrefs. Do not wipe collagePhotos or set empty image URLs.
For legally-blonde-hero: keep Tilda cutout URLs (backgroundLayer, cutoutLeft/Right/Accent, titleLogo) unless the user asks to swap photos. Prefer scrollMode "parallax" and displayFont "Steelfish" for the Russian layout.
Keep at least one home page. Never invent fake phone numbers.`;

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

  function finalize(def: WebsiteDefinition, repaired: boolean) {
    const merged = preserveTemplateVisualAssets(current, def);
    const again = validateWebsiteDefinition(merged);
    if (!again.ok) {
      return { ok: false as const, error: `AI output failed after asset preserve: ${again.error}` };
    }
    return { ok: true as const, definition: again.data, repaired };
  }

  try {
    let raw = await call(userPrompt);
    let validated = validateWebsiteDefinition(raw);
    if (validated.ok) {
      return finalize(validated.data, false);
    }

    raw = await call(
      `${userPrompt}\n\nPREVIOUS OUTPUT FAILED VALIDATION:\n${validated.error}\n${JSON.stringify(validated.issues)}\nReturn corrected JSON only.`
    );
    validated = validateWebsiteDefinition(raw);
    if (validated.ok) {
      return finalize(validated.data, true);
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
