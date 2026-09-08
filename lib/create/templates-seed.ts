import type { WebsiteDefinition } from "./website-schema";
import { defaultMaylecorHomeProps, defaultMaylecorMusicProps } from "./maylecor-defaults";
import { defaultMaylecorKsendrProps } from "./maylecor-ksendr-defaults";
import { defaultLegallyBlondeHeroProps } from "./legally-blonde-defaults";
import { maylecorMotionSitePages } from "./maylecor-site-pages";
import { kdirectionWixSitePages } from "./kdirection-site-pages";
import { buildCompleteSite, templateDefaultTheme } from "./template-builders";
import { dklnsWebsiteDefinition } from "./dklns-site";
import { ndaoanWebsiteDefinition } from "./ndaoan-site";
import { rectWebsiteDefinition } from "./rect-site";
import { mayjorGoodWebsiteDefinition } from "./mayjor-good-site";
import { fashionAtelierWorldDefinition } from "./design-worlds/fashion-atelier-world";
import { layersBeautyWorldDefinition } from "./design-worlds/layers-beauty-world";
import { carmineCreativeWorldDefinition } from "./design-worlds/carmine-creative-world";
import { perfumeMaisonWorldDefinition } from "./design-worlds/perfume-maison-world";
import { restaurantTableWorldDefinition } from "./design-worlds/restaurant-table-world";
import { hotelStayWorldDefinition } from "./design-worlds/hotel-stay-world";
import { marcheBoutiqueWorldDefinition } from "./design-worlds/marche-boutique-world";
import { whatsappCatalogWorldDefinition } from "./design-worlds/whatsapp-catalog-world";
import { artistDarkStageWorldDefinition, streamingLaunchWorldDefinition } from "./design-worlds/music-worlds";
import { productionHouseWorldDefinition, filmStudioWorldDefinition } from "./design-worlds/production-worlds";
import { companySiteWorldDefinition, buildTradeWorldDefinition } from "./design-worlds/business-worlds";
import { appLaunchWorldDefinition, techStartupWorldDefinition } from "./design-worlds/tech-worlds";
import { proPortfolioWorldDefinition, studentPortfolioWorldDefinition } from "./design-worlds/portfolio-worlds";
import { ngoImpactWorldDefinition, farmAgriWorldDefinition } from "./design-worlds/impact-worlds";
import { professionalServicesWorldDefinition } from "./design-worlds/agency-professional-world";

/**
 * Template seeds render through SiteRenderer → `.kebu-site` responsive base.
 * New templates must work on phone/tablet/desktop (flex/%/clamp or ScaledArtboard).
 * Do not ship desktop-only fixed widths.
 */

export type TemplateSeed = {
  slug: string;
  name: string;
  category: string;
  description: string;
  definition: WebsiteDefinition;
  /**
   * public = anyone can pick in Create / demos.
   * owner_portfolio = seed used only to create your personal real sites (not a shared template).
   */
  visibility?: "public" | "owner_portfolio";
};

function baseTheme(primary = "#0F0D33", accent = "#00C851"): WebsiteDefinition["theme"] {
  return {
    primary,
    accent,
    background: "#FAFAF8",
    text: "#0F0D33",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "comfortable",
  };
}

function simpleSite(
  title: string,
  heroHeading: string,
  heroSub: string,
  featureTitle: string,
  features: { title: string; body: string }[]
): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title,
    theme: baseTheme(),
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "nav-1",
            type: "navigation",
            props: { brand: title, links: [{ label: "Home", href: "#" }, { label: "Contact", href: "#contact" }] },
          },
          {
            id: "hero-1",
            type: "hero",
            props: {
              heading: heroHeading,
              subheading: heroSub,
              buttonLabel: "Get in touch",
              buttonHref: "#contact",
              align: "center",
            },
          },
          {
            id: "feat-1",
            type: "features",
            props: { heading: featureTitle, items: features },
          },
          {
            id: "contact-1",
            type: "contact",
            props: { heading: "Contact", email: "", phone: "", address: "" },
          },
          {
            id: "wa-1",
            type: "whatsapp",
            props: { label: "Chat on WhatsApp", phone: "+221770000000", message: "Hello!" },
          },
          {
            id: "footer-1",
            type: "footer",
            props: { text: `© ${title}`, links: [] },
          },
        ],
      },
    ],
  };
}

function darkTheme(accent = "#E8D5A3"): WebsiteDefinition["theme"] {
  return {
    primary: "#0a0a0a",
    accent,
    background: "#111111",
    text: "#F5F5F0",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "comfortable",
  };
}

/** Structured DB templates — not screenshots. */
export const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    slug: "fashion-atelier",
    name: "Fashion Atelier",
    category: "fashion",
    description: "Editorial lookbook fashion brand — home, lookbook, and contact pages",
    definition: fashionAtelierWorldDefinition(),
  },
  {
    slug: "layers-beauty",
    name: "LAYERS Beauty",
    category: "beauty",
    description:
      "Organic skincare shop — home, shop, about, gallery, FAQ, journal, gifts, contact (not a generic spa page)",
    definition: layersBeautyWorldDefinition(),
  },
  {
    slug: "beauty-studio",
    name: "Beauty Studio",
    category: "beauty",
    description: "Beauty and wellness studio (legacy simple seed — prefer LAYERS Beauty)",
    definition: simpleSite(
      "Beauty Studio",
      "Glow that starts with care",
      "Skincare, hair, and beauty services tailored to you.",
      "Services",
      [
        { title: "Consultations", body: "Skin and hair assessments before treatment." },
        { title: "Clean products", body: "Formulas suited for local climates." },
        { title: "Bookings", body: "Simple WhatsApp booking for busy days." },
      ]
    ),
  },
  {
    slug: "restaurant-table",
    name: "Restaurant Table",
    category: "restaurant",
    description: "Restaurant / café — menu, about, reserve, FAQ (not a one-page flyer)",
    definition: restaurantTableWorldDefinition(),
  },
  {
    slug: "portfolio-pro",
    name: "Pro portfolio",
    category: "portfolio",
    description:
      "Freelancer portfolio — work, services, WhatsApp hire",
    definition: proPortfolioWorldDefinition(),
  },
  {
    slug: "student-portfolio",
    name: "Student portfolio",
    category: "portfolio",
    description:
      "Student portfolio — projects, skills, WhatsApp contact",
    definition: studentPortfolioWorldDefinition(),
  },
  {
    slug: "artist-gallery",
    name: "Artist Gallery",
    category: "artist",
    description: "Artist showcase",
    definition: simpleSite(
      "Artist Gallery",
      "Colour, story, and place",
      "Paintings, prints, and commissions rooted in African narratives.",
      "Studio",
      [
        { title: "Collections", body: "Series exploring memory, city, and land." },
        { title: "Commissions", body: "Custom pieces for homes and spaces." },
        { title: "Exhibitions", body: "Upcoming shows and past residencies." },
      ]
    ),
  },
  {
    slug: "musician-streaming",
    name: "Streaming launch",
    category: "music",
    description:
      "Listen-first launch for singles/EPs — platforms, tour, press, WhatsApp",
    definition: streamingLaunchWorldDefinition(),
  },
  {
    slug: "musician-press-kit",
    name: "Musician — Press kit (EPK)",
    category: "music",
    description: "Electronic press kit: bio, press, bookings, FAQ (Wix-style artist page B)",
    definition: {
      schemaVersion: "website-v1",
      title: "Artist EPK",
      theme: baseTheme("#0F0D33", "#F5A623"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "nav-1",
              type: "navigation",
              props: {
                brand: "Artist Name",
                links: [
                  { label: "Bio", href: "#bio" },
                  { label: "Press", href: "#press" },
                  { label: "Book", href: "#contact" },
                ],
              },
            },
            {
              id: "hero-1",
              type: "hero",
              props: {
                heading: "Electronic press kit",
                subheading: "Bio, photos, and booking details for media and promoters.",
                buttonLabel: "Download press pack",
                buttonHref: "#press",
                align: "left",
              },
            },
            {
              id: "bio-1",
              type: "text",
              props: {
                heading: "Biography",
                body: "Short bio (100 words) for playlists and blogs. Long bio (300 words) for festivals and press.",
              },
            },
            {
              id: "press-1",
              type: "features",
              props: {
                heading: "Press & assets",
                items: [
                  { title: "Press photos", body: "Link to high-res portraits and live shots." },
                  { title: "Logo & colours", body: "Brand assets for flyers and posters." },
                  { title: "Rider & tech", body: "Stage plot and hospitality — PDF link." },
                ],
              },
            },
            {
              id: "faq-1",
              type: "faq",
              props: {
                heading: "FAQ for bookers",
                items: [
                  {
                    question: "What genres do you perform?",
                    answer: "Describe your sound in plain words.",
                  },
                  {
                    question: "What do you need on stage?",
                    answer: "Backline, mics, monitors — keep it clear.",
                  },
                ],
              },
            },
            {
              id: "contact-1",
              type: "contact",
              props: {
                heading: "Management & bookings",
                email: "mgmt@example.com",
                phone: "+221000000000",
                address: "City, Country",
              },
            },
            {
              id: "footer-1",
              type: "footer",
              props: { text: "© Artist Name · Press inquiries welcome", links: [] },
            },
          ],
        },
      ],
    },
  },
  {
    slug: "music-label-roster",
    name: "Music label — roster",
    category: "music",
    description: "Small label site like K-Direction lite: roster, news, contact (builder template)",
    definition: {
      schemaVersion: "website-v1",
      title: "Your Label",
      theme: baseTheme("#0F0D33", "#00C851"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "nav-1",
              type: "navigation",
              props: {
                brand: "YOUR LABEL",
                links: [
                  { label: "Artists", href: "#artists" },
                  { label: "News", href: "#news" },
                  { label: "Contact", href: "#contact" },
                ],
              },
            },
            {
              id: "hero-1",
              type: "hero",
              props: {
                heading: "Your Label",
                subheading: "A home for artists building the next wave of African music.",
                buttonLabel: "Meet the roster",
                buttonHref: "#artists",
                align: "center",
              },
            },
            {
              id: "artists-1",
              type: "features",
              props: {
                heading: "Artists",
                items: [
                  { title: "Artist one", body: "Genre · city — link to their page." },
                  { title: "Artist two", body: "Genre · city — link to their page." },
                  { title: "Join us", body: "How to submit demos or collaborate." },
                ],
              },
            },
            {
              id: "news-1",
              type: "text",
              props: {
                heading: "News",
                body: "Releases, shows, and label updates — add your latest headlines here.",
              },
            },
            {
              id: "contact-1",
              type: "contact",
              props: {
                heading: "Contact",
                email: "mgmt@yourlabel.com",
                phone: "",
                address: "",
              },
            },
            {
              id: "footer-1",
              type: "footer",
              props: { text: "© Your Label", links: [] },
            },
          ],
        },
      ],
    },
  },
  {
    slug: "musician-maylecor-ksendr",
    name: "May Lecor",
    category: "music",
    description:
      "Owner portfolio — Russian cutout layout. Not offered as a shared user aesthetic.",
    visibility: "owner_portfolio",
    definition: {
      schemaVersion: "website-v1",
      title: "May Lecor",
      theme: {
        primary: "#E9006B",
        accent: "#E9006B",
        background: "#FFFFFF",
        text: "#111111",
        fontDisplay: "Steelfish",
        fontBody: "system-ui",
        spacing: "comfortable" as const,
      },
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "maylecor-ksendr-1",
              type: "legally-blonde-hero",
              props: defaultMaylecorKsendrProps("MAY LECOR"),
            },
          ],
        },
        ...maylecorMotionSitePages("MAY LECOR").filter((p) => p.slug !== "home"),
      ],
    },
  },
  {
    slug: "musician-kdirection-artist",
    name: "May Lecor (owner portfolio — not a public template)",
    category: "music",
    description:
      "Personal May Lecor artist site — created only on the owner account via portfolio seed, not offered as a shared demo.",
    visibility: "owner_portfolio",
    definition: {
      schemaVersion: "website-v1",
      title: "May Lecor",
      theme: darkTheme("#E8D5A3"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "maylecor-home-1",
              type: "maylecor-home",
              props: defaultMaylecorHomeProps("MAY LECOR"),
            },
          ],
        },
        {
          slug: "music",
          title: "Music",
          sections: [
            {
              id: "maylecor-music-1",
              type: "maylecor-music",
              props: defaultMaylecorMusicProps("MAY LECOR"),
            },
          ],
        },
      ],
    },
  },
  {
    slug: "musician-artist",
    name: "Artist dark stage",
    category: "music",
    description:
      "Senegal artist site — music, videos, shows, WhatsApp bookings (not May Lecor portfolio)",
    definition: artistDarkStageWorldDefinition(),
  },
  {
    slug: "showcase-legally-blonde",
    name: "Legally Blonde demo (same engine as May Lecor)",
    category: "film",
    description:
      "Internal demo of the cutout engine only. Prefer the May Lecor template for the full artist site.",
    visibility: "owner_portfolio",
    definition: {
      schemaVersion: "website-v1",
      title: "Legally Blonde",
      theme: {
        primary: "#FF1493",
        accent: "#FFD700",
        background: "#FFFFFF",
        text: "#111111",
        fontDisplay: "Georgia",
        fontBody: "system-ui",
        spacing: "comfortable" as const,
      },
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "legally-blonde-hero-1",
              type: "legally-blonde-hero",
              props: defaultLegallyBlondeHeroProps(),
            },
          ],
        },
      ],
    },
  },
  {
    slug: "film-studio",
    name: "Film studio",
    category: "film",
    description:
      "Showreel-led film studio — projects, hire crew, WhatsApp",
    definition: filmStudioWorldDefinition(),
  },
  {
    slug: "business-company",
    name: "Company site",
    category: "business",
    description:
      "Clear company site — services, about, team, WhatsApp contact",
    definition: companySiteWorldDefinition(),
  },
  {
    slug: "clothing-company",
    name: "Clothing company",
    category: "fashion",
    description: "Fashion brand / clothing line — collections, lookbook, wholesale & retail",
    definition: {
      schemaVersion: "website-v1",
      title: "Clothing Co",
      theme: baseTheme("#2C1810", "#D4A574"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "nav-1",
              type: "navigation",
              props: {
                brand: "Clothing Co",
                links: [
                  { label: "Collections", href: "#collections" },
                  { label: "About", href: "#about" },
                  { label: "Shop", href: "#shop" },
                ],
              },
            },
            {
              id: "hero-1",
              type: "hero",
              props: {
                heading: "Wear the story",
                subheading: "Contemporary African fashion — limited drops and made-to-order pieces.",
                buttonLabel: "See collections",
                buttonHref: "#collections",
                align: "center",
              },
            },
            {
              id: "gallery-1",
              type: "gallery",
              props: {
                items: [
                  { src: "", alt: "Collection look 1" },
                  { src: "", alt: "Collection look 2" },
                  { src: "", alt: "Collection look 3" },
                ],
              },
            },
            {
              id: "collections-1",
              type: "features",
              props: {
                heading: "Collections",
                items: [
                  { title: "New season", body: "Latest pieces — sizes, colours, and prices." },
                  { title: "Basics", body: "Everyday essentials that last." },
                  { title: "Wholesale", body: "Boutiques and retailers — request a line sheet." },
                ],
              },
            },
            {
              id: "about-1",
              type: "text",
              props: {
                heading: "About the brand",
                body: "Who makes it, where materials come from, and what you stand for.",
              },
            },
            {
              id: "wa-1",
              type: "whatsapp",
              props: {
                label: "Order on WhatsApp",
                phone: "+221770000000",
                message: "Hi, I want to order from Clothing Co.",
              },
            },
            {
              id: "footer-1",
              type: "footer",
              props: { text: "© Clothing Co", links: [] },
            },
          ],
        },
      ],
    },
  },
  {
    slug: "shopping-store",
    name: "Marché Boutique",
    category: "store",
    description:
      "Senegal neighborhood shop — multipage IA, XOF products, WhatsApp / Wave / Orange Money (not fake card checkout)",
    definition: marcheBoutiqueWorldDefinition(),
  },
  {
    slug: "app-launch",
    name: "App launch",
    category: "app",
    description:
      "App launch — features, screens, waitlist, WhatsApp support",
    definition: appLaunchWorldDefinition(),
  },
  {
    slug: "public-figure",
    name: "Public figure",
    category: "public figure",
    description: "Influencer, speaker, or personality — bio, appearances, causes, and contact",
    definition: {
      schemaVersion: "website-v1",
      title: "Public Figure",
      theme: baseTheme("#1B4332", "#95D5B2"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "nav-1",
              type: "navigation",
              props: {
                brand: "Your Name",
                links: [
                  { label: "About", href: "#about" },
                  { label: "Work", href: "#work" },
                  { label: "Contact", href: "#contact" },
                ],
              },
            },
            {
              id: "hero-1",
              type: "hero",
              props: {
                heading: "Your Name",
                subheading: "Speaker · creator · advocate — one line that says who you are.",
                buttonLabel: "Book me",
                buttonHref: "#contact",
                align: "left",
              },
            },
            {
              id: "about-1",
              type: "text",
              props: {
                heading: "About",
                body: "Your story, mission, and what audiences can expect when they work with you.",
              },
            },
            {
              id: "work-1",
              type: "features",
              props: {
                heading: "Appearances & work",
                items: [
                  { title: "Speaking", body: "Conferences, schools, and panels." },
                  { title: "Media", body: "Interviews, podcasts, and features." },
                  { title: "Partnerships", body: "Brands and causes you stand behind." },
                ],
              },
            },
            {
              id: "quotes-1",
              type: "testimonials",
              props: {
                heading: "What people say",
                items: [
                  { quote: "Add a real testimonial from an event or partner.", name: "Organisation name" },
                ],
              },
            },
            {
              id: "contact-1",
              type: "contact",
              props: {
                heading: "Bookings & media",
                email: "hello@example.com",
                phone: "",
                address: "",
              },
            },
            {
              id: "wa-1",
              type: "whatsapp",
              props: {
                label: "Message on WhatsApp",
                phone: "+221770000000",
                message: "Hi, I'd like to connect.",
              },
            },
            {
              id: "footer-1",
              type: "footer",
              props: { text: "© Your Name", links: [] },
            },
          ],
        },
      ],
    },
  },
  {
    slug: "event-night",
    name: "Event Night",
    category: "event",
    description: "Event / nightlife promo",
    definition: simpleSite(
      "Event Night",
      "One night. Unforgettable.",
      "Line-up, venue, and tickets — keep it simple and clear.",
      "Details",
      [
        { title: "Line-up", body: "Artists and hosts confirmed for the night." },
        { title: "Venue", body: "Location, doors, and dress code." },
        { title: "Tickets", body: "WhatsApp to reserve your spot." },
      ]
    ),
  },
  {
    slug: "hotel-stay",
    name: "Hotel Stay",
    category: "hotel",
    description: "Boutique hotel / guesthouse — rooms, amenities, book, FAQ, contact",
    definition: hotelStayWorldDefinition(),
  },
  {
    slug: "agriculture-farm",
    name: "Farm & agri",
    category: "impact",
    description:
      "Farm storefront — produce, story, WhatsApp / Wave orders",
    definition: farmAgriWorldDefinition(),
  },
  {
    slug: "construction-build",
    name: "Build & trade",
    category: "business",
    description:
      "Contractors and trade — projects, services, WhatsApp quotes",
    definition: buildTradeWorldDefinition(),
  },
  {
    slug: "ngo-impact",
    name: "NGO & impact",
    category: "impact",
    description:
      "NGO site — mission, programs, partner, WhatsApp",
    definition: ngoImpactWorldDefinition(),
  },
  {
    slug: "professional-services",
    name: "Professional services",
    category: "agency",
    description:
      "Consulting firm — services, approach, team, WhatsApp intake",
    definition: professionalServicesWorldDefinition(),
  },
  {
    slug: "tech-startup",
    name: "Tech startup",
    category: "technology startup",
    description:
      "Startup — problem → product → pricing → WhatsApp demo",
    definition: techStartupWorldDefinition(),
  },
  {
    slug: "online-store-preview",
    name: "WhatsApp Catalog",
    category: "store",
    description:
      "Senegal chat-commerce catalog — mobile-first photos + WhatsApp order path for informal sellers",
    definition: whatsappCatalogWorldDefinition(),
  },
  {
    slug: "carmine-creative",
    name: "Carmine Creative",
    category: "agency",
    description:
      "Bold creative agency — work, services, about, journal, contact (not a one-page hero stack)",
    definition: carmineCreativeWorldDefinition(),
  },
  {
    slug: "agency-creative",
    name: "Creative agency",
    category: "agency",
    description: "Legacy single-page agency seed — prefer Carmine Creative",
    definition: buildCompleteSite({
      title: "Creative Agency",
      theme: templateDefaultTheme("#0F0D33", "#7C3AED"),
      navLinks: [
        { label: "About", href: "#about" },
        { label: "Services", href: "#services" },
        { label: "Work", href: "#gallery" },
        { label: "Contact", href: "#contact" },
      ],
      hero: {
        heading: "We build brands that move Africa forward",
        subheading: "Strategy, design, and campaigns for startups, labels, and growing businesses.",
        buttonLabel: "Start a project",
        buttonHref: "#contact",
        background: "#0F0D33",
      },
      about: {
        heading: "About the agency",
        body: "We are a Dakar-based creative team helping African founders tell clearer stories — from visual identity to launch campaigns. Swap this text and add your real case study photos in the editor.",
      },
      features: {
        heading: "Services",
        items: [
          { title: "Brand identity", body: "Logo, colours, typography, and brand guidelines." },
          { title: "Web & social", body: "Sites, landing pages, and content that converts." },
          { title: "Campaigns", body: "Launch plans, ads, and influencer coordination." },
        ],
      },
      gallery: {
        items: [
          {
            src: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
            alt: "Agency workspace",
          },
          {
            src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
            alt: "Team collaboration",
          },
          {
            src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
            alt: "Client workshop",
          },
        ],
      },
      testimonials: {
        heading: "Client results",
        items: [
          { quote: "They turned our messy idea into a brand we are proud to pitch.", name: "Founder, fashion label" },
          { quote: "Clear process, fast delivery, and they understood our market.", name: "Marketing lead, fintech" },
        ],
      },
      faq: {
        heading: "FAQ",
        items: [
          { question: "How do we start?", answer: "Send a brief via WhatsApp or email — we reply within 2 business days." },
          { question: "Do you work remotely?", answer: "Yes — across Africa and diaspora clients." },
        ],
      },
      contact: {
        email: "hello@agency.com",
        phone: "+221770000000",
        address: "Dakar, Senegal",
      },
      whatsapp: {
        label: "Book a discovery call",
        phone: "+221770000000",
        message: "Hi, I want to discuss a project with Creative Agency.",
      },
    }),
  },
  {
    slug: "agency-kdirection",
    name: "K-Direction — Wix canvas label",
    category: "agency",
    description:
      "Owner portfolio — Oswald wordmark, soft gradient, yellow pill nav. Not a shared user aesthetic.",
    visibility: "owner_portfolio",
    definition: {
      schemaVersion: "website-v1",
      title: "K-Direction",
      theme: {
        primary: "#0A0A0A",
        accent: "#FFF86B",
        background: "#e8e0f0",
        text: "#0A0A0A",
        fontDisplay: "Oswald",
        fontBody: "Arial",
        spacing: "comfortable",
      },
      pages: kdirectionWixSitePages().map((p) => ({
        slug: p.slug,
        title: p.title,
        sections: p.sections.map((s, i) => ({
          id: `kd-${p.slug}-${i + 1}`,
          type: s.type as WebsiteDefinition["pages"][0]["sections"][0]["type"],
          props: s.props,
        })),
      })),
    },
  },
  {
    slug: "agency-dklns",
    name: "DkLNS — management & creative agency",
    category: "agency",
    description:
      "Owner portfolio — DkLNS lumen. Not a shared user aesthetic.",
    visibility: "owner_portfolio",
    definition: dklnsWebsiteDefinition(),
  },
  {
    slug: "production-ndaoan-house",
    name: "Ndaoan House — production & content studio",
    category: "production",
    description:
      "Owner portfolio — Ndaoan cinema. Not a shared user aesthetic.",
    visibility: "owner_portfolio",
    definition: ndaoanWebsiteDefinition(),
  },
  {
    slug: "entertainment-rect",
    name: "RECT — music streaming & entertainment tech",
    category: "music",
    description:
      "Owner portfolio — RECT signal (lime / black / orange). Music + label now; film, Watch, social as honest roadmap. Not a shared user aesthetic.",
    visibility: "owner_portfolio",
    definition: rectWebsiteDefinition(),
  },
  {
    slug: "foundation-mayjor-good",
    name: "For The Mayjor Good — foundation",
    category: "nonprofit",
    description:
      "Owner portfolio — For The Mayjor Good (art, opportunity, service). Not a shared user aesthetic.",
    visibility: "owner_portfolio",
    definition: mayjorGoodWebsiteDefinition(),
  },
  {
    slug: "production-company",
    name: "Production house",
    category: "production",
    description:
      "Dakar production house — work, services, clients, WhatsApp briefs",
    definition: productionHouseWorldDefinition(),
  },
  {
    slug: "hair-salon",
    name: "Hair salon & barber",
    category: "beauty",
    description: "Salon or barbershop — services, gallery, booking via WhatsApp",
    definition: buildCompleteSite({
      title: "Hair Studio",
      theme: templateDefaultTheme("#2C1810", "#D4A574"),
      navLinks: [
        { label: "About", href: "#about" },
        { label: "Services", href: "#services" },
        { label: "Gallery", href: "#gallery" },
        { label: "Book", href: "#contact" },
      ],
      hero: {
        heading: "Your hair, our craft",
        subheading: "Cuts, colour, braids, and treatments — walk-ins welcome, appointments preferred.",
        buttonLabel: "Book on WhatsApp",
        buttonHref: "#whatsapp",
      },
      about: {
        heading: "Welcome",
        body: "Tell clients about your stylists, hygiene standards, and what makes your salon different. Add your address and hours in Contact.",
      },
      features: {
        heading: "Services & prices",
        items: [
          { title: "Cut & style", body: "From 5,000 FCFA — add your menu in the editor." },
          { title: "Braids & locs", body: "Protective styles by appointment." },
          { title: "Colour & treatment", body: "Consultation included — patch test when needed." },
        ],
      },
      gallery: {
        items: [
          {
            src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
            alt: "Salon interior",
          },
          {
            src: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
            alt: "Hair styling",
          },
          {
            src: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&q=80",
            alt: "Barber chair",
          },
        ],
      },
      testimonials: {
        heading: "Client love",
        items: [
          { quote: "Best fade in the city — always on time.", name: "Regular client" },
          { quote: "They really listen to what you want.", name: "First visit" },
        ],
      },
      faq: {
        heading: "Salon FAQ",
        items: [
          { question: "Do I need an appointment?", answer: "Walk-ins OK for cuts; braids and colour by booking." },
          { question: "Payment methods?", answer: "Cash, mobile money, and cards — update for your salon." },
        ],
      },
      contact: {
        heading: "Visit us",
        email: "",
        phone: "+221770000000",
        address: "Your street, city — edit in editor",
      },
      whatsapp: {
        label: "Book appointment",
        phone: "+221770000000",
        message: "Hi, I want to book an appointment at Hair Studio.",
      },
    }),
  },
  {
    slug: "perfume-brand",
    name: "Perfume & fragrance",
    category: "fragrance",
    description:
      "Fragrance house — shop, story, stockists, FAQ, contact (not a one-page brochure)",
    definition: perfumeMaisonWorldDefinition(),
  },
  {
    slug: "scent-boutique",
    name: "Scent boutique",
    category: "fragrance",
    description: "Intimate fragrance boutique — soft cream layout, story, and WhatsApp orders (different from Perfume house)",
    definition: buildCompleteSite({
      title: "Atelier Brume",
      theme: templateDefaultTheme("#F7F2EC", "#8B5E6B"),
      navLinks: [
        { label: "Story", href: "#about" },
        { label: "Scents", href: "#services" },
        { label: "Visit", href: "#contact" },
      ],
      hero: {
        heading: "Walk in. Smell. Take home.",
        subheading: "A quiet boutique for discovery sets and signature oils — built for WhatsApp and walk-in sales.",
        buttonLabel: "See scents",
        buttonHref: "#services",
        background: "#F7F2EC",
      },
      about: {
        heading: "The boutique",
        body: "Tell guests where you are, your hours, and how you source notes. Keep photos light — Data Saver friendly.",
      },
      features: {
        heading: "On the shelf",
        items: [
          { title: "Discovery set", body: "5 samples — swap names in the editor." },
          { title: "House oil", body: "Your bestseller — price in Shop products." },
          { title: "Refill ritual", body: "Bring the bottle back for a refill discount." },
        ],
      },
      gallery: {
        items: [
          {
            src: "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=800&q=80",
            alt: "Boutique shelf",
          },
          {
            src: "https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=800&q=80",
            alt: "Fragrance bottles",
          },
        ],
      },
      contact: {
        heading: "Visit or order",
        email: "hello@atelierbrume.com",
        phone: "+221770000000",
        address: "Your street, your city",
      },
      whatsapp: {
        label: "Order on WhatsApp",
        phone: "+221770000000",
        message: "Hi, I want to order from Atelier Brume.",
      },
    }),
  },
];

/** Templates shown in Create picker, demos, and /api/templates. */
export function publicTemplateSeeds(): TemplateSeed[] {
  return TEMPLATE_SEEDS.filter((t) => t.visibility !== "owner_portfolio");
}

export function isPublicTemplateSlug(slug: string): boolean {
  const seed = TEMPLATE_SEEDS.find((t) => t.slug === slug);
  return Boolean(seed && seed.visibility !== "owner_portfolio");
}
