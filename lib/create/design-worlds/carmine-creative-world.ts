import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Carmine Creative — bold creative-agency design world (public aesthetic).
 * Archetype: agency · IA = Home · Work · Services · About · Journal · Contact
 * Deep red / ink — not a purple SaaS clone, not a one-page hero stack.
 */

const IMG = {
  hero: "",
  work1: "",
  work2: "",
  work3: "",
  work4: "",
  team: "",
} as const;

const NAV = [
  { label: "Work", href: "/work" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Journal", href: "/journal" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "CARMINE", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Carmine Creative — strategy, design, campaigns.",
      links: [
        { label: "Work", href: "/work" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function carmineCreativeWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Carmine Creative",
    theme: {
      primary: "#1A0505",
      accent: "#C1121F",
      background: "#FAF7F5",
      text: "#1A0505",
      fontDisplay: "Oswald",
      fontBody: "IBM Plex Sans",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      aestheticId: "carmine-ink",
    },
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          nav("carmine-nav-home"),
          {
            id: "carmine-hero",
            type: "hero",
            props: {
              heading: "Brands that move culture — not just logos",
              subheading:
                "Strategy, identity, web, and campaigns for African founders, labels, and growing companies. Brief us. We ship.",
              buttonLabel: "See selected work",
              buttonHref: "/work",
              align: "left",
              background: "#1A0505",
            },
          },
          {
            id: "carmine-hero-img",
            type: "image",
            props: {
              src: IMG.hero,
              alt: "Carmine studio workspace",
              caption: "Dakar · remote across Africa & diaspora",
            },
          },
          {
            id: "carmine-home-work",
            type: "gallery",
            props: {
              heading: "Selected work",
              layout: "featured",
              columns: 2,
              items: [
                { src: IMG.work1, alt: "Brand system", href: "/work" },
                { src: IMG.work2, alt: "Campaign", href: "/work" },
                { src: IMG.work3, alt: "Film", href: "/work" },
                { src: IMG.work4, alt: "Launch site", href: "/work" },
              ],
            },
          },
          {
            id: "carmine-home-services",
            type: "features",
            props: {
              heading: "What we do",
              items: [
                { title: "Brand systems", body: "Name, mark, type, colour — usable guidelines, not PDFs nobody opens." },
                { title: "Sites that sell", body: "Structured Kebu sites / stores — not slideshows." },
                { title: "Campaigns", body: "Launch plans, creative, and channel mix that fits your budget." },
              ],
            },
          },
          {
            id: "carmine-home-proof",
            type: "testimonials",
            props: {
              heading: "Clients",
              items: [
                {
                  quote: "They understood our market and delivered a brand we can pitch anywhere.",
                  name: "Founder · fashion label",
                },
                {
                  quote: "Clear process, honest timelines, and work that looks expensive without the theatre.",
                  name: "Marketing lead · fintech",
                },
              ],
            },
          },
          {
            id: "carmine-home-cta",
            type: "hero",
            props: {
              heading: "Have a brief?",
              subheading: "Send it on WhatsApp or the contact form — we reply in two business days.",
              buttonLabel: "Start a project",
              buttonHref: "/contact",
              align: "center",
            },
          },
          {
            id: "carmine-popup",
            type: "email-popup",
            props: {
              enabled: true,
              mode: "email",
              heading: "Studio notes",
              body: "Occasional process notes and open roles — no spam.",
              buttonLabel: "Subscribe",
              dismissLabel: "No thanks",
              delaySeconds: 8,
            },
          },
          footer("carmine-footer-home"),
        ],
      },
      {
        slug: "work",
        title: "Work",
        sections: [
          nav("carmine-nav-work"),
          {
            id: "carmine-work-hero",
            type: "hero",
            props: {
              heading: "Work",
              subheading: "Case frames — replace with your real projects and captions in Media.",
              buttonLabel: "Hire us",
              buttonHref: "/contact",
              align: "center",
            },
          },
          {
            id: "carmine-work-grid",
            type: "gallery",
            props: {
              heading: "Projects",
              layout: "grid",
              columns: 2,
              items: [
                { src: IMG.work1, alt: "Identity system" },
                { src: IMG.work2, alt: "Workshop" },
                { src: IMG.work3, alt: "Film still" },
                { src: IMG.work4, alt: "Live event" },
                { src: IMG.hero, alt: "Studio" },
                { src: IMG.team, alt: "Campaign moment" },
              ],
            },
          },
          {
            id: "carmine-work-note",
            type: "text",
            props: {
              heading: "How we present work",
              body: "Each project should show the problem, the system we built, and the outcome. Edit this page into real case studies — don’t leave stock forever.",
            },
          },
          footer("carmine-footer-work"),
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          nav("carmine-nav-services"),
          {
            id: "carmine-svc-hero",
            type: "hero",
            props: {
              heading: "Services",
              subheading: "Pick a lane or brief the full stack — identity through launch.",
              buttonLabel: "Talk pricing",
              buttonHref: "/contact",
              align: "left",
            },
          },
          {
            id: "carmine-svc-list",
            type: "features",
            props: {
              heading: "Engagements",
              items: [
                { title: "Brand identity", body: "Discovery → system → guidelines your team can actually use." },
                { title: "Web & product UI", body: "Sites and storefronts on Kebu — structured, editable, publishable." },
                { title: "Campaign creative", body: "Key visuals, motion, and channel kits for launches." },
                { title: "Retainer", body: "Monthly creative + site improvements for brands that ship often." },
              ],
            },
          },
          {
            id: "carmine-svc-faq",
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                {
                  question: "How do we start?",
                  answer: "Send a brief via WhatsApp or Contact — scope + timeline in two business days.",
                },
                {
                  question: "Do you work remotely?",
                  answer: "Yes — across Africa and diaspora. Studio days in Dakar when useful.",
                },
                {
                  question: "Do you build the website yourselves?",
                  answer: "Yes — on Kebu Builder so you keep editing after handoff.",
                },
              ],
            },
          },
          footer("carmine-footer-services"),
        ],
      },
      {
        slug: "about",
        title: "About",
        sections: [
          nav("carmine-nav-about"),
          {
            id: "carmine-about-hero",
            type: "hero",
            props: {
              heading: "About Carmine",
              subheading: "A creative studio that treats African markets as the main stage — not an afterthought.",
              buttonLabel: "See work",
              buttonHref: "/work",
              align: "left",
            },
          },
          {
            id: "carmine-about-img",
            type: "image",
            props: {
              src: IMG.team,
              alt: "Carmine creative culture",
              caption: "Culture-forward, commercially serious",
            },
          },
          {
            id: "carmine-about-body",
            type: "text",
            props: {
              heading: "Studio note",
              body: "Carmine exists because generic agency templates erase personality. We designed this world for agencies that need Work, Services, About, Journal, and Contact — with proof, process, and a real brief intake — not three feature cards and a stock handshake.",
            },
          },
          footer("carmine-footer-about"),
        ],
      },
      {
        slug: "journal",
        title: "Journal",
        sections: [
          nav("carmine-nav-journal"),
          {
            id: "carmine-journal-intro",
            type: "text",
            props: {
              heading: "Journal",
              body: "Process notes and studio thinking. Publish posts from Blog in the builder.",
            },
          },
          {
            id: "carmine-blog",
            type: "blog-list",
            props: {
              heading: "From the studio",
              subheading: "Notes on brand, craft, and shipping.",
              postsPerPage: 6,
            },
          },
          footer("carmine-footer-journal"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("carmine-nav-contact"),
          {
            id: "carmine-contact-hero",
            type: "hero",
            props: {
              heading: "Contact",
              subheading: "Briefs, careers, press — we read everything.",
              buttonLabel: "WhatsApp the studio",
              buttonHref: "#whatsapp",
              align: "center",
            },
          },
          {
            id: "carmine-form",
            type: "form",
            props: {
              heading: "Send a brief",
              subheading: "Include goals, timeline, and budget range if you have one.",
              buttonLabel: "Send brief",
              successMessage: "Got it — Carmine will reply soon.",
              fields: [
                { id: "name", label: "Name", type: "text", required: true, placeholder: "", options: [] },
                { id: "email", label: "Email", type: "email", required: true, placeholder: "", options: [] },
                { id: "company", label: "Company", type: "text", required: false, placeholder: "", options: [] },
                {
                  id: "budget",
                  label: "Budget range",
                  type: "select",
                  required: false,
                  placeholder: "",
                  options: ["Under 1M XOF", "1–5M XOF", "5M+ XOF", "Not sure yet"],
                },
                {
                  id: "message",
                  label: "Brief",
                  type: "textarea",
                  required: true,
                  placeholder: "What are you building?",
                  options: [],
                },
              ],
            },
          },
          {
            id: "carmine-contact-details",
            type: "contact",
            props: {
              heading: "Studio",
              email: "hello@carmine.example",
              phone: "+221770000000",
              address: "Dakar — edit your address",
            },
          },
          {
            id: "carmine-wa",
            type: "whatsapp",
            props: {
              label: "WhatsApp Carmine",
              phone: "+221770000000",
              message: "Hi Carmine — I have a project brief.",
            },
          },
          footer("carmine-footer-contact"),
        ],
      },
    ],
  };
}
