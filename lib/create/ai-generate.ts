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

/** Pages Yande should draft from a business category (words → full site). */
export function pagesForCategory(category: string): string[] {
  const c = category.trim().toLowerCase();
  if (["fashion", "beauty", "store", "shop"].includes(c)) {
    return ["home", "shop", "about", "contact"];
  }
  if (c === "restaurant") return ["home", "menu", "about", "contact"];
  if (["music", "film", "public figure"].includes(c)) return ["home", "work", "about", "contact"];
  if (["agriculture", "technology", "services", "business"].includes(c)) {
    return ["home", "services", "about", "contact"];
  }
  return ["home", "about", "contact"];
}

function pageNavLinks(pages: string[]) {
  return pages.map((slug) => ({
    label: slug === "home" ? "Home" : slug.charAt(0).toUpperCase() + slug.slice(1),
    href: slug === "home" ? "#" : `/${slug}`,
  }));
}

/** Deterministic structured site from brief — blank mode + AI fallback (always editable schema). */
export function buildStructuredSiteFromBrief(brief: CreateWebsiteBrief): WebsiteDefinition {
  const title = brief.businessName;
  const theme = themeSchema.parse({
    primary: "#0F0D33",
    accent: "#00C851",
    background: "#FAFAF8",
    text: "#0F0D33",
  });
  const pageSlugs =
    brief.desiredPages.length > 1 ? brief.desiredPages.map((p) => p.toLowerCase()) : pagesForCategory(brief.category);
  const unique = [...new Set(pageSlugs.filter(Boolean))];
  const slugs = unique.includes("home") ? unique : ["home", ...unique];
  const navLinks = pageNavLinks(slugs);

  const pages = slugs.map((slug, i) => {
    const label = slug === "home" ? "Home" : slug.charAt(0).toUpperCase() + slug.slice(1);
    const isHome = slug === "home";
    const sections = [
      {
        id: `nav-${i + 1}`,
        type: "navigation" as const,
        props: { brand: title, links: navLinks },
      },
      {
        id: `${slug}-hero`,
        type: "hero" as const,
        props: {
          heading: isHome ? title : label,
          subheading: isHome
            ? brief.description.slice(0, 400)
            : `${label} — ${title} · ${brief.countryCode}`,
          buttonLabel: isHome ? "Get in touch" : "Back home",
          buttonHref: isHome ? "/contact" : "/",
          align: "center",
          background: theme.primary,
        },
      },
      {
        id: `${slug}-body`,
        type: "text" as const,
        props: {
          heading: isHome ? "About" : label,
          body: isHome
            ? brief.description
            : `${title} is a ${brief.category} business in ${brief.countryCode}. ${brief.description.slice(0, 280)}`,
        },
      },
      ...(isHome
        ? [
            {
              id: "feat-1",
              type: "features" as const,
              props: {
                heading: "What we offer",
                items: [
                  { title: brief.category, body: `Serving customers in ${brief.countryCode}.` },
                  { title: "Local first", body: "Built for African markets and mobile-first visitors." },
                  { title: "Talk to us", body: "Reach us by phone, email, or WhatsApp when you publish." },
                ],
              },
            },
          ]
        : []),
      ...(slug === "shop" || slug === "menu" || slug === "services"
        ? [
            {
              id: `${slug}-faq`,
              type: "faq" as const,
              props: {
                heading: "Questions",
                items: [
                  {
                    question: "How do I order?",
                    answer:
                      "Contact us from this site. Add products in Kebu Shop when you are ready to sell online.",
                  },
                  {
                    question: "Do you deliver?",
                    answer: "Tell visitors your delivery areas in this section after you edit.",
                  },
                ],
              },
            },
          ]
        : []),
      {
        id: `${slug}-contact`,
        type: "contact" as const,
        props: { heading: "Contact", email: "", phone: "", address: "" },
      },
      {
        id: `${slug}-footer`,
        type: "footer" as const,
        props: { text: `© ${title} · ${brief.countryCode}`, links: [] },
      },
    ];
    return { slug, title: label, sections };
  });

  return {
    schemaVersion: "website-v1",
    title,
    theme,
    pages,
  };
}

/** A4 — site built around the merchant’s uploaded photos (gallery + hero image). */
export function buildStructuredSiteFromPhotos(brief: CreateWebsiteBrief): WebsiteDefinition {
  const photos = (brief.photoUrls ?? []).filter(Boolean).slice(0, 8);
  const base = buildStructuredSiteFromBrief({
    ...brief,
    mode: "blank",
    desiredPages:
      brief.desiredPages.length > 1
        ? brief.desiredPages
        : pagesForCategory(brief.category),
  });
  if (photos.length === 0) return base;

  const heroPhoto = photos[0]!;
  const galleryItems = photos.map((url, i) => ({
    src: url,
    alt: i === 0 ? brief.businessName : `${brief.businessName} photo ${i + 1}`,
    href: "",
  }));

  for (const page of base.pages) {
    if (page.slug !== "home") continue;
    const heroIdx = page.sections.findIndex((s) => s.type === "hero");
    if (heroIdx >= 0) {
      page.sections.splice(heroIdx + 1, 0, {
        id: "photos-hero-image",
        type: "image",
        props: {
          src: heroPhoto,
          alt: brief.businessName,
          caption: brief.description.slice(0, 120),
        },
      });
    }
    const hasGallery = page.sections.some((s) => s.type === "gallery");
    if (!hasGallery) {
      const footerIdx = page.sections.findIndex((s) => s.type === "footer");
      const gallerySection = {
        id: "photos-gallery",
        type: "gallery" as const,
        props: {
          heading: "From our photos",
          layout: "grid" as const,
          items: galleryItems,
        },
      };
      if (footerIdx >= 0) page.sections.splice(footerIdx, 0, gallerySection);
      else page.sections.push(gallerySection);
    } else {
      const gallery = page.sections.find((s) => s.type === "gallery");
      if (gallery) {
        gallery.props = {
          ...gallery.props,
          heading: "From our photos",
          items: galleryItems,
        };
      }
    }
  }

  return base;
}

export function definitionFromTemplateSlug(slug: string, brief: CreateWebsiteBrief): WebsiteDefinition | null {
  const seed = TEMPLATE_SEEDS.find((t) => t.slug === slug);
  if (!seed) return null;
  const def = structuredClone(seed.definition) as WebsiteDefinition;
  def.title = brief.businessName;

  const artistUpper = brief.businessName.toUpperCase();
  const preserveCustomHero = slug === "agency-dklns" || slug === "production-ndaoan-house";

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
  if (!preserveCustomHero) {
    const hero = def.pages[0]?.sections.find((s) => s.type === "hero");
    if (hero) {
      hero.props = {
        ...hero.props,
        heading: brief.businessName,
        subheading: brief.description.slice(0, 400),
      };
    }
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

function withPages(brief: CreateWebsiteBrief): CreateWebsiteBrief {
  if (brief.desiredPages.length > 1) return brief;
  return { ...brief, desiredPages: pagesForCategory(brief.category) };
}

function fallbackFromBrief(brief: CreateWebsiteBrief): {
  ok: true;
  definition: WebsiteDefinition;
  usedAi: false;
  repaired: false;
  fallback: true;
} {
  return {
    ok: true,
    definition: buildStructuredSiteFromBrief(withPages(brief)),
    usedAi: false,
    repaired: false,
    fallback: true,
  };
}

export async function generateWebsiteWithAi(brief: CreateWebsiteBrief): Promise<
  | { ok: true; definition: WebsiteDefinition; usedAi: boolean; repaired: boolean; fallback?: boolean }
  | { ok: false; error: string }
> {
  const expanded = withPages(brief);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackFromBrief(expanded);
  }

  const anthropic = new Anthropic({ apiKey });
  const system = `You are Yande — Kebu's expert African website DESIGNER. Generate premium website structures. Return ONLY valid JSON matching schemaVersion "website-v1".

ALLOWED SECTION TYPES (use ALL of these, not just basic ones):
- navigation: {brand, links:[{label,href}], background, navSize}
- announcement-bar: {text, background, color, link} — thin top strip for offers
- editorial-hero: {heading, subheading, buttonLabel, buttonHref, image, overlayOpacity, align, minHeight} — full-bleed photo hero
- hero: {heading, subheading, buttonLabel, buttonHref, background, align, minHeight, image, overlayOpacity}
- marquee: {items:string[], separator, background, color, speed} — scrolling text strip
- split: {heading, body, buttonLabel, buttonHref, image, imagePosition:"left"|"right", background}
- text: {heading, body}
- gallery: {heading, layout:"grid"|"masonry"|"film", items:[{src,alt,href}]}
- features: {heading, items:[{title,body,image,href}]}
- testimonials: {heading, items:[{quote,name,role,avatar}]}
- faq: {heading, items:[{question,answer}]}
- contact: {heading, email, phone, address}
- whatsapp: {phone, label}
- newsletter: {heading, subheading, buttonLabel}
- products: linked from Kebu Shop — keep simple
- footer: {text, links:[{label,href}]}

DESIGN RULES:
- NEVER build boring hero + 3 equal cards + footer. Build magazine/editorial layouts.
- For fashion/beauty/luxury/music: use editorial-hero (90vh+), announcement-bar, marquee for energy, split for founder story, then premium testimonials.
- Use announcement-bar for sale/offer banners at top.
- Use marquee for energy between sections (thin strips with brand phrases).
- Use split sections for founder story, about, process — image one side, text other.
- Theme tokens must be STRONG and specific — never default/generic colors.
- For African-heritage brands: use earth tones, ochre, clay, kente golds, deep indigos, forest greens.
- All copy: specific and energetic, never placeholder lorem ipsum.
- Build EVERY desired page fully (home has the most sections, other pages are focused).
- FAQ items: { "question": "...", "answer": "..." }
- Footer links: [{label, href}] for policy, social, contact links.
- whatsapp section for ANY business with a phone number (Africa = WhatsApp-first).

Do not output HTML, scripts, or markdown. Only JSON.`;

  const userPrompt = `Design a complete, premium multi-page website for:
Business: ${brief.businessName}
Category: ${brief.category}
Country: ${brief.countryCode}
Language: ${brief.locale}
Description / creative brief: ${brief.description}
Desired pages (build ALL of these fully): ${expanded.desiredPages.join(", ")}
Visual direction: ${brief.visualDirection ?? "editorial magazine feel — not a generic Shopify starter"}

JSON structure:
{
  "schemaVersion": "website-v1",
  "title": "Business Name",
  "theme": {
    "primary": "#hex — main brand color",
    "accent": "#hex — CTA / highlight color",
    "background": "#hex — page background",
    "text": "#hex — body text",
    "fontDisplay": "Fraunces|Syne|Bebas Neue|Playfair Display|Oswald",
    "fontBody": "system-ui",
    "spacing": "comfortable|compact|spacious",
    "surface": "#hex — card backgrounds"
  },
  "pages": [{
    "slug": "home",
    "title": "Home",
    "sections": [
      {"id": "unique-id", "type": "announcement-bar", "props": {...}},
      {"id": "unique-id", "type": "editorial-hero", "props": {...}},
      {"id": "unique-id", "type": "marquee", "props": {...}},
      ...more premium sections...
      {"id": "unique-id", "type": "footer", "props": {"text": "© Brand 2026", "links": []}}
    ]
  }]
}

Remember: NEVER use generic placeholder colors or text. Every section must be designed with intention for this specific business.`;

  async function call(prompt: string) {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
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

    return fallbackFromBrief(expanded);
  } catch {
    return fallbackFromBrief(expanded);
  }
}

export function suggestSubdomain(businessName: string): string {
  return slugify(businessName);
}
