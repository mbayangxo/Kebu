import { buildSenegalWorld } from "./senegal-world-kit";

const B1 = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=70";
const B2 = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=640&q=65";
const B3 = "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=640&q=65";

/** Business A — company clarity site. */
export function companySiteWorldDefinition() {
  return buildSenegalWorld({
    title: "Company site",
    brand: "COMPANY",
    footerText: "© Company — services · trust · WhatsApp contact",
    theme: {
      primary: "#1E3A5F",
      accent: "#457B9D",
      background: "#F7F9FC",
      text: "#1E3A5F",
      fontDisplay: "Fraunces",
      fontBody: "IBM Plex Sans",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "sahel-light",
    },
    nav: [
      { label: "Services", href: "/services" },
      { label: "About", href: "/about" },
      { label: "Team", href: "/team" },
      { label: "Contact", href: "/contact" },
    ],
    home: {
      heading: "A clear company online",
      subheading:
        "For Senegalese businesses that need trust: who you are, what you sell, how to reach you on WhatsApp.",
      buttonLabel: "Our services",
      buttonHref: "/services",
      image: { src: B1, alt: "Office", caption: "Our work" },
      featuresHeading: "Why this site works",
      features: [
        { title: "Clear offer", body: "Services in plain language." },
        { title: "Proof", body: "About + team build trust." },
        { title: "Contact", body: "WhatsApp and form — not a dead email box." },
      ],
    },
    pages: [
      {
        slug: "services",
        title: "Services",
        heading: "Services",
        subheading: "Replace with your real offers and XOF packages.",
        features: [
          { title: "Core service", body: "What you do every week." },
          { title: "Advisory", body: "Projects with a clear scope." },
          { title: "Support", body: "Ongoing help for clients." },
        ],
      },
      {
        slug: "about",
        title: "About",
        heading: "About",
        subheading: "Story, registration, and values.",
        body: "Tell customers where you are based, who you serve, and why they can trust you. Keep it short for mobile.",
      },
      {
        slug: "team",
        title: "Team",
        heading: "Team",
        subheading: "Faces behind the company.",
        features: [
          { title: "Founder", body: "Role + one-line bio." },
          { title: "Operations", body: "Who customers talk to." },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        heading: "Contact",
        subheading: "Quotes and partnership.",
        formHeading: "Request a call",
        whatsapp: {
          label: "WhatsApp business",
          phone: "+221770000000",
          message: "Hi — I want a quote.",
        },
      },
    ],
  });
}

/** Business B — builders / trade contractors. */
export function buildTradeWorldDefinition() {
  return buildSenegalWorld({
    title: "Build & trade",
    brand: "BUILD",
    footerText: "© Build — projects · quotes on WhatsApp",
    theme: {
      primary: "#44403C",
      accent: "#78716C",
      background: "#FAF7F2",
      text: "#292524",
      fontDisplay: "Oswald",
      fontBody: "system-ui",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "tight",
      aestheticId: "sahel-light",
    },
    nav: [
      { label: "Projects", href: "/projects" },
      { label: "Services", href: "/services" },
      { label: "Quote", href: "/quote" },
      { label: "Contact", href: "/contact" },
    ],
    home: {
      heading: "Build with proof",
      subheading:
        "For contractors and trade businesses — show finished projects, services, and a WhatsApp quote path.",
      buttonLabel: "See projects",
      buttonHref: "/projects",
      image: { src: B2, alt: "Construction site", caption: "Recent site" },
      featuresHeading: "Client journey",
      features: [
        { title: "See work", body: "Photos of finished sites." },
        { title: "Pick service", body: "Masonry, finish, renovation…" },
        { title: "Get quote", body: "WhatsApp with location and budget." },
      ],
      gallery: [
        { src: B2, alt: "Project A" },
        { src: B3, alt: "Project B" },
      ],
    },
    pages: [
      {
        slug: "projects",
        title: "Projects",
        heading: "Projects",
        subheading: "Before / after and finished builds.",
        gallery: [
          { src: B2, alt: "Build 1" },
          { src: B3, alt: "Build 2" },
          { src: B1, alt: "Interior" },
        ],
      },
      {
        slug: "services",
        title: "Services",
        heading: "Services",
        subheading: "What your crews deliver.",
        features: [
          { title: "New build", body: "Foundations to finish." },
          { title: "Renovation", body: "Homes and shops." },
          { title: "Trade supply", body: "Materials with delivery notes." },
        ],
      },
      {
        slug: "quote",
        title: "Quote",
        heading: "Request a quote",
        subheading: "City, surface, and budget — we reply with next steps.",
        formHeading: "Quote form",
        faq: [
          {
            question: "Do you work outside Dakar?",
            answer: "Say yes/no in the editor and list cities you cover.",
          },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        heading: "Contact",
        subheading: "Site visits and partnerships.",
        whatsapp: {
          label: "WhatsApp quote",
          phone: "+221770000000",
          message: "Hi — I need a construction quote.",
        },
      },
    ],
  });
}
