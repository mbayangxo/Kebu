import { buildSenegalWorld } from "./senegal-world-kit";

const IMG1 = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=70";
const IMG2 = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=640&q=65";
const IMG3 = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=640&q=65";

/** Music A — dark stage for artists (not May Lecor portfolio). */
export function artistDarkStageWorldDefinition() {
  return buildSenegalWorld({
    title: "Artist dark stage",
    brand: "STAGE",
    footerText: "© Stage — music · shows · WhatsApp bookings",
    theme: {
      primary: "#0A0A0A",
      accent: "#E8D5A3",
      background: "#111111",
      text: "#F5F0E8",
      fontDisplay: "Oswald",
      fontBody: "system-ui",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "tight",
      aestheticId: "dakar-night",
    },
    nav: [
      { label: "Music", href: "/music" },
      { label: "Videos", href: "/videos" },
      { label: "Shows", href: "/shows" },
      { label: "Contact", href: "/contact" },
    ],
    home: {
      heading: "New music. Real stages.",
      subheading:
        "Artist site for African acts — stream links, show dates, and WhatsApp for bookings. Light on data, heavy on presence.",
      buttonLabel: "Listen",
      buttonHref: "/music",
      heroBg: "#0A0A0A",
      image: { src: IMG1, alt: "Stage lights", caption: "Tonight" },
      featuresHeading: "What fans find here",
      features: [
        { title: "Music", body: "Singles and albums with clear listen links." },
        { title: "Videos", body: "Clips that load light — paste YouTube or Vimeo." },
        { title: "Book", body: "Promoters message on WhatsApp — no fake ticket checkout." },
      ],
      galleryHeading: "Atmosphere",
      gallery: [
        { src: IMG1, alt: "Live" },
        { src: IMG2, alt: "Studio" },
        { src: IMG3, alt: "Crowd" },
      ],
    },
    pages: [
      {
        slug: "music",
        title: "Music",
        heading: "Music",
        subheading: "Replace with your catalog — Spotify, Apple, Boomplay, YouTube Music.",
        featuresHeading: "Releases",
        features: [
          { title: "Latest single", body: "Add cover art + stream link in the editor." },
          { title: "EP / album", body: "Group tracks with one clear CTA." },
          { title: "Features", body: "Collabs and features on one list." },
        ],
      },
      {
        slug: "videos",
        title: "Videos",
        heading: "Videos",
        subheading: "Visuals and performance clips — paste links or upload.",
        galleryHeading: "Stills",
        gallery: [
          { src: IMG2, alt: "Video still 1" },
          { src: IMG3, alt: "Video still 2" },
        ],
      },
      {
        slug: "shows",
        title: "Shows",
        heading: "Shows",
        subheading: "Dates in Dakar and on the road — ticket info via WhatsApp.",
        featuresHeading: "Upcoming",
        features: [
          { title: "City · venue", body: "Date · doors · WhatsApp for guest list." },
          { title: "Private events", body: "Bookings for brands and festivals." },
        ],
        faq: [
          {
            question: "How do I book the artist?",
            answer: "Open Contact and message on WhatsApp with date, city, and budget.",
          },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        heading: "Contact",
        subheading: "Management, press, and bookings.",
        formHeading: "Send a message",
        whatsapp: {
          label: "WhatsApp booking",
          phone: "+221770000000",
          message: "Hi — I want to book a show / collab.",
        },
      },
    ],
  });
}

/** Music B — streaming-first launch for new singles. */
export function streamingLaunchWorldDefinition() {
  return buildSenegalWorld({
    title: "Streaming launch",
    brand: "LISTEN",
    footerText: "© Listen — stream first · share the link",
    theme: {
      primary: "#052E16",
      accent: "#1DB954",
      background: "#F0FDF4",
      text: "#052E16",
      fontDisplay: "Syne",
      fontBody: "IBM Plex Sans",
      spacing: "compact",
      headingScale: "lg",
      bodySize: "sm",
      letterSpacing: "normal",
      aestheticId: "sahel-light",
    },
    nav: [
      { label: "Listen", href: "/listen" },
      { label: "Tour", href: "/tour" },
      { label: "Press", href: "/press" },
      { label: "Contact", href: "/contact" },
    ],
    home: {
      heading: "One link. Every stream.",
      subheading:
        "Launch a single or EP for African listeners — Boomplay, Spotify, Apple, YouTube. Share on WhatsApp and Instagram.",
      buttonLabel: "Listen now",
      buttonHref: "/listen",
      align: "center",
      heroBg: "#052E16",
      featuresHeading: "Built for launch week",
      features: [
        { title: "Listen hub", body: "All platforms in one place — no app install required." },
        { title: "Tour strip", body: "Next cities with WhatsApp RSVP." },
        { title: "Press kit", body: "Bio + photos for media and playlists." },
      ],
      gallery: [
        { src: IMG2, alt: "Cover art" },
        { src: IMG3, alt: "Live clip" },
      ],
    },
    pages: [
      {
        slug: "listen",
        title: "Listen",
        heading: "Listen",
        subheading: "Pick your app — links open instantly on mobile.",
        featuresHeading: "Platforms",
        features: [
          { title: "Spotify", body: "Paste your artist / track URL." },
          { title: "Apple Music", body: "Paste album or single link." },
          { title: "Boomplay / YouTube", body: "Reach listeners where they already are." },
        ],
      },
      {
        slug: "tour",
        title: "Tour",
        heading: "Tour",
        subheading: "Cities and dates — RSVP on WhatsApp.",
        features: [
          { title: "Next show", body: "City · venue · date." },
          { title: "Request a city", body: "Fans message to bring the show home." },
        ],
      },
      {
        slug: "press",
        title: "Press",
        heading: "Press",
        subheading: "Short bio and assets for blogs and radio.",
        body: "Replace with your artist bio, press quotes, and downloadable photos. Keep files light for Data Saver.",
      },
      {
        slug: "contact",
        title: "Contact",
        heading: "Contact",
        subheading: "Playlists, press, bookings.",
        formHeading: "Write to us",
        whatsapp: {
          label: "WhatsApp",
          phone: "+221770000000",
          message: "Hi — about the new release.",
        },
      },
    ],
  });
}
