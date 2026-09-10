import { defaultMaylecorHomeProps, defaultMaylecorMusicProps } from "./maylecor-defaults";
import { defaultLegallyBlondeHeroProps } from "./legally-blonde-defaults";
import { defaultKdirectionHomeProps, defaultKdirectionPageProps } from "./kdirection-defaults";
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
      return {
        brand: "My site",
        links: [
          { label: "Home", href: "/" },
          { label: "About", href: "/about" },
          { label: "Contact", href: "/contact" },
        ],
      };
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
    case "newsletter":
      return {
        heading: "Stay in the loop",
        subheading: "Get updates, offers, and news by email.",
        buttonLabel: "Subscribe",
        successMessage: "Thanks — you're on the list.",
      };
    case "form":
      return {
        heading: "Contact us",
        subheading: "Send a message — we reply on WhatsApp or email.",
        buttonLabel: "Send",
        successMessage: "Thanks — we received your message.",
        fields: [
          { id: "name", label: "Your name", type: "text", required: true, placeholder: "", options: [] },
          { id: "email", label: "Email", type: "email", required: false, placeholder: "", options: [] },
          { id: "message", label: "Message", type: "textarea", required: true, placeholder: "", options: [] },
        ],
      };
    case "blog-list":
      return {
        heading: "Blog",
        subheading: "News and updates from our team.",
        postsPerPage: 6,
      };
    case "email-popup":
      return {
        enabled: true,
        mode: "both",
        heading: "Stay in the loop",
        body: "Get offers by email. We respect your inbox — unsubscribe anytime.",
        buttonLabel: "Subscribe",
        dismissLabel: "No thanks",
        consentLabel: "I agree to cookies needed for this site to work.",
        acceptConsentLabel: "Accept",
        successMessage: "You're on the list.",
        delaySeconds: 4,
        remindAfterDays: 14,
      };
    case "whatsapp":
      return { label: "Chat on WhatsApp", phone: "+221770000000", message: "Hello" };
    case "footer":
      return { text: "© My site", links: [] };
    case "image":
      return { src: "", alt: "" };
    case "gallery":
      return { items: [], layout: "grid", columns: 3 };
    case "video":
      return {
        heading: "Videos",
        src: "",
        title: "",
        caption: "",
        layout: "grid",
        columns: 2,
        items: [
          { src: "", title: "Video 1", caption: "", thumbnail: "" },
          { src: "", title: "Video 2", caption: "", thumbnail: "" },
        ],
      };
    case "audio":
      return { heading: "Listen", src: "", title: "", artist: "" };
    case "products":
      return { heading: "Shop", layout: "grid", columns: 3, items: [] };
    case "free-text":
      return {
        heading: "Custom layout",
        minHeight: 420,
        backgroundImage: "",
        blocks: [
          {
            id: "text-1",
            text: "Replace this mock text with yours",
            x: 8,
            y: 12,
            width: 84,
            fontSize: "lg",
            align: "center",
            color: "",
            fontFamily: "",
          },
          {
            id: "text-2",
            text: "Add more boxes · pick fonts · drag to place",
            x: 12,
            y: 36,
            width: 76,
            fontSize: "md",
            align: "center",
            color: "",
            fontFamily: "",
          },
        ],
      };
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
    case "kdirection-home":
      return defaultKdirectionHomeProps();
    case "kdirection-page":
      return defaultKdirectionPageProps();
    default:
      return {};
  }
}
