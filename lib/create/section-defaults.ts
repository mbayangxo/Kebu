import { defaultMaylecorHomeProps, defaultMaylecorMusicProps } from "./maylecor-defaults";
import { defaultLegallyBlondeHeroProps } from "./legally-blonde-defaults";
import { DEFAULT_HERO_PROPS } from "./schemas";
import type { z } from "zod";
import { sectionTypeSchema } from "./website-schema";

type SectionType = z.infer<typeof sectionTypeSchema>;

/** Default props when adding a section in the editor. */
export function defaultSectionProps(type: SectionType): Record<string, unknown> {
  switch (type) {
    case "hero":
      return DEFAULT_HERO_PROPS;
    case "navigation":
      return { brand: "My site", links: [{ label: "Home", href: "#" }] };
    case "text":
      return { heading: "About", body: "Tell your story." };
    case "features":
      return { heading: "Features", items: [{ title: "Feature", body: "Describe it." }] };
    case "testimonials":
      return { heading: "Testimonials", items: [{ quote: "Great experience.", name: "Customer" }] };
    case "faq":
      return { heading: "FAQ", items: [{ question: "How do I start?", answer: "Contact us." }] };
    case "contact":
      return { heading: "Contact", email: "", phone: "", address: "" };
    case "whatsapp":
      return { label: "Chat on WhatsApp", phone: "+221770000000", message: "Hello" };
    case "footer":
      return { text: "© My site", links: [] };
    case "image":
      return { src: "", alt: "" };
    case "gallery":
      return { items: [] };
    case "video":
      return { heading: "Watch", src: "", title: "", caption: "" };
    case "audio":
      return { heading: "Listen", src: "", title: "", artist: "" };
    case "map":
      return { heading: "Find us", address: "Dakar, Senegal", latitude: 14.7167, longitude: -17.4677, zoom: 13 };
    case "events":
      return {
        heading: "Events",
        items: [{ title: "Launch night", date: "2026-09-15", location: "Dakar", description: "", ticketUrl: "#" }],
      };
    case "maylecor-home":
      return defaultMaylecorHomeProps();
    case "maylecor-music":
      return defaultMaylecorMusicProps();
    case "legally-blonde-hero":
      return defaultLegallyBlondeHeroProps();
    default:
      return {};
  }
}
