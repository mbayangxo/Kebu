import type { WebsiteDefinition } from "@/lib/create/website-schema";

type NavLink = { label: string; href: string };
type Feature = { title: string; body: string };
type GalleryItem = { src: string; alt: string };

export type SenegalWorldInput = {
  title: string;
  brand: string;
  footerText: string;
  theme: WebsiteDefinition["theme"];
  nav: readonly NavLink[];
  home: {
    heading: string;
    subheading: string;
    buttonLabel: string;
    buttonHref: string;
    align?: "left" | "center";
    heroBg?: string;
    image?: { src: string; alt: string; caption?: string };
    featuresHeading: string;
    features: Feature[];
    galleryHeading?: string;
    gallery?: GalleryItem[];
  };
  pages: {
    slug: string;
    title: string;
    heading: string;
    subheading: string;
    buttonLabel?: string;
    buttonHref?: string;
    body?: string;
    featuresHeading?: string;
    features?: Feature[];
    galleryHeading?: string;
    gallery?: GalleryItem[];
    products?: {
      heading: string;
      items: {
        name: string;
        description: string;
        priceLabel: string;
        imageUrl?: string;
      }[];
      orderCtaLabel?: string;
    };
    formHeading?: string;
    faq?: { question: string; answer: string }[];
    whatsapp?: { label: string; phone: string; message: string };
  }[];
};

function navSection(id: string, brand: string, links: readonly NavLink[]) {
  return { id, type: "navigation" as const, props: { brand, links: [...links] } };
}

function footerSection(id: string, text: string, links: readonly NavLink[]) {
  return {
    id,
    type: "footer" as const,
    props: {
      text,
      links: links.slice(0, 3).map((l) => ({ label: l.label, href: l.href })),
    },
  };
}

/** Multipage Senegal-first design world — WhatsApp / Wave language, light enough for Data Saver. */
export function buildSenegalWorld(input: SenegalWorldInput): WebsiteDefinition {
  const { brand, nav, footerText, theme, home, pages } = input;
  const prefix = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);

  const homeSections = [
    navSection(`${prefix}-nav-home`, brand, nav),
    {
      id: `${prefix}-hero`,
      type: "hero" as const,
      props: {
        heading: home.heading,
        subheading: home.subheading,
        buttonLabel: home.buttonLabel,
        buttonHref: home.buttonHref,
        align: home.align ?? "left",
        background: home.heroBg ?? theme.background,
      },
    },
    ...(home.image
      ? [
          {
            id: `${prefix}-image`,
            type: "image" as const,
            props: home.image,
          },
        ]
      : []),
    {
      id: `${prefix}-features`,
      type: "features" as const,
      props: { heading: home.featuresHeading, items: home.features },
    },
    ...(home.gallery?.length
      ? [
          {
            id: `${prefix}-gallery`,
            type: "gallery" as const,
            props: {
              heading: home.galleryHeading ?? "Gallery",
              layout: "grid" as const,
              items: home.gallery,
            },
          },
        ]
      : []),
    footerSection(`${prefix}-footer-home`, footerText, nav),
  ];

  const extraPages = pages.map((p) => {
    const sections = [
      navSection(`${prefix}-nav-${p.slug}`, brand, nav),
      {
        id: `${prefix}-${p.slug}-hero`,
        type: "hero" as const,
        props: {
          heading: p.heading,
          subheading: p.subheading,
          buttonLabel: p.buttonLabel ?? "Contact",
          buttonHref: p.buttonHref ?? "/contact",
          align: "left" as const,
          background: theme.background,
        },
      },
      ...(p.body
        ? [
            {
              id: `${prefix}-${p.slug}-text`,
              type: "text" as const,
              props: { heading: p.title, body: p.body },
            },
          ]
        : []),
      ...(p.features?.length
        ? [
            {
              id: `${prefix}-${p.slug}-features`,
              type: "features" as const,
              props: { heading: p.featuresHeading ?? "Details", items: p.features },
            },
          ]
        : []),
      ...(p.gallery?.length
        ? [
            {
              id: `${prefix}-${p.slug}-gallery`,
              type: "gallery" as const,
              props: {
                heading: p.galleryHeading ?? "Work",
                layout: "grid" as const,
                items: p.gallery,
              },
            },
          ]
        : []),
      ...(p.products
        ? [
            {
              id: `${prefix}-${p.slug}-products`,
              type: "products" as const,
              props: {
                heading: p.products.heading,
                layout: "grid" as const,
                columns: 2 as const,
                orderStyle: "minimal" as const,
                orderCtaLabel: p.products.orderCtaLabel ?? "Order on WhatsApp",
                items: p.products.items,
              },
            },
          ]
        : []),
      ...(p.faq?.length
        ? [
            {
              id: `${prefix}-${p.slug}-faq`,
              type: "faq" as const,
              props: { heading: "FAQ", items: p.faq },
            },
          ]
        : []),
      ...(p.formHeading
        ? [
            {
              id: `${prefix}-${p.slug}-form`,
              type: "form" as const,
              props: {
                heading: p.formHeading,
                subheading: "We reply on WhatsApp.",
                buttonLabel: "Send",
                successMessage: "Thanks — we will reply soon.",
                fields: [
                  { id: "name", label: "Name", type: "text" as const, required: true, placeholder: "", options: [] },
                  {
                    id: "phone",
                    label: "WhatsApp",
                    type: "phone" as const,
                    required: true,
                    placeholder: "+221…",
                    options: [],
                  },
                  {
                    id: "message",
                    label: "Message",
                    type: "textarea" as const,
                    required: true,
                    placeholder: "",
                    options: [],
                  },
                ],
              },
            },
          ]
        : []),
      ...(p.whatsapp
        ? [
            {
              id: `${prefix}-${p.slug}-wa`,
              type: "whatsapp" as const,
              props: p.whatsapp,
            },
          ]
        : []),
      footerSection(`${prefix}-footer-${p.slug}`, footerText, nav),
    ];
    return { slug: p.slug, title: p.title, sections };
  });

  return {
    schemaVersion: "website-v1",
    title: input.title,
    theme,
    pages: [{ slug: "home", title: "Home", sections: homeSections }, ...extraPages],
  };
}
