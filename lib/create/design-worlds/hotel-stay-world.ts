import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Hotel Stay — hospitality design world (public aesthetic).
 * Archetype: boutique hotel / guesthouse · IA = Home · Rooms · Amenities · Stay · FAQ · Contact
 */

const ROOM1 = "";
const ROOM2 = "";
const ROOM3 = "";
const ROOM4 = "";

const NAV = [
  { label: "Rooms", href: "/rooms" },
  { label: "Amenities", href: "/amenities" },
  { label: "Stay", href: "/stay" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return { id, type: "navigation" as const, props: { brand: "Stay", links: [...NAV] } };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Stay — rest well, explore freely.",
      links: [
        { label: "Rooms", href: "/rooms" },
        { label: "Book", href: "/stay" },
      ],
    },
  };
}

export function hotelStayWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Hotel Stay",
    theme: {
      primary: "#1E3A5F",
      accent: "#C9A962",
      background: "#F5F7FA",
      text: "#1E3A5F",
      fontDisplay: "Playfair Display",
      fontBody: "IBM Plex Sans",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "coast-linen",
    },
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          nav("stay-nav-home"),
          {
            id: "stay-hero",
            type: "hero",
            props: {
              heading: "Rest well. Explore freely.",
              subheading:
                "Boutique rooms, local breakfast, and a concierge who knows the neighbourhood — book by WhatsApp or form.",
              buttonLabel: "See rooms",
              buttonHref: "/rooms",
              align: "left",
              background: "#F5F7FA",
            },
          },
          {
            id: "stay-hero-img",
            type: "image",
            props: { src: ROOM1, alt: "Hotel lobby light", caption: "Welcome in" },
          },
          {
            id: "stay-highlights",
            type: "features",
            props: {
              heading: "Why guests stay",
              items: [
                { title: "Calm rooms", body: "Clean spaces for every traveller — edit beds and rates." },
                { title: "Breakfast", body: "Local flavours to start the day." },
                { title: "Concierge", body: "Tips for the city, coast, and beyond." },
              ],
            },
          },
          {
            id: "stay-gallery",
            type: "gallery",
            props: {
              heading: "A look inside",
              layout: "featured",
              columns: 3,
              items: [
                { src: ROOM1, alt: "Lobby", href: "/rooms" },
                { src: ROOM2, alt: "Suite", href: "/rooms" },
                { src: ROOM3, alt: "Breakfast", href: "/amenities" },
                { src: ROOM4, alt: "Terrace", href: "/amenities" },
              ],
            },
          },
          {
            id: "stay-reviews",
            type: "testimonials",
            props: {
              heading: "Guest notes",
              items: [
                { quote: "Quiet, clean, and the breakfast was real food.", name: "Guest · Dakar" },
                { quote: "They helped us plan two perfect days in the city.", name: "Couple · Abidjan" },
              ],
            },
          },
          {
            id: "stay-popup",
            type: "email-popup",
            props: {
              enabled: true,
              mode: "email",
              heading: "Stay offers",
              body: "Occasional weekend rates — no spam.",
              buttonLabel: "Join",
              dismissLabel: "No thanks",
              delaySeconds: 8,
            },
          },
          footer("stay-footer-home"),
        ],
      },
      {
        slug: "rooms",
        title: "Rooms",
        sections: [
          nav("stay-nav-rooms"),
          {
            id: "stay-rooms-hero",
            type: "hero",
            props: {
              heading: "Rooms",
              subheading: "Swap photos and rates — remove sections if you only have two room types.",
              buttonLabel: "Book a stay",
              buttonHref: "/stay",
              align: "center",
              background: "#F5F7FA",
            },
          },
          {
            id: "stay-rooms-gallery",
            type: "gallery",
            props: {
              heading: "Room types",
              layout: "grid",
              columns: 2,
              items: [
                { src: ROOM1, alt: "Standard" },
                { src: ROOM2, alt: "Deluxe" },
                { src: ROOM3, alt: "Family" },
                { src: ROOM4, alt: "Suite" },
              ],
            },
          },
          {
            id: "stay-rooms-list",
            type: "features",
            props: {
              heading: "Details",
              items: [
                { title: "Standard", body: "Queen bed · AC · ensuite — from 35,000 FCFA (edit rates)." },
                { title: "Deluxe", body: "King bed · balcony · desk — from 55,000 FCFA." },
                { title: "Family", body: "Two rooms connecting — from 75,000 FCFA." },
              ],
            },
          },
          footer("stay-footer-rooms"),
        ],
      },
      {
        slug: "amenities",
        title: "Amenities",
        sections: [
          nav("stay-nav-amenities"),
          {
            id: "stay-am-hero",
            type: "hero",
            props: {
              heading: "Amenities",
              subheading: "Breakfast, Wi‑Fi, airport tips — add or remove what you offer.",
              buttonLabel: "Contact us",
              buttonHref: "/contact",
              align: "left",
              background: "#F5F7FA",
            },
          },
          {
            id: "stay-am-features",
            type: "features",
            props: {
              heading: "Included",
              items: [
                { title: "Breakfast", body: "Local bread, fruit, eggs — hours editable." },
                { title: "Wi‑Fi", body: "Reliable for remote work when available." },
                { title: "Airport", body: "We arrange trusted transfers on request." },
                { title: "Neighbourhood", body: "Maps and tips from our concierge." },
              ],
            },
          },
          footer("stay-footer-amenities"),
        ],
      },
      {
        slug: "stay",
        title: "Book a stay",
        sections: [
          nav("stay-nav-book"),
          {
            id: "stay-book-hero",
            type: "hero",
            props: {
              heading: "Book a stay",
              subheading: "Request dates on the form or WhatsApp — we confirm availability.",
              buttonLabel: "WhatsApp Stay",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#F5F7FA",
            },
          },
          {
            id: "stay-book-form",
            type: "form",
            props: {
              heading: "Request dates",
              subheading: "Check-in, nights, and room preference.",
              buttonLabel: "Send request",
              successMessage: "Received — we’ll confirm your stay.",
              fields: [
                { id: "name", label: "Name", type: "text", required: true, placeholder: "", options: [] },
                { id: "email", label: "Email", type: "email", required: true, placeholder: "", options: [] },
                { id: "phone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                {
                  id: "room",
                  label: "Room type",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Standard", "Deluxe", "Family", "Suite"],
                },
                {
                  id: "dates",
                  label: "Dates & notes",
                  type: "textarea",
                  required: true,
                  placeholder: "Check-in 12 Apr · 3 nights",
                  options: [],
                },
              ],
            },
          },
          {
            id: "stay-book-wa",
            type: "whatsapp",
            props: {
              label: "Book on WhatsApp",
              phone: "+221770000000",
              message: "Hi Stay — I’d like to book a room.",
            },
          },
          footer("stay-footer-book"),
        ],
      },
      {
        slug: "faq",
        title: "FAQ",
        sections: [
          nav("stay-nav-faq"),
          {
            id: "stay-faq",
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                {
                  question: "What is check-in / check-out?",
                  answer: "Check-in from 14:00 · check-out by 11:00 — edit for your house.",
                },
                {
                  question: "Payment?",
                  answer: "Cash, mobile money, and cards when available — update for your property.",
                },
                {
                  question: "Cancellation?",
                  answer: "Free until 48 hours before arrival — edit your policy.",
                },
              ],
            },
          },
          footer("stay-footer-faq"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("stay-nav-contact"),
          {
            id: "stay-contact-hero",
            type: "hero",
            props: {
              heading: "Contact",
              subheading: "Bookings, groups, and press.",
              buttonLabel: "WhatsApp",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#F5F7FA",
            },
          },
          {
            id: "stay-contact-details",
            type: "contact",
            props: {
              heading: "Property",
              email: "hello@stay.example",
              phone: "+221770000000",
              address: "Your street, city — edit in editor",
            },
          },
          {
            id: "stay-contact-wa",
            type: "whatsapp",
            props: {
              label: "WhatsApp Stay",
              phone: "+221770000000",
              message: "Hi Stay — contacting from the website.",
            },
          },
          footer("stay-footer-contact"),
        ],
      },
    ],
  };
}
