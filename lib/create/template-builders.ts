import type { WebsiteDefinition } from "./website-schema";

type FeatureItem = { title: string; body: string };
type FaqItem = { question: string; answer: string };
type TestimonialItem = { quote: string; name: string };
type GalleryItem = { src: string; alt: string };
type NavLink = { label: string; href: string };

export type CompleteSiteInput = {
  title: string;
  theme?: WebsiteDefinition["theme"];
  navLinks: NavLink[];
  hero: {
    heading: string;
    subheading: string;
    buttonLabel: string;
    buttonHref: string;
    align?: "left" | "center";
    background?: string;
  };
  about: { heading: string; body: string };
  features: { heading: string; items: FeatureItem[] };
  gallery?: { heading?: string; items: GalleryItem[] };
  testimonials?: { heading: string; items: TestimonialItem[] };
  faq?: { heading: string; items: FaqItem[] };
  contact: { heading?: string; email: string; phone: string; address: string };
  whatsapp: { label: string; phone: string; message: string };
  footerText?: string;
};

function defaultTheme(primary = "#0F0D33", accent = "#00C851"): WebsiteDefinition["theme"] {
  return {
    primary,
    accent,
    background: "#FAFAF8",
    text: "#0F0D33",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "comfortable",
  };
}

/** Full business page — nav, hero, about, services, gallery, testimonials, FAQ, contact, WhatsApp, footer. */
export function buildCompleteSite(input: CompleteSiteInput): WebsiteDefinition {
  const t = input.title;
  const sections: WebsiteDefinition["pages"][0]["sections"] = [
    {
      id: "nav",
      type: "navigation",
      props: { brand: t, links: input.navLinks },
    },
    {
      id: "hero",
      type: "hero",
      props: {
        heading: input.hero.heading,
        subheading: input.hero.subheading,
        buttonLabel: input.hero.buttonLabel,
        buttonHref: input.hero.buttonHref,
        align: input.hero.align ?? "center",
        background: input.hero.background,
      },
    },
    {
      id: "about",
      type: "text",
      props: { heading: input.about.heading, body: input.about.body },
    },
    {
      id: "services",
      type: "features",
      props: { heading: input.features.heading, items: input.features.items },
    },
  ];

  if (input.gallery?.items.length) {
    sections.push({
      id: "gallery",
      type: "gallery",
      props: { items: input.gallery.items },
    });
  }

  if (input.testimonials?.items.length) {
    sections.push({
      id: "testimonials",
      type: "testimonials",
      props: {
        heading: input.testimonials.heading,
        items: input.testimonials.items,
      },
    });
  }

  if (input.faq?.items.length) {
    sections.push({
      id: "faq",
      type: "faq",
      props: { heading: input.faq.heading, items: input.faq.items },
    });
  }

  sections.push(
    {
      id: "contact",
      type: "contact",
      props: {
        heading: input.contact.heading ?? "Contact",
        email: input.contact.email,
        phone: input.contact.phone,
        address: input.contact.address,
      },
    },
    {
      id: "whatsapp",
      type: "whatsapp",
      props: input.whatsapp,
    },
    {
      id: "footer",
      type: "footer",
      props: { text: input.footerText ?? `© ${t}`, links: [] },
    },
  );

  return {
    schemaVersion: "website-v1",
    title: t,
    theme: input.theme ?? defaultTheme(),
    pages: [{ slug: "home", title: "Home", sections }],
  };
}

export { defaultTheme as templateDefaultTheme };
