import type { WebsiteDefinition } from "./website-schema";

/**
 * For The Mayjor Good — May Lecor’s foundation.
 * Living as an example of God’s love through art, opportunity, and service.
 * Focus: school supplies, SST & talibés, food & shower, medical, monthly groceries,
 * clinic visits, orphans, and job opportunities for youth.
 */
export const MAYJOR_GOOD_AESTHETIC_ID = "mayjor-grace" as const;

export const MAYJOR_CREAM = "#FFF8F3";
export const MAYJOR_ROSE = "#E9006B";
export const MAYJOR_INK = "#1A0F14";
export const MAYJOR_GOLD = "#C4A35A";

export function mayjorGoodTheme(): WebsiteDefinition["theme"] {
  return {
    primary: MAYJOR_INK,
    accent: MAYJOR_ROSE,
    background: MAYJOR_CREAM,
    text: MAYJOR_INK,
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "airy",
    bodySize: "md",
    headingScale: "lg",
    letterSpacing: "normal",
    aestheticId: MAYJOR_GOOD_AESTHETIC_ID,
  };
}

export const MAYJOR_GOOD_NAV = [
  { label: "Home", href: "/" },
  { label: "Mission", href: "/mission" },
  { label: "Art", href: "/art" },
  { label: "Opportunity", href: "/opportunity" },
  { label: "Service", href: "/service" },
  { label: "Impact", href: "/impact" },
  { label: "Give", href: "/give" },
  { label: "Contact", href: "/contact" },
] as const;

function navSection(pageId: string) {
  return {
    id: `mayjor-nav-${pageId}`,
    type: "navigation" as const,
    props: { brand: "For The Mayjor Good", links: [...MAYJOR_GOOD_NAV] },
  };
}

function footerSection(pageId: string) {
  return {
    id: `mayjor-footer-${pageId}`,
    type: "footer" as const,
    props: {
      text: "For The Mayjor Good — youth · school · care · jobs. God’s love in action.",
      links: [
        { label: "Mission", href: "/mission" },
        { label: "Give", href: "/give" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

/** Multi-page foundation site — owner portfolio on Kebu. */
export function mayjorGoodWebsiteDefinition(): WebsiteDefinition {
  const theme = mayjorGoodTheme();
  return {
    schemaVersion: "website-v1",
    title: "For The Mayjor Good",
    theme,
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          navSection("home"),
          {
            id: "mayjor-hero",
            type: "hero",
            props: {
              heading: "For The Mayjor Good",
              subheading:
                "We help youth with school supplies, care for SST & talibés, food and showers, medical and clinic visits, monthly groceries, support for orphans, and real job opportunities.",
              buttonLabel: "Our mission",
              buttonHref: "/mission",
              align: "center",
              background: MAYJOR_CREAM,
            },
          },
          {
            id: "mayjor-home-pillars",
            type: "features",
            props: {
              heading: "How we help youth",
              layout: "moodboard",
              items: [
                {
                  title: "School supplies",
                  body: "Bags, books, uniforms, and tools so students can show up ready to learn.",
                  href: "/service",
                },
                {
                  title: "SST & talibés",
                  body: "Dignity and care for talibés and SST — food, showers, and steady support.",
                  href: "/service",
                },
                {
                  title: "Food · shower · medical",
                  body: "Daily care basics plus clinic visits and medical help when needed.",
                  href: "/service",
                },
                {
                  title: "Monthly groceries",
                  body: "Grocery supplies every month for students and families we walk with.",
                  href: "/service",
                },
                {
                  title: "Orphans",
                  body: "Steady care for orphans — school, food, and belonging.",
                  href: "/service",
                },
                {
                  title: "Youth jobs",
                  body: "Job opportunities and pathways so young people can earn and grow.",
                  href: "/opportunity",
                },
              ],
            },
          },
          {
            id: "mayjor-home-about",
            type: "text",
            props: {
              heading: "Love you can see",
              body:
                "For The Mayjor Good is May Lecor’s foundation. We live as an example of God’s love through art, opportunity, and service — with a clear goal: help youth. School supplies, SST and talibés care, food and showers, medical and monthly clinic visits, monthly groceries for students, care for orphans, and job opportunities for youth.",
            },
          },
          {
            id: "mayjor-home-cta",
            type: "features",
            props: {
              heading: "Walk with us",
              items: [
                {
                  title: "Give",
                  body: "Fund school kits, groceries, clinic days, and youth job pathways.",
                  href: "/give",
                },
                {
                  title: "Serve",
                  body: "Join food, shower, medical, and supply days with dignity.",
                  href: "/service",
                },
                {
                  title: "Partner",
                  body: "Schools, clinics, and employers who want to help youth with us.",
                  href: "/contact",
                },
              ],
            },
          },
          footerSection("home"),
        ],
      },
      {
        slug: "mission",
        title: "Mission",
        sections: [
          navSection("mission"),
          {
            id: "mayjor-mission-hero",
            type: "hero",
            props: {
              heading: "Our mission",
              subheading:
                "Live as an example of God’s love — and help youth with school, care, health, food, and work.",
              buttonLabel: "See our goals",
              buttonHref: "/impact",
              align: "left",
              background: MAYJOR_CREAM,
            },
          },
          {
            id: "mayjor-mission-body",
            type: "text",
            props: {
              heading: "Why we exist",
              body:
                "We want youth to eat, learn, stay clean and healthy, and find work. For The Mayjor Good focuses on school supplies; SST and talibés; food and showers; medical care and monthly clinic visits; monthly grocery supplies (including for students); care for orphans; and job opportunities for youth. We are a foundation — replace this page with your legal name, board, and registered details when ready. Never claim impact you have not verified.",
            },
          },
          {
            id: "mayjor-mission-goals",
            type: "features",
            props: {
              heading: "Our goals",
              items: [
                {
                  title: "Learn",
                  body: "School supplies so students can stay in class with what they need.",
                },
                {
                  title: "Care",
                  body: "SST & talibés, orphans, food, showers, and medical support with dignity.",
                },
                {
                  title: "Sustain",
                  body: "Monthly groceries and monthly clinic visits — not one-off photo ops.",
                },
                {
                  title: "Work",
                  body: "Job opportunities and pathways so youth can earn and build.",
                },
              ],
            },
          },
          {
            id: "mayjor-mission-faq",
            type: "faq",
            props: {
              heading: "In plain words",
              items: [
                {
                  question: "Who is this for?",
                  answer:
                    "Youth and children who need school supplies, food, hygiene, medical care, grocery support, and job pathways — including SST, talibés, students, and orphans. Exact communities are named as programs launch.",
                },
                {
                  question: "How is this different from May’s artist site?",
                  answer:
                    "May Lecor’s music site is her artistry. For The Mayjor Good is the foundation — giving, service, and youth impact.",
                },
                {
                  question: "Is faith part of the work?",
                  answer:
                    "Yes. We live as an example of God’s love. Everyone is welcome; we serve without shame or pressure.",
                },
              ],
            },
          },
          footerSection("mission"),
        ],
      },
      {
        slug: "art",
        title: "Art",
        sections: [
          navSection("art"),
          {
            id: "mayjor-art-hero",
            type: "hero",
            props: {
              heading: "Art that uplifts youth",
              subheading:
                "Creative expression that builds confidence — while our core care work stays school, food, health, and jobs.",
              buttonLabel: "Get involved",
              buttonHref: "/give",
              align: "left",
              background: MAYJOR_CREAM,
            },
          },
          {
            id: "mayjor-art-body",
            type: "text",
            props: {
              heading: "Creativity with purpose",
              body:
                "Art programs under For The Mayjor Good help youth make and share beauty — music, dance, visual art, and story. Art sits beside practical care: school kits, meals, and job pathways. Add real workshops and dates as they go live.",
            },
          },
          {
            id: "mayjor-art-features",
            type: "features",
            props: {
              heading: "Art pillars",
              items: [
                {
                  title: "Workshops",
                  body: "Hands-on sessions where beginners and rising artists grow side by side.",
                },
                {
                  title: "Showcases",
                  body: "Stages that celebrate community talent with care.",
                },
                {
                  title: "Mentorship",
                  body: "Artists walking with youth — craft plus character.",
                },
              ],
            },
          },
          footerSection("art"),
        ],
      },
      {
        slug: "opportunity",
        title: "Opportunity",
        sections: [
          navSection("opportunity"),
          {
            id: "mayjor-opp-hero",
            type: "hero",
            props: {
              heading: "Job opportunities for youth",
              subheading:
                "We want to help youth work — skills, introductions, and real pathways to earn — not empty promises.",
              buttonLabel: "Partner on jobs",
              buttonHref: "/contact",
              align: "left",
              background: MAYJOR_CREAM,
            },
          },
          {
            id: "mayjor-opp-body",
            type: "text",
            props: {
              heading: "From school to work",
              body:
                "Opportunity for us means job opportunities for youth: training, apprenticeships, employer intros, and tools to start small. Students we support with school supplies and monthly groceries should also see a path to earn. We name each program honestly when it launches — no fake application portals.",
            },
          },
          {
            id: "mayjor-opp-features",
            type: "features",
            props: {
              heading: "What opportunity looks like",
              items: [
                {
                  title: "Youth jobs",
                  body: "Openings, apprenticeships, and paid work we help youth find or create.",
                },
                {
                  title: "Learn for work",
                  body: "Practical skills tied to real employers and creative careers.",
                },
                {
                  title: "Student support",
                  body: "Monthly groceries for students so hunger does not kill the chance to learn.",
                },
                {
                  title: "Build",
                  body: "Help youth start small projects and habits that lead to income.",
                },
              ],
            },
          },
          footerSection("opportunity"),
        ],
      },
      {
        slug: "service",
        title: "Service",
        sections: [
          navSection("service"),
          {
            id: "mayjor-service-hero",
            type: "hero",
            props: {
              heading: "Service with dignity",
              subheading:
                "School supplies · SST & talibés · food & shower · medical · monthly groceries · clinic visits · orphans.",
              buttonLabel: "Volunteer",
              buttonHref: "/contact",
              align: "left",
              background: MAYJOR_CREAM,
            },
          },
          {
            id: "mayjor-service-body",
            type: "text",
            props: {
              heading: "Love in motion",
              body:
                "Service is where love becomes visible. We focus on school supplies; care for SST and talibés; food and showers; medical help; grocery supplies every month; clinic visits every month; monthly groceries for students; and care for orphans. We serve people as image-bearers — never as projects. List next service days here when scheduled.",
            },
          },
          {
            id: "mayjor-service-features",
            type: "features",
            props: {
              heading: "How we serve",
              layout: "moodboard",
              items: [
                {
                  title: "School supplies",
                  body: "Kits for classrooms — bags, books, pens, uniforms when needed.",
                },
                {
                  title: "SST & talibés",
                  body: "Food, showers, and steady care for talibés and SST with respect.",
                },
                {
                  title: "Food & shower",
                  body: "Meals and clean water / shower days so dignity comes first.",
                },
                {
                  title: "Medical & clinics",
                  body: "Medical help and monthly clinic visits — not one emergency only.",
                },
                {
                  title: "Monthly groceries",
                  body: "Grocery supplies monthly for families and students we walk with.",
                },
                {
                  title: "Orphans",
                  body: "Ongoing support for orphans — school, food, health, belonging.",
                },
              ],
            },
          },
          footerSection("service"),
        ],
      },
      {
        slug: "impact",
        title: "Impact",
        sections: [
          navSection("impact"),
          {
            id: "mayjor-impact-hero",
            type: "hero",
            props: {
              heading: "Helping youth — honestly",
              subheading:
                "We track school kits, meals, showers, clinic days, groceries, orphan care, and youth jobs. We only publish what we can stand behind.",
              buttonLabel: "Support the work",
              buttonHref: "/give",
              align: "left",
              background: MAYJOR_CREAM,
            },
          },
          {
            id: "mayjor-impact-body",
            type: "text",
            props: {
              heading: "Honest impact",
              body:
                "This page will hold real stories, photos (with consent), and counts: school supply packs given, SST/talibé care days, showers and meals, clinic visits, monthly grocery runs, orphans supported, and youth placed into jobs or training. Until then, we will not invent statistics.",
            },
          },
          {
            id: "mayjor-impact-goals",
            type: "features",
            props: {
              heading: "What we measure",
              items: [
                {
                  title: "School kits",
                  body: "Supplies delivered to students who need them.",
                },
                {
                  title: "Care days",
                  body: "Food, shower, and SST/talibé support sessions.",
                },
                {
                  title: "Health",
                  body: "Clinic visits and medical help each month.",
                },
                {
                  title: "Youth work",
                  body: "Job and training placements we helped open.",
                },
              ],
            },
          },
          {
            id: "mayjor-impact-quotes",
            type: "testimonials",
            props: {
              heading: "Voices from community",
              items: [
                {
                  quote:
                    "Replace with a real story from a student, talibé caregiver, or youth who found work — with permission.",
                  name: "Community member",
                },
                {
                  quote: "School supplies and groceries helped me stay in class.",
                  name: "Student (sample — swap for real)",
                },
              ],
            },
          },
          footerSection("impact"),
        ],
      },
      {
        slug: "give",
        title: "Give",
        sections: [
          navSection("give"),
          {
            id: "mayjor-give-hero",
            type: "hero",
            props: {
              heading: "Give toward the Mayjor Good",
              subheading:
                "Fund school supplies, SST & talibés care, food and showers, medical and clinic days, monthly groceries, orphan care, and youth jobs. No fake “paid” buttons.",
              buttonLabel: "Contact to give",
              buttonHref: "/contact",
              align: "left",
              background: MAYJOR_CREAM,
            },
          },
          {
            id: "mayjor-give-body",
            type: "text",
            props: {
              heading: "How giving works today",
              body:
                "Reach us on WhatsApp or email to give or partner. When donation adapters (mobile money, card, bank) are connected on Kebu, this page will link to them with clear receipts. Until then, we take gifts the honest way — direct conversation.",
            },
          },
          {
            id: "mayjor-give-features",
            type: "features",
            props: {
              heading: "Your gift can support",
              items: [
                {
                  title: "School supplies",
                  body: "Kits so youth can learn with what they need.",
                },
                {
                  title: "Care & health",
                  body: "Food, showers, medical help, and monthly clinic visits.",
                },
                {
                  title: "Groceries",
                  body: "Monthly grocery supplies for students and families.",
                },
                {
                  title: "Youth jobs",
                  body: "Training and pathways into real work.",
                },
              ],
            },
          },
          {
            id: "mayjor-give-whatsapp",
            type: "whatsapp",
            props: {
              label: "Message about giving",
              phone: "+221770000000",
              message:
                "Hello For The Mayjor Good — I want to give toward school supplies / talibés care / groceries / clinic / youth jobs.",
            },
          },
          footerSection("give"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          navSection("contact"),
          {
            id: "mayjor-contact-hero",
            type: "hero",
            props: {
              heading: "Contact",
              subheading:
                "School supply drives, SST & talibés care, clinic days, groceries, orphan support, youth jobs, partnerships, and prayer — write clearly.",
              buttonLabel: "WhatsApp",
              buttonHref: "#whatsapp",
              align: "left",
              background: MAYJOR_CREAM,
            },
          },
          {
            id: "mayjor-contact",
            type: "contact",
            props: {
              heading: "Reach the foundation",
              email: "hello@forthemayjorgood.org",
              phone: "+221 77 000 00 00",
              address: "Helping youth · Africa & diaspora",
            },
          },
          {
            id: "mayjor-contact-whatsapp",
            type: "whatsapp",
            props: {
              label: "Chat on WhatsApp",
              phone: "+221770000000",
              message: "Hello For The Mayjor Good —",
            },
          },
          {
            id: "mayjor-contact-newsletter",
            type: "newsletter",
            props: {
              heading: "Stay close to the work",
              subheading: "Supply drives, care days, and youth job updates — respectful, occasional emails.",
              buttonLabel: "Subscribe",
              successMessage: "Thank you — you’re on the list.",
            },
          },
          footerSection("contact"),
        ],
      },
    ],
  };
}
