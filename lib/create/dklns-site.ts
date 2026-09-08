import type { WebsiteDefinition } from "./website-schema";
import { defaultMaylecorShopProducts } from "./maylecor-content-defaults";
import { MAYLECOR_WIX } from "./maylecor-defaults";

/** DkLNS — talent management + creative + content agency aesthetic. */
export const DKLNS_AESTHETIC_ID = "dklns-lumen" as const;

export function dklnsAgencyTheme(): WebsiteDefinition["theme"] {
  return {
    primary: "#071210",
    accent: "#5CFFB0",
    background: "#071210",
    text: "#F4F7F5",
    fontDisplay: "Oswald",
    fontBody: "system-ui",
    spacing: "airy",
    bodySize: "md",
    headingScale: "lg",
    letterSpacing: "wide",
    aestheticId: DKLNS_AESTHETIC_ID,
  };
}

/** Primary chrome — Artists tab opens signed talent spaces. */
export const DKLNS_NAV = [
  { label: "Home", href: "/" },
  { label: "Artists", href: "/artists" },
  { label: "Services", href: "/services" },
  { label: "Creative", href: "/creative" },
  { label: "Partners", href: "/partners" },
  { label: "Contact", href: "/contact" },
] as const;

/** Signed artists — each gets a personal page under DkLNS. */
export const DKLNS_SIGNED_ARTISTS = [
  {
    slug: "may-lecor",
    name: "May Lecor",
    role: "Artist · signed",
    blurb:
      "May Lecor is signed to DkLNS for management. Music, image, career strategy — and merch drops that match the world.",
    image: MAYLECOR_WIX.portraitMain,
  },
] as const;

/** Multi-page DkLNS agency site — Artists hub + personal pages + merch. */
export function dklnsWebsiteDefinition(): WebsiteDefinition {
  const theme = dklnsAgencyTheme();
  return {
    schemaVersion: "website-v1",
    title: "DkLNS",
    theme,
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "dklns-nav",
            type: "navigation",
            props: { brand: "DkLNS", links: [...DKLNS_NAV] },
          },
          {
            id: "dklns-hero",
            type: "hero",
            props: {
              heading: "DkLNS",
              subheading:
                "Management. Creative. Content. An agency that builds careers and brands — with clarity, taste, and follow-through.",
              buttonLabel: "Meet the artists",
              buttonHref: "/artists",
              align: "left",
              background: "#071210",
            },
          },
          {
            id: "dklns-home-about",
            type: "text",
            props: {
              heading: "Agency, not noise",
              body:
                "DkLNS is a management and creative agency. We represent talent, shape creative direction, and run content systems that actually ship. Artists, founders, and labels come to us when they need a partner who can hold strategy and craft in the same room.",
            },
          },
          {
            id: "dklns-home-pillars",
            type: "features",
            props: {
              heading: "What we do",
              items: [
                {
                  title: "Talent management",
                  body: "Career arcs, deals, touring, brand partnerships — long-game management for artists who are building empires, not just releases.",
                },
                {
                  title: "Creative direction",
                  body: "Visual language, campaign concepts, and brand systems that feel expensive without feeling generic.",
                },
                {
                  title: "Content systems",
                  body: "From brief to calendar to publish — we help companies and artists stay visible with disciplined, beautiful content.",
                },
              ],
            },
          },
          {
            id: "dklns-home-signed",
            type: "features",
            props: {
              heading: "Signed to DkLNS",
              layout: "moodboard",
              items: DKLNS_SIGNED_ARTISTS.map((a) => ({
                title: a.name,
                body: a.blurb.slice(0, 220),
                href: `/${a.slug}`,
                image: a.image,
              })),
            },
          },
          {
            id: "dklns-home-cta",
            type: "hero",
            props: {
              heading: "Build with DkLNS",
              subheading: "Talent, brands, and productions — tell us what you are building.",
              buttonLabel: "Contact the agency",
              buttonHref: "/contact",
              align: "left",
              background: "#0B1A16",
            },
          },
        ],
      },
      {
        slug: "artists",
        title: "Artists",
        sections: [
          {
            id: "dklns-artists-nav",
            type: "navigation",
            props: { brand: "DkLNS", links: [...DKLNS_NAV] },
          },
          {
            id: "dklns-artists-hero",
            type: "hero",
            props: {
              heading: "Artists",
              subheading:
                "Signed talent under DkLNS. Press an artist for their page — merch, press, and a manager desk (LLC, scale brainstorm, business ideas).",
              buttonLabel: "Agency services",
              buttonHref: "/services",
              align: "left",
              background: "#0B1A16",
            },
          },
          {
            id: "dklns-artists-grid",
            type: "features",
            props: {
              heading: "Signed to us",
              layout: "moodboard",
              items: [
                ...DKLNS_SIGNED_ARTISTS.map((a) => ({
                  title: a.name,
                  body: `${a.role}. Open their space.`,
                  href: `/${a.slug}`,
                  image: a.image,
                })),
                {
                  title: "Next signing",
                  body: "Selective roster — quality over volume. Inquire via Contact.",
                  href: "/contact",
                  image: MAYLECOR_WIX.logoBanner,
                },
              ],
            },
          },
        ],
      },
      {
        slug: "may-lecor",
        title: "May Lecor",
        sections: [
          {
            id: "dklns-may-nav",
            type: "navigation",
            props: { brand: "DkLNS", links: [...DKLNS_NAV] },
          },
          {
            id: "dklns-may-hero",
            type: "hero",
            props: {
              heading: "May Lecor",
              subheading:
                "Signed to DkLNS. Artist management, image, and career strategy — with a merch lane fans can shop.",
              buttonLabel: "Back to Artists",
              buttonHref: "/artists",
              align: "left",
              background: "#071210",
            },
          },
          {
            id: "dklns-may-about",
            type: "text",
            props: {
              heading: "Artist space",
              body:
                "This is May Lecor's personal page inside the DkLNS agency site — for press, partners, and fans who land on the roster first. Her full artist world (May's World, May by May, shop) lives on the May Lecor site; here we keep the agency story, merch, and the manager desk to help her business scale.",
            },
          },
          {
            id: "dklns-may-facts",
            type: "features",
            props: {
              heading: "At a glance",
              items: [
                {
                  title: "Management",
                  body: "Career, deals, touring, and brand partnerships sit with DkLNS.",
                },
                {
                  title: "Manager desk",
                  body: "LLC help, brainstorm how to scale, confirm the plan, and grow business ideas.",
                  href: "/may-lecor-build",
                },
                {
                  title: "World",
                  body: "Music, video, Maygazine, and May by May cooking live on maylecor.kebu.africa.",
                  href: "https://maylecor.kebu.africa/mays-world",
                },
              ],
            },
          },
          {
            id: "dklns-may-manager-preview",
            type: "features",
            props: {
              heading: "How managers help",
              items: [
                {
                  title: "Business & LLC",
                  body: "Structure the company, paperwork, and ownership so the artist can grow clean.",
                  href: "/may-lecor-build",
                },
                {
                  title: "Build & scale",
                  body: "Brainstorm, then confirm a clear plan for how we help the artist scale.",
                  href: "/may-lecor-build",
                },
                {
                  title: "Business ideas",
                  body: "Explore merch, experiences, and ventures with the artist — then pick what to ship.",
                  href: "/may-lecor-build",
                },
              ],
            },
          },
          {
            id: "dklns-may-merch",
            type: "products",
            props: {
              heading: "Merch",
              layout: "grid",
              columns: 3,
              items: defaultMaylecorShopProducts(),
            },
          },
          {
            id: "dklns-may-wa",
            type: "whatsapp",
            props: {
              label: "Order May Lecor merch",
              phone: "+221770000000",
              message: "Hi DkLNS / May Lecor — I want to order merch from the artist page.",
            },
          },
          {
            id: "dklns-may-press",
            type: "text",
            props: {
              heading: "Press & bookings",
              body: "Media and booking inquiries for May Lecor go through DkLNS — use Contact, or reach the press desk on the May Lecor site.",
            },
          },
        ],
      },
      {
        slug: "may-lecor-build",
        title: "May Lecor — Manager desk",
        sections: [
          {
            id: "dklns-may-build-nav",
            type: "navigation",
            props: { brand: "DkLNS", links: [...DKLNS_NAV] },
          },
          {
            id: "dklns-may-build-hero",
            type: "hero",
            props: {
              heading: "Manager desk — May Lecor",
              subheading:
                "For DkLNS managers: help with business & LLCs, brainstorm how she scales, confirm the plan, and grow business ideas with the artist.",
              buttonLabel: "Back to artist page",
              buttonHref: "/may-lecor",
              align: "left",
              background: "#0B1A16",
            },
          },
          {
            id: "dklns-may-build-llc",
            type: "text",
            props: {
              heading: "Business & LLC",
              body:
                "Managers help the artist set up and keep a real business: LLC or local company form, ownership notes, bank/mobile money readiness, contracts, and tax basics. Edit this checklist with the exact country steps (Senegal first) and what is already done vs still open. Never invent a registration number — only publish what is verified.",
            },
          },
          {
            id: "dklns-may-build-llc-steps",
            type: "features",
            props: {
              heading: "LLC & company checklist",
              items: [
                {
                  title: "Entity",
                  body: "Choose and register the right structure (LLC / SARL / sole trader) with counsel.",
                },
                {
                  title: "Ownership",
                  body: "Clear founder % and roles — written, not only verbal.",
                },
                {
                  title: "Money rails",
                  body: "Business account / mobile money + invoicing path for deals and merch.",
                },
                {
                  title: "Contracts",
                  body: "Templates for bookings, brand deals, and merch partners ready to use.",
                },
              ],
            },
          },
          {
            id: "dklns-may-build-scale",
            type: "text",
            props: {
              heading: "Build · brainstorm · confirm · scale",
              body:
                "This is the space managers use with the artist: dump ideas, stress-test them, then confirm one scale plan. Use the steps below in meetings — update the notes after each session so the plan survives refresh and new teammates.",
            },
          },
          {
            id: "dklns-may-build-flow",
            type: "features",
            props: {
              heading: "Scale workspace",
              items: [
                {
                  title: "1 · Brainstorm",
                  body: "List tours, content, merch, brand deals, and side ventures — no filter yet.",
                },
                {
                  title: "2 · Confirm",
                  body: "Pick what we will do this quarter. Write owner, budget, and success signal.",
                },
                {
                  title: "3 · Help scale",
                  body: "DkLNS executes: team, partners (Ndaoan / K-Direction), calendar, and follow-through.",
                },
                {
                  title: "4 · Review",
                  body: "What shipped, what stalled, what to kill or double — then loop.",
                },
              ],
            },
          },
          {
            id: "dklns-may-build-confirm",
            type: "faq",
            props: {
              heading: "Confirm the plan (edit after each meeting)",
              items: [
                {
                  question: "What are we scaling this quarter?",
                  answer:
                    "Replace with the confirmed focus — e.g. merch drop + May by May + one brand deal. Keep it specific.",
                },
                {
                  question: "Who owns each lane?",
                  answer:
                    "Name the DkLNS manager, the artist decision rights, and any partner house for creative/production.",
                },
                {
                  question: "How do we know it worked?",
                  answer:
                    "Define honest numbers: orders, streams, show asks, or cash — never fake analytics.",
                },
              ],
            },
          },
          {
            id: "dklns-may-build-ideas",
            type: "features",
            props: {
              heading: "Business ideas with the artist",
              layout: "moodboard",
              items: [
                {
                  title: "Merch & drops",
                  body: "Limited runs tied to releases and May's World moments.",
                  href: "/may-lecor",
                  image: MAYLECOR_WIX.collageTop,
                },
                {
                  title: "May by May",
                  body: "Cooking content → products, collabs, and kitchen brand partners.",
                  href: "https://maylecor.kebu.africa/may-by-may",
                  image: MAYLECOR_WIX.bottomLeft,
                },
                {
                  title: "Live & tour",
                  body: "Show strategy, guarantees, and sponsorship packages.",
                  image: MAYLECOR_WIX.bottomRight,
                },
                {
                  title: "Brand deals",
                  body: "Fits that match May's voice — not every offer.",
                  image: MAYLECOR_WIX.portraitMain,
                },
                {
                  title: "Education / youth",
                  body: "Tie career growth to Mayjor Good and youth opportunity when it fits.",
                  href: "https://mayjorgood.kebu.africa/opportunity",
                  image: MAYLECOR_WIX.logoBanner,
                },
                {
                  title: "New idea",
                  body: "Add the next venture here after brainstorm — then move it into Confirm.",
                  image: MAYLECOR_WIX.albumArt,
                },
              ],
            },
          },
          {
            id: "dklns-may-build-wa",
            type: "whatsapp",
            props: {
              label: "Manager ↔ artist note",
              phone: "+221770000000",
              message:
                "Hi DkLNS / May — update on LLC / scale plan / business idea from the manager desk.",
            },
          },
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          {
            id: "dklns-svc-nav",
            type: "navigation",
            props: { brand: "DkLNS", links: [...DKLNS_NAV] },
          },
          {
            id: "dklns-svc-hero",
            type: "hero",
            props: {
              heading: "Services",
              subheading: "Management · creative · content help — one agency stack.",
              buttonLabel: "Talk to us",
              buttonHref: "/contact",
              align: "left",
              background: "#071210",
            },
          },
          {
            id: "dklns-svc-list",
            type: "features",
            props: {
              heading: "Agency services",
              items: [
                {
                  title: "Management",
                  body: "Representation, negotiations, scheduling, and career planning for talent.",
                },
                {
                  title: "Creative",
                  body: "Campaign concepts, art direction briefs, brand toolkits, and launch narratives.",
                },
                {
                  title: "Content help",
                  body: "Editorial calendars, shoot planning, post workflows, and ongoing content ops for companies and artists.",
                },
                {
                  title: "Production liaison",
                  body: "When the work needs film, commercials, animation, or photography at scale, we partner with Ndaoan House.",
                },
              ],
            },
          },
          {
            id: "dklns-svc-faq",
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                {
                  question: "Do you only manage musicians?",
                  answer:
                    "Music is a core lane (May Lecor is signed), but DkLNS also supports creators and brands that need management + creative + content systems.",
                },
                {
                  question: "Can you produce a commercial?",
                  answer:
                    "We brief and manage the creative side. Full production — film, commercials, animation, photography — runs through Ndaoan House and aligned partners like K-Direction.",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "creative",
        title: "Creative",
        sections: [
          {
            id: "dklns-cre-nav",
            type: "navigation",
            props: { brand: "DkLNS", links: [...DKLNS_NAV] },
          },
          {
            id: "dklns-cre-hero",
            type: "hero",
            props: {
              heading: "Creative",
              subheading: "Taste with a process — concepts that survive real budgets and real audiences.",
              buttonLabel: "Partner houses",
              buttonHref: "/partners",
              align: "left",
              background: "#0B1A16",
            },
          },
          {
            id: "dklns-cre-body",
            type: "text",
            props: {
              heading: "How we create",
              body:
                "DkLNS runs creative as an agency practice: research, positioning, visual language, then a production plan. We do not dump moodboards and disappear. Content helping means we stay through the calendar — captions, cuts, and campaigns that match the brand.",
            },
          },
          {
            id: "dklns-cre-gallery",
            type: "gallery",
            props: {
              heading: "Creative directions",
              items: [
                { src: "/templates/maylecor/logo-stacked.png", alt: "Artist brand work" },
                { src: "/templates/maylecor/logo-banner.jpg", alt: "Campaign texture" },
              ],
            },
          },
        ],
      },
      {
        slug: "partners",
        title: "Partners",
        sections: [
          {
            id: "dklns-par-nav",
            type: "navigation",
            props: { brand: "DkLNS", links: [...DKLNS_NAV] },
          },
          {
            id: "dklns-par-hero",
            type: "hero",
            props: {
              heading: "Partners",
              subheading: "DkLNS works with houses that can execute — not just advise.",
              buttonLabel: "Contact",
              buttonHref: "/contact",
              align: "left",
              background: "#071210",
            },
          },
          {
            id: "dklns-par-list",
            type: "features",
            props: {
              heading: "Who we build with",
              items: [
                {
                  title: "Ndaoan House",
                  body: "Production company for films, commercials, animation, photography, and internet content studios. DkLNS briefs; Ndaoan House shoots and finishes.",
                },
                {
                  title: "K-Direction",
                  body: "Label and artistry partner. Shared talent moments, events, and creative worlds — especially around May Lecor.",
                },
                {
                  title: "May Lecor",
                  body: "Signed artist under DkLNS — open her personal page for merch and the agency story.",
                  href: "/may-lecor",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          {
            id: "dklns-con-nav",
            type: "navigation",
            props: { brand: "DkLNS", links: [...DKLNS_NAV] },
          },
          {
            id: "dklns-con-hero",
            type: "hero",
            props: {
              heading: "Contact",
              subheading: "Management inquiries, creative briefs, and content partnerships.",
              buttonLabel: "WhatsApp DkLNS",
              buttonHref: "#whatsapp",
              align: "left",
              background: "#071210",
            },
          },
          {
            id: "dklns-con-info",
            type: "contact",
            props: {
              heading: "Reach the agency",
              email: "hello@dklns.com",
              phone: "+221770000000",
              address: "Dakar · worldwide",
            },
          },
          {
            id: "dklns-con-wa",
            type: "whatsapp",
            props: {
              label: "Message DkLNS",
              phone: "+221770000000",
              message: "Hi DkLNS — I want to talk management / creative / content.",
            },
          },
          {
            id: "dklns-con-footer",
            type: "footer",
            props: {
              text: "© DkLNS — Management · Creative · Content. Partners: Ndaoan · K-Direction.",
            },
          },
        ],
      },
    ],
  };
}
