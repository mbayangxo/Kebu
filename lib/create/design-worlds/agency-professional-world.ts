import { buildSenegalWorld } from "./senegal-world-kit";

const S1 = "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=70";
const S2 = "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=640&q=65";

/** Agency B — professional services / consulting firm (harden pair with Carmine). */
export function professionalServicesWorldDefinition() {
  return buildSenegalWorld({
    title: "Professional services",
    brand: "FIRM",
    footerText: "© Firm — advisory · WhatsApp intake",
    theme: {
      primary: "#1D3557",
      accent: "#457B9D",
      background: "#F8FAFC",
      text: "#0F172A",
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
      { label: "Approach", href: "/approach" },
      { label: "Team", href: "/team" },
      { label: "Contact", href: "/contact" },
    ],
    home: {
      heading: "Clarity for growing firms",
      subheading:
        "Consulting and professional services for African businesses — practical plans, local markets, WhatsApp intake.",
      buttonLabel: "Our services",
      buttonHref: "/services",
      image: { src: S1, alt: "Working session", caption: "Client work" },
      featuresHeading: "How engagement starts",
      features: [
        { title: "Diagnose", body: "Short discovery on WhatsApp or call." },
        { title: "Plan", body: "Scoped proposal in plain language." },
        { title: "Deliver", body: "Workshops, docs, and operating rhythm." },
      ],
      gallery: [
        { src: S1, alt: "Workshop" },
        { src: S2, alt: "Team" },
      ],
    },
    pages: [
      {
        slug: "services",
        title: "Services",
        heading: "Services",
        subheading: "Strategy, operations, and compliance support.",
        features: [
          { title: "Strategy", body: "Plans tied to local markets." },
          { title: "Operations", body: "Processes that scale without chaos." },
          { title: "Compliance", body: "Guidance that respects your context." },
        ],
      },
      {
        slug: "approach",
        title: "Approach",
        heading: "Approach",
        subheading: "How we work with founders and teams.",
        body: "We start with the decision you need to make this month — not a 100-page report. Engagements are scoped in XOF with clear milestones.",
        features: [
          { title: "Discovery", body: "1–2 weeks · diagnose." },
          { title: "Build", body: "Sprints with owners on the client side." },
          { title: "Handoff", body: "Playbooks your team can run." },
        ],
      },
      {
        slug: "team",
        title: "Team",
        heading: "Team",
        subheading: "Advisors clients meet.",
        features: [
          { title: "Partners", body: "Sector experience." },
          { title: "Associates", body: "Delivery and research." },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        heading: "Start intake",
        subheading: "Tell us company size, city, and the decision you need.",
        formHeading: "Intake form",
        whatsapp: {
          label: "WhatsApp intake",
          phone: "+221770000000",
          message: "Hi — I want a consulting intake.",
        },
      },
    ],
  });
}
