import type { StudioDesignType } from "@/lib/studio/canvas-document";
import { defaultCanvasDocument, mirrorPageToDocument } from "@/lib/studio/canvas-document";

export type StudioTemplateCategory = "social" | "print" | "promo" | "commerce" | "events";

export type StudioTemplate = {
  id: string;
  label: string;
  designType: StudioDesignType;
  description: string;
  category: StudioTemplateCategory;
  /** Search / filter chips */
  tags: string[];
  /** Optional preset overrides applied on top of defaultCanvasDocument */
  preset?: {
    backgroundColor?: string;
    headline?: string;
    subheadline?: string;
    cta?: string;
    accentColor?: string;
  };
};

export const STUDIO_TEMPLATE_CATEGORIES: {
  id: StudioTemplateCategory | "all";
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "social", label: "Social" },
  { id: "commerce", label: "Commerce" },
  { id: "events", label: "Events" },
  { id: "print", label: "Print" },
  { id: "promo", label: "Promo" },
];

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: "ig-post-sale",
    label: "Instagram post — sale",
    designType: "instagram_post",
    description: "Square promo for feed — headline + CTA",
    category: "commerce",
    tags: ["instagram", "sale", "discount", "feed"],
    preset: {
      backgroundColor: "#0F0D33",
      headline: "Weekend sale",
      subheadline: "Up to 30% off — this weekend only",
      cta: "Shop now",
      accentColor: "#E05A2B",
    },
  },
  {
    id: "ig-post-new-drop",
    label: "Instagram post — new drop",
    designType: "instagram_post",
    description: "Announce a product drop on feed",
    category: "commerce",
    tags: ["instagram", "drop", "product", "fashion"],
    preset: {
      backgroundColor: "#1C1917",
      headline: "New drop is live",
      subheadline: "Limited pieces — message to order",
      cta: "Order now",
      accentColor: "#F59E0B",
    },
  },
  {
    id: "ig-story-launch",
    label: "Instagram story — launch",
    designType: "instagram_story",
    description: "Vertical story — grand opening",
    category: "social",
    tags: ["instagram", "story", "launch", "opening"],
    preset: {
      backgroundColor: "#1a1a2e",
      headline: "We're open!",
      subheadline: "Visit us today",
      cta: "Get directions",
      accentColor: "#00C851",
    },
  },
  {
    id: "ig-story-flash",
    label: "Instagram story — flash sale",
    designType: "instagram_story",
    description: "Urgent vertical promo for 24h deals",
    category: "commerce",
    tags: ["instagram", "story", "flash", "sale"],
    preset: {
      backgroundColor: "#7F1D1D",
      headline: "Flash sale",
      subheadline: "Ends tonight at midnight",
      cta: "Buy now",
      accentColor: "#FBBF24",
    },
  },
  {
    id: "whatsapp-status",
    label: "WhatsApp status",
    designType: "whatsapp_status",
    description: "Quick vertical update for status",
    category: "social",
    tags: ["whatsapp", "status", "order"],
    preset: {
      backgroundColor: "#075E54",
      headline: "New drop",
      subheadline: "Message us to order",
      cta: "WhatsApp",
      accentColor: "#25D366",
    },
  },
  {
    id: "whatsapp-catalog",
    label: "WhatsApp — catalog tease",
    designType: "whatsapp_status",
    description: "Point customers to your catalog",
    category: "commerce",
    tags: ["whatsapp", "catalog", "shop"],
    preset: {
      backgroundColor: "#064E3B",
      headline: "Full catalog ready",
      subheadline: "Ask for the price list",
      cta: "Message us",
      accentColor: "#34D399",
    },
  },
  {
    id: "flyer-event",
    label: "Flyer — event",
    designType: "flyer",
    description: "Print-ready flyer for events",
    category: "events",
    tags: ["flyer", "event", "music", "print"],
    preset: {
      backgroundColor: "#FAFAF8",
      headline: "Live music night",
      subheadline: "Friday 8pm · Free entry",
      cta: "RSVP",
      accentColor: "#0F0D33",
    },
  },
  {
    id: "flyer-market",
    label: "Flyer — market day",
    designType: "flyer",
    description: "Weekend market / pop-up flyer",
    category: "events",
    tags: ["flyer", "market", "pop-up", "print"],
    preset: {
      backgroundColor: "#FFF7ED",
      headline: "Sunday market",
      subheadline: "Fresh goods · 9am–2pm",
      cta: "Find us",
      accentColor: "#C2410C",
    },
  },
  {
    id: "poster-opening",
    label: "Poster — grand opening",
    designType: "poster",
    description: "Classic 3:4 poster",
    category: "print",
    tags: ["poster", "opening", "print"],
    preset: {
      backgroundColor: "#0F0D33",
      headline: "Grand opening",
      subheadline: "Quality you can trust — made in Africa",
      cta: "Order on WhatsApp",
      accentColor: "#E05A2B",
    },
  },
  {
    id: "poster-beauty",
    label: "Poster — beauty launch",
    designType: "poster",
    description: "Skincare / beauty brand poster",
    category: "commerce",
    tags: ["poster", "beauty", "skincare", "launch"],
    preset: {
      backgroundColor: "#4C1D95",
      headline: "Glow starts here",
      subheadline: "Natural oils · Made in Senegal",
      cta: "Shop the line",
      accentColor: "#F5D0FE",
    },
  },
  {
    id: "fb-post-menu",
    label: "Facebook post — menu",
    designType: "facebook_post",
    description: "Square post for Facebook page",
    category: "promo",
    tags: ["facebook", "menu", "food"],
    preset: {
      backgroundColor: "#1877F2",
      headline: "Today's menu",
      subheadline: "Fresh every morning",
      cta: "See menu",
      accentColor: "#FFFFFF",
    },
  },
  {
    id: "fb-post-hire",
    label: "Facebook post — we're hiring",
    designType: "facebook_post",
    description: "Recruitment post for your page",
    category: "promo",
    tags: ["facebook", "hiring", "jobs"],
    preset: {
      backgroundColor: "#0F172A",
      headline: "We're hiring",
      subheadline: "Join the team — apply today",
      cta: "Apply",
      accentColor: "#38BDF8",
    },
  },
  {
    id: "social-square-quote",
    label: "Quote card",
    designType: "social_square",
    description: "Square quote / testimonial card",
    category: "social",
    tags: ["quote", "testimonial", "square"],
    preset: {
      backgroundColor: "#292524",
      headline: "“Best quality in the market.”",
      subheadline: "— Happy customer, Dakar",
      cta: "Read more",
      accentColor: "#E05A2B",
    },
  },
  {
    id: "social-square-thankyou",
    label: "Thank you card",
    designType: "social_square",
    description: "Thank customers after a purchase",
    category: "promo",
    tags: ["thank you", "customer", "square"],
    preset: {
      backgroundColor: "#14532D",
      headline: "Thank you",
      subheadline: "Your order means everything",
      cta: "Shop again",
      accentColor: "#86EFAC",
    },
  },
  {
    id: "banner-shop-header",
    label: "Banner — shop header",
    designType: "banner",
    description: "Wide web / storefront banner",
    category: "commerce",
    tags: ["banner", "web", "shop", "header"],
    preset: {
      backgroundColor: "#0F0D33",
      headline: "New season is live",
      subheadline: "Free delivery in Dakar this week",
      cta: "Shop now",
      accentColor: "#E05A2B",
    },
  },
  {
    id: "banner-event",
    label: "Banner — event",
    designType: "banner",
    description: "Wide promo for launches and nights",
    category: "events",
    tags: ["banner", "event", "web"],
    preset: {
      backgroundColor: "#111111",
      headline: "Tonight only",
      subheadline: "Doors open 9pm",
      cta: "Get tickets",
      accentColor: "#00C851",
    },
  },
  {
    id: "card-founder",
    label: "Business card — founder",
    designType: "business_card",
    description: "Digital business card with accent panel",
    category: "print",
    tags: ["card", "business", "founder", "print"],
    preset: {
      backgroundColor: "#0A0A0A",
      headline: "Founder · Dakar",
      subheadline: "Building Africa’s next brands",
      cta: "hello@brand.africa",
      accentColor: "#FF5500",
    },
  },
  {
    id: "card-shop",
    label: "Business card — shop",
    designType: "business_card",
    description: "Card for market and boutique owners",
    category: "commerce",
    tags: ["card", "shop", "contact"],
    preset: {
      backgroundColor: "#1C1917",
      headline: "Orders · WhatsApp",
      subheadline: "Open daily 9–7",
      cta: "+221 …",
      accentColor: "#F59E0B",
    },
  },
];

export type StudioTemplateFilter = {
  category?: StudioTemplateCategory | "all";
  designType?: StudioDesignType | "all";
  query?: string;
};

/** Filter + search Studio templates for discovery. */
export function filterStudioTemplates(
  templates: StudioTemplate[] = STUDIO_TEMPLATES,
  filter: StudioTemplateFilter = {},
): StudioTemplate[] {
  const q = (filter.query ?? "").trim().toLowerCase();
  const cat = filter.category ?? "all";
  const type = filter.designType ?? "all";

  return templates.filter((t) => {
    if (cat !== "all" && t.category !== cat) return false;
    if (type !== "all" && t.designType !== type) return false;
    if (!q) return true;
    const hay = [t.label, t.description, t.designType, t.category, ...t.tags]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function buildCanvasFromTemplate(
  template: StudioTemplate,
  businessName = "My business",
) {
  const doc = defaultCanvasDocument(template.designType, {
    backgroundColor: template.preset?.backgroundColor,
    businessName,
  });
  const layers = doc.layers.map((l) => {
    if (l.name === "Headline" && template.preset?.headline) return { ...l, text: template.preset.headline };
    if (l.name === "Business") return { ...l, text: businessName };
    if (l.name === "CTA label" && template.preset?.cta) return { ...l, text: template.preset.cta };
    if (l.name === "CTA" && template.preset?.accentColor) return { ...l, fill: template.preset.accentColor };
    return l;
  });
  if (template.preset?.subheadline) {
    layers.splice(2, 0, {
      id: `ly_sub_${template.id}`,
      type: "text" as const,
      name: "Subheadline",
      x: doc.width * 0.08,
      y: doc.height * 0.28,
      width: doc.width * 0.84,
      height: 80,
      rotation: 0,
      opacity: 1,
      locked: false,
      text: template.preset.subheadline,
      fontSize: 20,
      fontFamily: "system-ui",
      fontWeight: "400",
      color: template.preset.backgroundColor === "#FAFAF8" || template.preset.backgroundColor === "#FFF7ED"
        ? "#0F0D33CC"
        : "#FFFFFFCC",
      textAlign: "left" as const,
    });
  }
  const page = {
    ...doc.pages[0]!,
    backgroundColor: template.preset?.backgroundColor ?? doc.backgroundColor,
    layers,
  };
  return mirrorPageToDocument({ ...doc, backgroundColor: page.backgroundColor, layers, pages: [page] }, page);
}

export function findStudioTemplate(id: string): StudioTemplate | undefined {
  return STUDIO_TEMPLATES.find((t) => t.id === id);
}

export function studioTemplateAspect(designType: StudioDesignType): "square" | "story" | "portrait" {
  if (designType === "instagram_story" || designType === "whatsapp_status") return "story";
  if (designType === "flyer" || designType === "poster") return "portrait";
  return "square";
}
