import { buildSenegalWorld } from "./senegal-world-kit";

const P1 = "";
const P2 = "";
const P3 = "";

/** Portfolio A — freelancer / pro. */
export function proPortfolioWorldDefinition() {
  return buildSenegalWorld({
    title: "Pro portfolio",
    brand: "STUDIO",
    footerText: "© Studio — work · hire on WhatsApp",
    theme: {
      primary: "#3D2C4A",
      accent: "#6D597A",
      background: "#FAF8FC",
      text: "#2A1F33",
      fontDisplay: "Playfair Display",
      fontBody: "IBM Plex Sans",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "sahel-light",
    },
    nav: [
      { label: "Work", href: "/work" },
      { label: "About", href: "/about" },
      { label: "Services", href: "/services" },
      { label: "Contact", href: "/contact" },
    ],
    home: {
      heading: "Work that gets you hired",
      subheading:
        "Portfolio for freelancers and small studios in Senegal — show projects, services, and WhatsApp hire.",
      buttonLabel: "See work",
      buttonHref: "/work",
      image: { src: P1, alt: "Portrait", caption: "You" },
      featuresHeading: "Hire path",
      features: [
        { title: "Work", body: "Best projects first." },
        { title: "Services", body: "Clear packages in XOF." },
        { title: "Contact", body: "WhatsApp with project brief." },
      ],
      gallery: [
        { src: P2, alt: "Project" },
        { src: P3, alt: "Project" },
      ],
    },
    pages: [
      {
        slug: "work",
        title: "Work",
        heading: "Selected work",
        subheading: "Case stills — replace with yours.",
        gallery: [
          { src: P2, alt: "Case 1" },
          { src: P3, alt: "Case 2" },
          { src: P1, alt: "Case 3" },
        ],
      },
      {
        slug: "about",
        title: "About",
        heading: "About",
        subheading: "Skills, city, languages.",
        body: "Short bio — where you are based, what you specialize in, and who you like to work with.",
      },
      {
        slug: "services",
        title: "Services",
        heading: "Services",
        subheading: "Packages clients understand.",
        features: [
          { title: "Design", body: "Brand / UI / print." },
          { title: "Build", body: "Sites and stores on Kebu." },
          { title: "Retainers", body: "Monthly support." },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        heading: "Hire me",
        subheading: "Share budget and deadline.",
        formHeading: "Project inquiry",
        whatsapp: {
          label: "WhatsApp hire",
          phone: "+221770000000",
          message: "Hi — I want to hire you.",
        },
      },
    ],
  });
}

/** Portfolio B — student / early career. */
export function studentPortfolioWorldDefinition() {
  return buildSenegalWorld({
    title: "Student portfolio",
    brand: "ME",
    footerText: "© Me — projects · skills · contact",
    theme: {
      primary: "#4C1D95",
      accent: "#7C3AED",
      background: "#FBF8FF",
      text: "#2E1065",
      fontDisplay: "Syne",
      fontBody: "system-ui",
      spacing: "compact",
      headingScale: "md",
      bodySize: "sm",
      letterSpacing: "normal",
      aestheticId: "sahel-light",
    },
    nav: [
      { label: "Projects", href: "/projects" },
      { label: "Skills", href: "/skills" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    home: {
      heading: "I build real things",
      subheading:
        "Simple portfolio for students and first jobs — projects, skills, and a WhatsApp contact. No fluff.",
      buttonLabel: "Projects",
      buttonHref: "/projects",
      align: "center",
      featuresHeading: "Start here",
      features: [
        { title: "Projects", body: "School and personal builds." },
        { title: "Skills", body: "Tools you actually use." },
        { title: "Contact", body: "Internship or freelance WhatsApp." },
      ],
      gallery: [{ src: P2, alt: "Project" }],
    },
    pages: [
      {
        slug: "projects",
        title: "Projects",
        heading: "Projects",
        subheading: "3–6 strong pieces beat a long list.",
        gallery: [
          { src: P2, alt: "Project 1" },
          { src: P3, alt: "Project 2" },
        ],
        features: [
          { title: "Project title", body: "Problem · what you built · link." },
        ],
      },
      {
        slug: "skills",
        title: "Skills",
        heading: "Skills",
        subheading: "Honest list — tools + soft skills.",
        features: [
          { title: "Tools", body: "Figma, code, Excel…" },
          { title: "Languages", body: "FR · EN · WO" },
          { title: "Learning", body: "What you are practicing now." },
        ],
      },
      {
        slug: "about",
        title: "About",
        heading: "About",
        subheading: "School, city, goals.",
        body: "One short paragraph about who you are and what kind of work you want next.",
      },
      {
        slug: "contact",
        title: "Contact",
        heading: "Contact",
        subheading: "Internships and small projects.",
        formHeading: "Say hello",
        whatsapp: {
          label: "WhatsApp",
          phone: "+221770000000",
          message: "Hi — I saw your portfolio.",
        },
      },
    ],
  });
}
