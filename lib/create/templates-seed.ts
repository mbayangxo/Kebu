import type { WebsiteDefinition } from "./website-schema";
import { defaultMaylecorHomeProps, defaultMaylecorMusicProps } from "./maylecor-defaults";
import { defaultMaylecorKsendrProps } from "./maylecor-ksendr-defaults";
import { defaultLegallyBlondeHeroProps } from "./legally-blonde-defaults";
import { maylecorMotionSitePages } from "./maylecor-site-pages";
import { kdirectionWixSitePages } from "./kdirection-site-pages";
import { buildCompleteSite, templateDefaultTheme } from "./template-builders";

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
    description: "Lookbook-style fashion brand site",
    definition: simpleSite(
      "Fashion Atelier",
      "Crafted for the modern African wardrobe",
      "Ready-to-wear and custom pieces with local textiles.",
      "Why us",
      [
        { title: "Local textiles", body: "Sourcing from regional weavers and makers." },
        { title: "Made to measure", body: "Fits that respect your style and climate." },
        { title: "Seasonal drops", body: "Limited collections, not endless inventory." },
      ]
    ),
  },
  {
    slug: "beauty-studio",
    name: "Beauty Studio",
    category: "beauty",
    description: "Beauty and wellness studio",
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
    description: "Restaurant / café landing page",
    definition: simpleSite(
      "Restaurant Table",
      "Flavours from our kitchen to your table",
      "Seasonal menus, warm hospitality, and dishes worth sharing.",
      "On the menu",
      [
        { title: "Daily specials", body: "Market-fresh plates that change with the season." },
        { title: "Catering", body: "Events and offices — ask via WhatsApp." },
        { title: "Private dining", body: "Intimate spaces for celebrations." },
      ]
    ),
  },
  {
    slug: "portfolio-pro",
    name: "Professional Portfolio",
    category: "portfolio",
    description: "Clean professional portfolio",
    definition: simpleSite(
      "Portfolio",
      "Work that speaks clearly",
      "Selected projects, skills, and a simple way to reach me.",
      "Focus",
      [
        { title: "Selected work", body: "Case studies with outcomes, not buzzwords." },
        { title: "Skills", body: "Tools and methods I use every week." },
        { title: "Availability", body: "Open for collaborations and contracts." },
      ]
    ),
  },
  {
    slug: "student-portfolio",
    name: "Student Portfolio",
    category: "student portfolio",
    description: "Student / early-career portfolio",
    definition: simpleSite(
      "Student Portfolio",
      "Learning in public",
      "Projects, internships, and the skills I’m building.",
      "Highlights",
      [
        { title: "Projects", body: "School and personal builds with clear goals." },
        { title: "Internship", body: "What I contributed and what I learned." },
        { title: "Next", body: "Roles and mentorship I’m looking for." },
      ]
    ),
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
    name: "Musician — Streaming hero",
    category: "music",
    description: "Singer site: big hero, listen links, shows, fan contact (Wix-style artist page A)",
    definition: {
      schemaVersion: "website-v1",
      title: "Artist Name",
      theme: baseTheme("#0a0a0a", "#00C851"),
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
                  { label: "Music", href: "#music" },
                  { label: "Shows", href: "#shows" },
                  { label: "Contact", href: "#contact" },
                ],
              },
            },
            {
              id: "hero-1",
              type: "hero",
              props: {
                heading: "Artist Name",
                subheading: "New single out now — stream on Spotify, Apple Music, and YouTube.",
                buttonLabel: "Listen now",
                buttonHref: "#music",
                align: "center",
                background: "#0a0a0a",
              },
            },
            {
              id: "about-1",
              type: "text",
              props: {
                heading: "About",
                body: "Write a short story — where you're from, your sound, and what you're building next. Keep it real and mobile-friendly.",
              },
            },
            {
              id: "feat-1",
              type: "features",
              props: {
                heading: "Music & links",
                items: [
                  { title: "Latest release", body: "Link your newest single or album." },
                  { title: "Stream everywhere", body: "Spotify · Apple Music · YouTube · Boomplay." },
                  { title: "Music videos", body: "Embed or link your official video." },
                ],
              },
            },
            {
              id: "shows-1",
              type: "features",
              props: {
                heading: "Shows",
                items: [
                  { title: "Next date", body: "City · Venue · Date — link tickets." },
                  { title: "More dates", body: "Add every show you want fans to see." },
                  { title: "Booking", body: "WhatsApp or email for private events." },
                ],
              },
            },
            {
              id: "quotes-1",
              type: "testimonials",
              props: {
                heading: "Press & fans",
                items: [
                  { quote: "A voice that feels both local and global.", name: "Press or fan quote" },
                  { quote: "Add real quotes as you grow.", name: "Another quote" },
                ],
              },
            },
            {
              id: "contact-1",
              type: "contact",
              props: {
                heading: "Contact",
                email: "booking@example.com",
                phone: "",
                address: "",
              },
            },
            {
              id: "wa-1",
              type: "whatsapp",
              props: {
                label: "Book on WhatsApp",
                phone: "+221770000000",
                message: "Hi, I'd like to book Artist Name.",
              },
            },
            {
              id: "footer-1",
              type: "footer",
              props: { text: "© Artist Name", links: [] },
            },
          ],
        },
      ],
    },
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
    name: "May Lecor — ksendr motion layout (owner portfolio)",
    category: "music",
    description:
      "Exact copy of ksendrdesign.ru/legallyblonderu (cutouts, Steelfish, background, scroll) — swap May photos in the editor.",
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
    name: "Musician / artist",
    category: "music",
    description: "Bold artist site — swap your name, photos, and streaming links in the editor",
    definition: {
      schemaVersion: "website-v1",
      title: "Your Artist Name",
      theme: darkTheme("#E8D5A3"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "artist-home-1",
              type: "maylecor-home",
              props: {
                ...defaultMaylecorHomeProps("YOUR NAME"),
                portraitMain: "",
                collageTop: "",
                collageMiddle: "",
                logoBanner: "",
                bottomLeft: "",
                bottomRight: "",
                logoSmall: "",
                backgroundImage: "",
                ctaLabel: "LISTEN NOW",
                socialLinks: [
                  { label: "Spotify", iconUrl: "", href: "#" },
                  { label: "Instagram", iconUrl: "", href: "#" },
                  { label: "YouTube", iconUrl: "", href: "#" },
                ],
              },
            },
          ],
        },
        {
          slug: "music",
          title: "Music",
          sections: [
            {
              id: "artist-music-1",
              type: "maylecor-music",
              props: {
                ...defaultMaylecorMusicProps("YOUR NAME"),
                albumArt: "",
              },
            },
          ],
        },
      ],
    },
  },
  {
    slug: "showcase-legally-blonde",
    name: "Legally Blonde — animated cutout showcase",
    category: "film",
    description:
      "Flowing cutout layers from ksendrdesign.ru/legallyblonderu — swap photo URLs in the editor",
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
    name: "Film & video studio",
    category: "film",
    description: "Production company — showreel, services, crew, and client contact",
    definition: {
      schemaVersion: "website-v1",
      title: "Film Studio",
      theme: baseTheme("#1a1a2e", "#E94560"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "nav-1",
              type: "navigation",
              props: {
                brand: "Film Studio",
                links: [
                  { label: "Work", href: "#work" },
                  { label: "Services", href: "#services" },
                  { label: "Contact", href: "#contact" },
                ],
              },
            },
            {
              id: "hero-1",
              type: "hero",
              props: {
                heading: "Stories worth filming",
                subheading: "Music videos, documentaries, commercials, and branded content across Africa.",
                buttonLabel: "View our work",
                buttonHref: "#work",
                align: "center",
                background: "#1a1a2e",
              },
            },
            {
              id: "work-1",
              type: "gallery",
              props: {
                items: [
                  { src: "", alt: "Showreel still 1" },
                  { src: "", alt: "Showreel still 2" },
                  { src: "", alt: "Showreel still 3" },
                ],
              },
            },
            {
              id: "services-1",
              type: "features",
              props: {
                heading: "Services",
                items: [
                  { title: "Music videos", body: "Concept to final cut for artists and labels." },
                  { title: "Commercials", body: "Brand films that work on TV and social." },
                  { title: "Documentary", body: "Real stories with cinematic quality." },
                ],
              },
            },
            {
              id: "contact-1",
              type: "contact",
              props: { heading: "Start a project", email: "hello@filmstudio.com", phone: "", address: "" },
            },
            {
              id: "footer-1",
              type: "footer",
              props: { text: "© Film Studio", links: [] },
            },
          ],
        },
      ],
    },
  },
  {
    slug: "business-company",
    name: "Business — company site",
    category: "business",
    description: "General company landing — services, team story, and lead contact",
    definition: simpleSite(
      "Your Company",
      "Built for growth in African markets",
      "Clear services, trusted team, and a simple way to reach you.",
      "What we do",
      [
        { title: "Core services", body: "What you deliver and who you serve." },
        { title: "Why us", body: "Proof points — experience, clients, results." },
        { title: "Get started", body: "Book a call or send a brief via WhatsApp." },
      ],
    ),
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
    name: "Shopping store",
    category: "store",
    description: "Product storefront layout — catalog, categories, WhatsApp orders (checkout slice later)",
    definition: {
      schemaVersion: "website-v1",
      title: "My Store",
      theme: baseTheme("#0F0D33", "#FF6B35"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "nav-1",
              type: "navigation",
              props: {
                brand: "My Store",
                links: [
                  { label: "Products", href: "#products" },
                  { label: "About", href: "#about" },
                  { label: "Contact", href: "#contact" },
                ],
              },
            },
            {
              id: "hero-1",
              type: "hero",
              props: {
                heading: "Shop local. Ship fast.",
                subheading: "Browse products, order on WhatsApp, pay with mobile money.",
                buttonLabel: "Browse products",
                buttonHref: "#products",
                align: "center",
              },
            },
            {
              id: "products-1",
              type: "features",
              props: {
                heading: "Featured products",
                items: [
                  { title: "Product one", body: "Short description · price in CFA or USD." },
                  { title: "Product two", body: "Short description · price in CFA or USD." },
                  { title: "Product three", body: "Short description · price in CFA or USD." },
                ],
              },
            },
            {
              id: "gallery-1",
              type: "gallery",
              props: {
                items: [
                  { src: "", alt: "Product photo 1" },
                  { src: "", alt: "Product photo 2" },
                  { src: "", alt: "Product photo 3" },
                ],
              },
            },
            {
              id: "about-1",
              type: "text",
              props: {
                heading: "About the shop",
                body: "Delivery areas, payment methods (JOKO, Wave, Orange Money), and return policy.",
              },
            },
            {
              id: "wa-1",
              type: "whatsapp",
              props: {
                label: "Order on WhatsApp",
                phone: "+221770000000",
                message: "Hi, I want to place an order.",
              },
            },
            {
              id: "contact-1",
              type: "contact",
              props: { heading: "Contact", email: "shop@example.com", phone: "", address: "" },
            },
            {
              id: "footer-1",
              type: "footer",
              props: { text: "© My Store", links: [] },
            },
          ],
        },
      ],
    },
  },
  {
    slug: "app-launch",
    name: "App launch page",
    category: "app",
    description: "Mobile or web app — features, screenshots, download links, waitlist",
    definition: {
      schemaVersion: "website-v1",
      title: "My App",
      theme: baseTheme("#6366F1", "#22D3EE"),
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [
            {
              id: "nav-1",
              type: "navigation",
              props: {
                brand: "My App",
                links: [
                  { label: "Features", href: "#features" },
                  { label: "Screens", href: "#screens" },
                  { label: "Download", href: "#download" },
                ],
              },
            },
            {
              id: "hero-1",
              type: "hero",
              props: {
                heading: "The app that solves one real problem",
                subheading: "Built for African users — fast on mobile, works on low bandwidth.",
                buttonLabel: "Get the app",
                buttonHref: "#download",
                align: "center",
                background: "#6366F1",
              },
            },
            {
              id: "features-1",
              type: "features",
              props: {
                heading: "Why people use it",
                items: [
                  { title: "Simple", body: "One clear job done well." },
                  { title: "Affordable", body: "Free tier or low monthly cost." },
                  { title: "Secure", body: "Your data stays yours." },
                ],
              },
            },
            {
              id: "screens-1",
              type: "gallery",
              props: {
                items: [
                  { src: "", alt: "App screen 1" },
                  { src: "", alt: "App screen 2" },
                  { src: "", alt: "App screen 3" },
                ],
              },
            },
            {
              id: "download-1",
              type: "features",
              props: {
                heading: "Download",
                items: [
                  { title: "App Store", body: "Link your iOS app when ready." },
                  { title: "Google Play", body: "Link your Android app when ready." },
                  { title: "Web app", body: "Use in the browser — no install needed." },
                ],
              },
            },
            {
              id: "faq-1",
              type: "faq",
              props: {
                heading: "FAQ",
                items: [
                  { question: "Is it free?", answer: "Explain your pricing plainly." },
                  { question: "Which countries?", answer: "List where the app works today." },
                ],
              },
            },
            {
              id: "footer-1",
              type: "footer",
              props: { text: "© My App", links: [] },
            },
          ],
        },
      ],
    },
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
    description: "Boutique hotel / guesthouse",
    definition: simpleSite(
      "Hotel Stay",
      "Rest well. Explore freely.",
      "Rooms, hospitality, and local experiences.",
      "Stay with us",
      [
        { title: "Rooms", body: "Clean, calm spaces for every traveller." },
        { title: "Breakfast", body: "Local flavours to start the day." },
        { title: "Concierge", body: "Tips for the neighbourhood and beyond." },
      ]
    ),
  },
  {
    slug: "agriculture-farm",
    name: "Agriculture Farm",
    category: "agriculture",
    description: "Farm / agribusiness",
    definition: simpleSite(
      "Agriculture Farm",
      "From our fields to your market",
      "Fresh produce, reliable supply, and transparent farming.",
      "What we grow",
      [
        { title: "Crops", body: "Seasonal harvests with careful handling." },
        { title: "Supply", body: "Wholesale and retail partnerships." },
        { title: "Traceability", body: "Know where your food comes from." },
      ]
    ),
  },
  {
    slug: "construction-build",
    name: "Construction Build",
    category: "construction",
    description: "Construction / contractor",
    definition: simpleSite(
      "Construction Build",
      "Built to last",
      "Residential and commercial projects delivered with care.",
      "Capabilities",
      [
        { title: "Design-build", body: "From plan to handover." },
        { title: "Renovation", body: "Upgrades that respect structure and budget." },
        { title: "Safety", body: "Site standards you can trust." },
      ]
    ),
  },
  {
    slug: "ngo-impact",
    name: "NGO Impact",
    category: "ngo",
    description: "Nonprofit / NGO",
    definition: simpleSite(
      "NGO Impact",
      "Community first",
      "Programs, transparency, and ways to get involved.",
      "Our work",
      [
        { title: "Programs", body: "Education, health, and livelihood initiatives." },
        { title: "Impact", body: "Clear metrics — not empty claims." },
        { title: "Partner", body: "Volunteer, donate, or collaborate." },
      ]
    ),
  },
  {
    slug: "professional-services",
    name: "Professional Services",
    category: "professional services",
    description: "Consulting / professional firm",
    definition: simpleSite(
      "Professional Services",
      "Clarity for complex decisions",
      "Advisory for growing African businesses.",
      "How we help",
      [
        { title: "Strategy", body: "Practical plans tied to local markets." },
        { title: "Operations", body: "Processes that scale without chaos." },
        { title: "Compliance", body: "Guidance that respects your context." },
      ]
    ),
  },
  {
    slug: "tech-startup",
    name: "Technology Startup",
    category: "technology startup",
    description: "Tech product landing page",
    definition: simpleSite(
      "Technology Startup",
      "Infrastructure for African builders",
      "Software that solves real operational problems.",
      "Product",
      [
        { title: "Core product", body: "One clear job — done reliably." },
        { title: "Security", body: "Ownership and privacy by default." },
        { title: "Roadmap", body: "Shipped in public with customer feedback." },
      ]
    ),
  },
  {
    slug: "online-store-preview",
    name: "Online Store Preview",
    category: "online store preview only",
    description: "Storefront preview layout only — not commerce checkout",
    definition: simpleSite(
      "Online Store Preview",
      "Your products, clearly presented",
      "Preview layout for a future store — checkout is a later slice.",
      "Preview",
      [
        { title: "Featured products", body: "Placeholders for catalog items." },
        { title: "Collections", body: "Group products by theme." },
        { title: "Next", body: "Connect real commerce in the store slice." },
      ]
    ),
  },
  {
    slug: "agency-creative",
    name: "Creative agency",
    category: "agency",
    description: "Full agency site — services, case studies, team story, and client contact",
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
    name: "K-Direction (owner portfolio — Wix layout)",
    category: "agency",
    description:
      "Exact Wix home from kdirectionartistry.wixsite.com/k-direction — Oswald wordmark, soft gradient, yellow nav, editable collage photos.",
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
    slug: "production-company",
    name: "Production company",
    category: "production",
    description: "Events, commercials, and media production — full services page with portfolio",
    definition: buildCompleteSite({
      title: "Production Co",
      theme: templateDefaultTheme("#1a1a2e", "#E94560"),
      navLinks: [
        { label: "About", href: "#about" },
        { label: "Services", href: "#services" },
        { label: "Portfolio", href: "#gallery" },
        { label: "Contact", href: "#contact" },
      ],
      hero: {
        heading: "Production that delivers on time",
        subheading: "Corporate events, TV commercials, music videos, and branded content — end to end.",
        buttonLabel: "Request a quote",
        buttonHref: "#contact",
        background: "#1a1a2e",
      },
      about: {
        heading: "Who we are",
        body: "A full-service production house with crew, gear, and post-production. Replace this with your cities, credits, and specialties.",
      },
      features: {
        heading: "Production services",
        items: [
          { title: "Commercial & TV", body: "Scripts, shoot days, and broadcast-ready delivery." },
          { title: "Events & live", body: "Stage design, streaming, and show calling." },
          { title: "Post-production", body: "Edit, colour, sound, and subtitles." },
        ],
      },
      gallery: {
        items: [
          {
            src: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80",
            alt: "Film production set",
          },
          {
            src: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80",
            alt: "Camera crew",
          },
          {
            src: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
            alt: "Live event production",
          },
        ],
      },
      testimonials: {
        heading: "Clients",
        items: [
          { quote: "Professional crew and clean deliverables every time.", name: "Brand manager" },
          { quote: "They handled our launch event from concept to broadcast.", name: "Event director" },
        ],
      },
      faq: {
        heading: "Production FAQ",
        items: [
          { question: "Minimum budget?", answer: "Share your brief — we propose tiered packages." },
          { question: "Locations?", answer: "We shoot across West Africa; travel quoted separately." },
        ],
      },
      contact: {
        heading: "Start a production",
        email: "production@company.com",
        phone: "+221770000000",
        address: "Abidjan · Dakar · Lagos",
      },
      whatsapp: {
        label: "WhatsApp production desk",
        phone: "+221770000000",
        message: "Hello, I have a production brief to share.",
      },
    }),
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
    description: "Scent brand — collections, story, stockists, and WhatsApp orders",
    definition: buildCompleteSite({
      title: "Maison Scent",
      theme: templateDefaultTheme("#1a0a14", "#C9A962"),
      navLinks: [
        { label: "Story", href: "#about" },
        { label: "Collections", href: "#services" },
        { label: "Gallery", href: "#gallery" },
        { label: "Order", href: "#contact" },
      ],
      hero: {
        heading: "Scents inspired by Africa",
        subheading: "Eau de parfum crafted with oud, baobab flower, and coastal notes — limited batches.",
        buttonLabel: "Shop collection",
        buttonHref: "#services",
        background: "#1a0a14",
      },
      about: {
        heading: "Our story",
        body: "Describe your nose, ingredients, and where you make each bottle. Replace gallery photos with your product shots.",
      },
      features: {
        heading: "Collections",
        items: [
          { title: "Signature — 50ml", body: "Day to night. Notes: citrus, amber, musk." },
          { title: "Limited — 30ml", body: "Seasonal drop. Swap names and notes in editor." },
          { title: "Gift sets", body: "Discovery kit + card — perfect for events." },
        ],
      },
      gallery: {
        items: [
          {
            src: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80",
            alt: "Perfume bottle",
          },
          {
            src: "https://images.unsplash.com/photo-1592945403244-b3fbafd72529?w=800&q=80",
            alt: "Fragrance collection",
          },
          {
            src: "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=800&q=80",
            alt: "Product flat lay",
          },
        ],
      },
      testimonials: {
        heading: "Reviews",
        items: [
          { quote: "Lasts all day — I get compliments every time.", name: "Customer, Dakar" },
          { quote: "Finally a luxury scent that feels African, not copied.", name: "Boutique owner" },
        ],
      },
      faq: {
        heading: "Orders & shipping",
        items: [
          { question: "How to order?", answer: "WhatsApp us your size and scent — we confirm stock and delivery." },
          { question: "International?", answer: "Edit this answer for your shipping countries." },
        ],
      },
      contact: {
        heading: "Stockists & orders",
        email: "orders@maisonscent.com",
        phone: "+221770000000",
        address: "Available at select boutiques — list yours here",
      },
      whatsapp: {
        label: "Order on WhatsApp",
        phone: "+221770000000",
        message: "Hi, I want to order from Maison Scent.",
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
