/** Shopify-style section catalog for the builder — longer site = add, shorter = remove. */
export type BuilderSectionCategory = "layout" | "media" | "commerce" | "engage" | "page";

export type BuilderSectionOption = {
  type: string;
  label: string;
  description: string;
  category: BuilderSectionCategory;
};

export const BUILDER_SECTION_CATEGORIES: { id: BuilderSectionCategory; label: string }[] = [
  { id: "layout", label: "Layout & nav" },
  { id: "media", label: "Photos & video" },
  { id: "commerce", label: "Shop & contact" },
  { id: "engage", label: "Engage" },
  { id: "page", label: "Page blocks" },
];

/** Curated section types founders can add (like Shopify theme sections). */
export const BUILDER_SECTION_CATALOG: BuilderSectionOption[] = [
  {
    type: "announcement-bar",
    label: "Announcement bar",
    description: "Thin top bar with a message — promotions, shipping notice",
    category: "layout",
  },
  {
    type: "navigation",
    label: "Navigation menu",
    description: "Top menu links for this page (Home, Videos, Shop…)",
    category: "layout",
  },
  {
    type: "editorial-hero",
    label: "Editorial hero",
    description: "Full-bleed image with headline overlay — editorial magazine feel",
    category: "layout",
  },
  {
    type: "hero",
    label: "Hero banner",
    description: "Big headline, short text, and a button",
    category: "layout",
  },
  {
    type: "split",
    label: "Split section",
    description: "Image beside text — product story, founder bio, feature callout",
    category: "layout",
  },
  {
    type: "marquee",
    label: "Marquee ticker",
    description: "Scrolling text strip — brands, offers, slogans",
    category: "engage",
  },
  {
    type: "footer",
    label: "Footer",
    description: "Bottom bar with copyright and links",
    category: "layout",
  },
  {
    type: "category-tiles",
    label: "Category tiles",
    description: "Grid of image + label tiles — shop categories, service types",
    category: "layout",
  },
  {
    type: "text",
    label: "Text",
    description: "Heading + paragraph — tell your story",
    category: "page",
  },
  {
    type: "free-text",
    label: "Moveable text",
    description: "Drag words anywhere on a canvas",
    category: "page",
  },
  {
    type: "features",
    label: "Features",
    description: "3–6 short benefit cards",
    category: "page",
  },
  {
    type: "image",
    label: "Image",
    description: "One full-width photo",
    category: "media",
  },
  {
    type: "gallery",
    label: "Photo grid",
    description: "Many photos — grid, one photo, or featured",
    category: "media",
  },
  {
    type: "video",
    label: "Videos",
    description: "YouTube or uploads — grid or one player",
    category: "media",
  },
  {
    type: "audio",
    label: "Music / audio",
    description: "Track player or Spotify embed",
    category: "media",
  },
  {
    type: "products",
    label: "Products / shop",
    description: "Product cards with WhatsApp order",
    category: "commerce",
  },
  {
    type: "contact",
    label: "Contact",
    description: "Email, phone, address",
    category: "commerce",
  },
  {
    type: "whatsapp",
    label: "WhatsApp button",
    description: "Chat / order on WhatsApp",
    category: "commerce",
  },
  {
    type: "joko",
    label: "Joko button",
    description: "Payment CTA via Joko (mobile money)",
    category: "commerce",
  },
  {
    type: "map",
    label: "Map",
    description: "Location map",
    category: "commerce",
  },
  {
    type: "countdown",
    label: "Countdown timer",
    description: "Live DD:HH:MM:SS timer — drops, sales, events, launches",
    category: "engage",
  },
  {
    type: "trust-badges",
    label: "Trust badges",
    description: "Secure payment · Fast shipping · Returns — converts fence-sitters",
    category: "engage",
  },
  {
    type: "social-proof",
    label: "Social proof popup",
    description: "Corner toast: 'Fatou vient de commander Kit Rituel · il y a 3 min'",
    category: "engage",
  },
  {
    type: "floating-cta",
    label: "Floating WhatsApp button",
    description: "Sticky corner button — always visible, always clickable",
    category: "commerce",
  },
  {
    type: "before-after",
    label: "Before / After slider",
    description: "Drag to reveal — hair, skin, construction, makeovers",
    category: "media",
  },
  {
    type: "hotspot-image",
    label: "Shoppable image",
    description: "Photo with clickable pin tags — product info on hover",
    category: "media",
  },
  {
    type: "form",
    label: "Contact form",
    description: "Collect messages — saved to your Kebu account",
    category: "engage",
  },
  {
    type: "newsletter",
    label: "Email list",
    description: "Collect emails for updates",
    category: "engage",
  },
  {
    type: "blog-list",
    label: "Blog",
    description: "Published posts from your blog — add posts in the sidebar",
    category: "page",
  },
  {
    type: "email-popup",
    label: "Email / consent popup",
    description: "Overlay for email list + cookie consent",
    category: "engage",
  },
  {
    type: "testimonials",
    label: "Quotes",
    description: "What fans or customers say",
    category: "engage",
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Questions and answers",
    category: "engage",
  },
  {
    type: "events",
    label: "Events",
    description: "Shows, dates, ticket links",
    category: "engage",
  },
];

/** Back-compat chips list used by older UI. */
export const BUILDER_QUICK_SECTIONS: { type: string; label: string }[] =
  BUILDER_SECTION_CATALOG.map(({ type, label }) => ({ type, label }));

export function labelForSectionType(type: string): string {
  return BUILDER_SECTION_CATALOG.find((s) => s.type === type)?.label ?? type.replace(/-/g, " ");
}
