import { buildSenegalWorld } from "./senegal-world-kit";

const W1 = "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=70";
const W2 = "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=640&q=65";
const W3 = "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=640&q=65";

/** Production A — commercials, events, brand films. */
export function productionHouseWorldDefinition() {
  return buildSenegalWorld({
    title: "Production house",
    brand: "HOUSE",
    footerText: "© House — film · events · WhatsApp briefs",
    theme: {
      primary: "#1A0A10",
      accent: "#E94560",
      background: "#FAFAF8",
      text: "#1A0A10",
      fontDisplay: "Bebas Neue",
      fontBody: "IBM Plex Sans",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "tight",
      aestheticId: "dakar-night",
    },
    nav: [
      { label: "Work", href: "/work" },
      { label: "Services", href: "/services" },
      { label: "Clients", href: "/clients" },
      { label: "Contact", href: "/contact" },
    ],
    home: {
      heading: "Stories that move brands",
      subheading:
        "Dakar production house for commercials, events, and cultural films. Send a brief on WhatsApp — we reply with a clear quote.",
      buttonLabel: "See work",
      buttonHref: "/work",
      image: { src: W1, alt: "On set", caption: "Recent shoot" },
      featuresHeading: "How we work",
      features: [
        { title: "Brief", body: "WhatsApp or form — goals, dates, budget range." },
        { title: "Crew", body: "Local teams who know light, location, and pace." },
        { title: "Deliver", body: "Cuts ready for TV, social, and events." },
      ],
      gallery: [
        { src: W1, alt: "Set" },
        { src: W2, alt: "Edit" },
        { src: W3, alt: "Event" },
      ],
    },
    pages: [
      {
        slug: "work",
        title: "Work",
        heading: "Selected work",
        subheading: "Replace with your real reels and stills.",
        galleryHeading: "Stills",
        gallery: [
          { src: W1, alt: "Spot A" },
          { src: W2, alt: "Spot B" },
          { src: W3, alt: "Event C" },
        ],
      },
      {
        slug: "services",
        title: "Services",
        heading: "Services",
        subheading: "From idea to delivery.",
        features: [
          { title: "Brand films", body: "Commercials and social cuts." },
          { title: "Events", body: "Live capture and aftermovies." },
          { title: "Content packs", body: "Photo + video for campaigns." },
        ],
      },
      {
        slug: "clients",
        title: "Clients",
        heading: "Clients",
        subheading: "Brands and institutions we have worked with.",
        features: [
          { title: "Retail & fashion", body: "Lookbooks and launch films." },
          { title: "Culture & music", body: "Artist visuals and festivals." },
          { title: "Institutions", body: "Documentaries and explainers." },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        heading: "Start a brief",
        subheading: "Tell us date, city, and what success looks like.",
        formHeading: "Project brief",
        whatsapp: {
          label: "WhatsApp production",
          phone: "+221770000000",
          message: "Hi — I have a production brief.",
        },
      },
    ],
  });
}

/** Production B — showreel-led film studio. */
export function filmStudioWorldDefinition() {
  return buildSenegalWorld({
    title: "Film studio",
    brand: "STUDIO",
    footerText: "© Studio — showreel · hire crew · WhatsApp",
    theme: {
      primary: "#0F0A14",
      accent: "#FF1493",
      background: "#0F0A14",
      text: "#F8F4FF",
      fontDisplay: "Syne",
      fontBody: "system-ui",
      spacing: "compact",
      headingScale: "lg",
      bodySize: "sm",
      letterSpacing: "normal",
      aestheticId: "dakar-night",
    },
    nav: [
      { label: "Showreel", href: "/showreel" },
      { label: "Projects", href: "/projects" },
      { label: "Hire", href: "/hire" },
      { label: "Contact", href: "/contact" },
    ],
    home: {
      heading: "Showreel first.",
      subheading:
        "Film studio for directors and producers — watch the work, then hire. Mobile-light pages for African networks.",
      buttonLabel: "Watch showreel",
      buttonHref: "/showreel",
      align: "center",
      heroBg: "#0F0A14",
      featuresHeading: "Studio lanes",
      features: [
        { title: "Fiction", body: "Shorts and features in progress." },
        { title: "Docs", body: "Stories from the continent." },
        { title: "Hire", body: "Camera, sound, edit — WhatsApp booking." },
      ],
      gallery: [
        { src: W2, alt: "Frame" },
        { src: W3, alt: "Crew" },
      ],
    },
    pages: [
      {
        slug: "showreel",
        title: "Showreel",
        heading: "Showreel",
        subheading: "Paste your Vimeo / YouTube reel in a video section.",
        body: "Add a video section in the editor with your showreel link. Keep a poster image for Data Saver visitors.",
      },
      {
        slug: "projects",
        title: "Projects",
        heading: "Projects",
        subheading: "Selected titles and stills.",
        gallery: [
          { src: W1, alt: "Project 1" },
          { src: W2, alt: "Project 2" },
        ],
      },
      {
        slug: "hire",
        title: "Hire",
        heading: "Hire the studio",
        subheading: "Camera · sound · edit · producers.",
        features: [
          { title: "Day rates", body: "Clear packages in XOF." },
          { title: "Locations", body: "Dakar and travel crews." },
        ],
        formHeading: "Request a crew",
      },
      {
        slug: "contact",
        title: "Contact",
        heading: "Contact",
        subheading: "Festivals, partners, and commissions.",
        whatsapp: {
          label: "WhatsApp studio",
          phone: "+221770000000",
          message: "Hi — I want to hire the studio.",
        },
      },
    ],
  });
}
