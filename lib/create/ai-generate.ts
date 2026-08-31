import Anthropic from "@anthropic-ai/sdk";
import {
  type CreateWebsiteBrief,
  type WebsiteDefinition,
  validateWebsiteDefinition,
  themeSchema,
} from "./website-schema";
import { TEMPLATE_SEEDS } from "./templates-seed";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "site";
}

/** Deterministic structured site from brief — used for blank + AI repair fallback. */
export function buildStructuredSiteFromBrief(brief: CreateWebsiteBrief): WebsiteDefinition {
  const title = brief.businessName;
  const theme = themeSchema.parse({
    primary: "#0F0D33",
    accent: "#00C851",
    background: "#FAFAF8",
    text: "#0F0D33",
  });
  return {
    schemaVersion: "website-v1",
    title,
    theme,
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "nav-1",
            type: "navigation",
            props: {
              brand: title,
              links: [
                { label: "Home", href: "#" },
                { label: "About", href: "#about" },
                { label: "Contact", href: "#contact" },
              ],
            },
          },
          {
            id: "hero-1",
            type: "hero",
            props: {
              heading: title,
              subheading: brief.description.slice(0, 400),
              buttonLabel: "Contact us",
              buttonHref: "#contact",
              align: "center",
              background: theme.primary,
            },
          },
          {
            id: "about-1",
            type: "text",
            props: {
              heading: "About",
              body: brief.description,
            },
          },
          {
            id: "feat-1",
            type: "features",
            props: {
              heading: "What we offer",
              items: [
                { title: brief.category, body: `Serving customers in ${brief.countryCode}.` },
                { title: "Local first", body: "Built for African markets and mobile-first visitors." },
                { title: "Easy contact", body: "Reach us by phone, email, or WhatsApp." },
              ],
            },
          },
          {
            id: "contact-1",
            type: "contact",
            props: { heading: "Contact", email: "", phone: "", address: "" },
          },
          {
            id: "footer-1",
            type: "footer",
            props: { text: `© ${title} · ${brief.countryCode}`, links: [] },
          },
        ],
      },
    ],
  };
}

export function definitionFromTemplateSlug(slug: string, brief: CreateWebsiteBrief): WebsiteDefinition | null {
  const seed = TEMPLATE_SEEDS.find((t) => t.slug === slug);
  if (!seed) return null;
  const def = structuredClone(seed.definition) as WebsiteDefinition;
  def.title = brief.businessName;

  const artistUpper = brief.businessName.toUpperCase();

  for (const page of def.pages) {
    for (const section of page.sections) {
      if (section.type === "maylecor-home") {
        section.props = {
          ...section.props,
          artistName: artistUpper,
        };
      } else if (section.type === "maylecor-music") {
        section.props = {
          ...section.props,
          artistName: artistUpper,
        };
      } else if (section.type === "legally-blonde-hero") {
        section.props = {
          ...section.props,
          title: brief.businessName,
        };
      }
    }
  }

  const nav = def.pages[0]?.sections.find((s) => s.type === "navigation");
  if (nav) nav.props = { ...nav.props, brand: brief.businessName };
  const hero = def.pages[0]?.sections.find((s) => s.type === "hero");
  if (hero) {
    hero.props = {
      ...hero.props,
      heading: brief.businessName,
      subheading: brief.description.slice(0, 400),
    };
  }
  return def;
}

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

export async function generateWebsiteWithAi(brief: CreateWebsiteBrief): Promise<
  | { ok: true; definition: WebsiteDefinition; usedAi: boolean; repaired: boolean }
  | { ok: false; error: string }
> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "ANTHROPIC_API_KEY is not configured. Use a template or blank site, or set the AI key." };
  }

  const anthropic = new Anthropic({ apiKey });
  const system = `You are Yande, Kebu's AI site builder. Generate Kebu website structures. Return ONLY JSON matching schemaVersion "website-v1".
Allowed section types: navigation, hero, text, image, gallery, features, testimonials, faq, contact, whatsapp, footer.
Do not include HTML, scripts, or markdown. Keep text concise. Include a home page with navigation, hero, at least one content section, contact, and footer.`;

  const userPrompt = `Create a website for:
Business: ${brief.businessName}
Category: ${brief.category}
Country: ${brief.countryCode}
Language: ${brief.locale}
Description: ${brief.description}
Desired pages: ${brief.desiredPages.join(", ")}
Visual direction: ${brief.visualDirection ?? "clean African modern"}

JSON shape:
{
  "schemaVersion": "website-v1",
  "title": "...",
  "theme": { "primary": "#0F0D33", "accent": "#00C851", "background": "#FAFAF8", "text": "#0F0D33", "fontDisplay": "Fraunces", "fontBody": "system-ui", "spacing": "comfortable" },
  "pages": [{ "slug": "home", "title": "Home", "sections": [{ "id": "hero-1", "type": "hero", "props": { ... } }] }]
}`;

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
      return { ok: true, definition: validated.data, usedAi: true, repaired: false };
    }

    // One repair attempt
    raw = await call(
      `${userPrompt}\n\nPREVIOUS OUTPUT FAILED VALIDATION:\n${validated.error}\n${JSON.stringify(validated.issues)}\nReturn corrected JSON only.`
    );
    validated = validateWebsiteDefinition(raw);
    if (validated.ok) {
      return { ok: true, definition: validated.data, usedAi: true, repaired: true };
    }

    return {
      ok: false,
      error: `AI output failed schema validation after repair: ${validated.error}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "AI generation failed",
    };
  }
}

export function suggestSubdomain(businessName: string): string {
  return slugify(businessName);
}
