import { buildSenegalWorld } from "./senegal-world-kit";

const I1 = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=70";
const I2 = "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=640&q=65";
const I3 = "https://images.unsplash.com/photo-1500937386664-56d57812c411?w=640&q=65";

/** Impact A — NGO / community. */
export function ngoImpactWorldDefinition() {
  return buildSenegalWorld({
    title: "NGO & impact",
    brand: "IMPACT",
    footerText: "© Impact — programs · partner on WhatsApp",
    theme: {
      primary: "#1B4332",
      accent: "#588157",
      background: "#F4F7F2",
      text: "#1B4332",
      fontDisplay: "Fraunces",
      fontBody: "IBM Plex Sans",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "sahel-light",
    },
    nav: [
      { label: "Mission", href: "/mission" },
      { label: "Programs", href: "/programs" },
      { label: "Partner", href: "/partner" },
      { label: "Contact", href: "/contact" },
    ],
    home: {
      heading: "Mission you can verify",
      subheading:
        "For NGOs and community orgs — mission, programs, and how to partner. Honest language, WhatsApp contact.",
      buttonLabel: "Our programs",
      buttonHref: "/programs",
      image: { src: I1, alt: "Community", caption: "On the ground" },
      featuresHeading: "What visitors need",
      features: [
        { title: "Mission", body: "Who you serve and why." },
        { title: "Programs", body: "Concrete activities, not slogans." },
        { title: "Partner", body: "Donate, volunteer, or collaborate." },
      ],
    },
    pages: [
      {
        slug: "mission",
        title: "Mission",
        heading: "Mission",
        subheading: "Clear purpose for donors and partners.",
        body: "State the problem, your approach, and where you work. Label facts vs hopes.",
      },
      {
        slug: "programs",
        title: "Programs",
        heading: "Programs",
        subheading: "What you run this year.",
        features: [
          { title: "Program A", body: "Who · where · outcome." },
          { title: "Program B", body: "Who · where · outcome." },
          { title: "Program C", body: "Who · where · outcome." },
        ],
      },
      {
        slug: "partner",
        title: "Partner",
        heading: "Partner with us",
        subheading: "Funding, in-kind, and volunteers.",
        formHeading: "Partnership form",
        faq: [
          {
            question: "How do donations work?",
            answer: "Explain Wave / bank / JOKO paths honestly — never fake instant receipts.",
          },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        heading: "Contact",
        subheading: "Press and field offices.",
        whatsapp: {
          label: "WhatsApp office",
          phone: "+221770000000",
          message: "Hi — I want to partner / volunteer.",
        },
      },
    ],
  });
}

/** Impact B — farm / agri. */
export function farmAgriWorldDefinition() {
  return buildSenegalWorld({
    title: "Farm & agri",
    brand: "FARM",
    footerText: "© Farm — produce · order on WhatsApp",
    theme: {
      primary: "#365314",
      accent: "#3F6212",
      background: "#F7FEE7",
      text: "#1A2E05",
      fontDisplay: "Oswald",
      fontBody: "system-ui",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "tight",
      aestheticId: "sahel-light",
    },
    nav: [
      { label: "Produce", href: "/produce" },
      { label: "Story", href: "/story" },
      { label: "Order", href: "/order" },
      { label: "Contact", href: "/contact" },
    ],
    home: {
      heading: "From farm to buyer",
      subheading:
        "For farms and agri sellers — show produce, tell the story, take orders on WhatsApp with Wave / Orange Money.",
      buttonLabel: "See produce",
      buttonHref: "/produce",
      image: { src: I2, alt: "Harvest", caption: "This season" },
      featuresHeading: "How buyers order",
      features: [
        { title: "Browse", body: "Crops and prices in XOF." },
        { title: "WhatsApp", body: "Confirm quantity and delivery." },
        { title: "Pay", body: "Wave, Orange Money, or cash on delivery." },
      ],
      gallery: [
        { src: I2, alt: "Field" },
        { src: I3, alt: "Produce" },
      ],
    },
    pages: [
      {
        slug: "produce",
        title: "Produce",
        heading: "Produce",
        subheading: "Replace samples with your real harvest list.",
        products: {
          heading: "Available now",
          orderCtaLabel: "WhatsApp order",
          items: [
            {
              name: "Seasonal crate",
              description: "Mixed vegetables · delivery zones",
              priceLabel: "12 000 XOF",
              imageUrl: I2,
            },
            {
              name: "Bulk order",
              description: "Message for wholesale",
              priceLabel: "On request",
              imageUrl: I3,
            },
          ],
        },
      },
      {
        slug: "story",
        title: "Story",
        heading: "Our story",
        subheading: "Land, people, and practices.",
        body: "Tell buyers where the farm is, what you grow, and how you harvest. Photos optional for Data Saver.",
      },
      {
        slug: "order",
        title: "Order",
        heading: "How to order",
        subheading: "Simple steps for restaurants and households.",
        features: [
          { title: "1 · Choose", body: "Pick produce and quantity." },
          { title: "2 · WhatsApp", body: "Confirm zone and day." },
          { title: "3 · Pay", body: "Wave / Orange Money / COD." },
        ],
        formHeading: "Order request",
      },
      {
        slug: "contact",
        title: "Contact",
        heading: "Contact",
        subheading: "Farm gate and delivery.",
        whatsapp: {
          label: "WhatsApp farm",
          phone: "+221770000000",
          message: "Hi — I want to order produce.",
        },
      },
    ],
  });
}
