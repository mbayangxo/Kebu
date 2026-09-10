import { buildSenegalWorld } from "./senegal-world-kit";

const T1 = "";
const T2 = "";

/** Tech A — app launch / waitlist. */
export function appLaunchWorldDefinition() {
  return buildSenegalWorld({
    title: "App launch",
    brand: "APP",
    footerText: "© App — waitlist · WhatsApp support",
    theme: {
      primary: "#312E81",
      accent: "#4361EE",
      background: "#F5F7FF",
      text: "#1E1B4B",
      fontDisplay: "Syne",
      fontBody: "IBM Plex Sans",
      spacing: "compact",
      headingScale: "lg",
      bodySize: "sm",
      letterSpacing: "normal",
      aestheticId: "sahel-light",
    },
    nav: [
      { label: "Features", href: "/features" },
      { label: "Screens", href: "/screens" },
      { label: "Waitlist", href: "/waitlist" },
      { label: "Contact", href: "/contact" },
    ],
    home: {
      heading: "One problem. One app.",
      subheading:
        "Launch page for African mobile products — fast on low data, waitlist on WhatsApp or form.",
      buttonLabel: "Join waitlist",
      buttonHref: "/waitlist",
      align: "center",
      heroBg: "#312E81",
      image: { src: T1, alt: "Phone UI", caption: "Product" },
      featuresHeading: "Why it ships",
      features: [
        { title: "Simple job", body: "One clear outcome for the user." },
        { title: "Low data", body: "Works when bandwidth is scarce." },
        { title: "Local pay later", body: "Wave / Orange Money when you enable billing." },
      ],
    },
    pages: [
      {
        slug: "features",
        title: "Features",
        heading: "Features",
        subheading: "What the product does.",
        features: [
          { title: "Core loop", body: "The daily action users take." },
          { title: "Trust", body: "Privacy and ownership in plain words." },
          { title: "Offline-ish", body: "Honest about what works offline." },
        ],
      },
      {
        slug: "screens",
        title: "Screens",
        heading: "Screens",
        subheading: "Light screenshots — compress for Data Saver.",
        gallery: [
          { src: T1, alt: "Screen 1" },
          { src: T2, alt: "Screen 2" },
        ],
      },
      {
        slug: "waitlist",
        title: "Waitlist",
        heading: "Join the waitlist",
        subheading: "We message you when your invite is ready.",
        formHeading: "Get early access",
      },
      {
        slug: "contact",
        title: "Contact",
        heading: "Contact",
        subheading: "Partnerships and press.",
        whatsapp: {
          label: "WhatsApp support",
          phone: "+221770000000",
          message: "Hi — about the app waitlist.",
        },
      },
    ],
  });
}

/** Tech B — startup problem → product. */
export function techStartupWorldDefinition() {
  return buildSenegalWorld({
    title: "Tech startup",
    brand: "STARTUP",
    footerText: "© Startup — product · pricing · contact",
    theme: {
      primary: "#0F172A",
      accent: "#6366F1",
      background: "#FFFFFF",
      text: "#0F172A",
      fontDisplay: "Fraunces",
      fontBody: "system-ui",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "sahel-light",
    },
    nav: [
      { label: "Problem", href: "/problem" },
      { label: "Product", href: "/product" },
      { label: "Pricing", href: "/pricing" },
      { label: "Contact", href: "/contact" },
    ],
    home: {
      heading: "Infrastructure for African builders",
      subheading:
        "Startup site that states the problem, shows the product, and gives a clear CTA — demo or WhatsApp.",
      buttonLabel: "See the product",
      buttonHref: "/product",
      featuresHeading: "Proof points",
      features: [
        { title: "Problem", body: "Who hurts and why now." },
        { title: "Product", body: "What you ship this month." },
        { title: "CTA", body: "Book a demo or join waitlist." },
      ],
      gallery: [{ src: T2, alt: "Product" }],
    },
    pages: [
      {
        slug: "problem",
        title: "Problem",
        heading: "The problem",
        subheading: "Make the pain obvious in one screen.",
        body: "Describe the broken workflow your customer lives with today — markets, paperwork, payments, logistics.",
      },
      {
        slug: "product",
        title: "Product",
        heading: "The product",
        subheading: "What changes after they use you.",
        features: [
          { title: "Core product", body: "One reliable job." },
          { title: "Security", body: "Ownership and privacy by default." },
          { title: "Roadmap", body: "Shipped in public with feedback." },
        ],
      },
      {
        slug: "pricing",
        title: "Pricing",
        heading: "Pricing",
        subheading: "Youth-affordable tiers in XOF when you sell.",
        features: [
          { title: "Starter", body: "Free or low entry." },
          { title: "Growth", body: "For active teams." },
          { title: "Custom", body: "WhatsApp for enterprise." },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        heading: "Talk to us",
        subheading: "Investors, pilots, and customers.",
        formHeading: "Book a demo",
        whatsapp: {
          label: "WhatsApp founders",
          phone: "+221770000000",
          message: "Hi — I want a product demo.",
        },
      },
    ],
  });
}
