import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * MERIDIAN FILMS — editorial, typography-led indie studio (public aesthetic).
 * Archetype: a minimal, type-driven film-catalog site with a separate merch shop and an open
 * pitch-submission page — distinct from the existing Production & film pair (production-company's
 * commercial-house services pitch, film-studio's showreel-and-crew-hire angle). MERIDIAN's whole
 * reason for existing is treating the film slate itself as the homepage — festival selections as
 * a ticking marquee, a stark black/near-black canvas, high-contrast serif display type, and a
 * poster-strip visual language — instead of leading with services or a demo reel.
 * IA = Home · Films · Shop · Submissions · Press · About · FAQ.
 * All imagery is an empty slot (editable in Media) — no reference-site or stock URLs baked in.
 */

const IMG = {
  hero: "",
  filmOne: "",
  filmTwo: "",
  filmThree: "",
  filmFour: "",
  filmFive: "",
  poster: "",
  tee: "",
  notebook: "",
  tote: "",
  vinyl: "",
  box: "",
  studio: "",
  founder: "",
} as const;

const PHONE = "+2210700000000";

const NAV = [
  { label: "Films", href: "/films" },
  { label: "Shop", href: "/shop" },
  { label: "Submissions", href: "/submissions" },
  { label: "Press", href: "/press" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
] as const;

const FILMS = [
  {
    icon: "🎬",
    title: "A QUIET DISTANCE (2026) — Drama",
    body: "Two estranged sisters drive their late mother's car from Dakar to Linguère, forced to finally say what a decade of phone calls avoided.",
  },
  {
    icon: "🎬",
    title: "HARMATTAN (2025) — Drama",
    body: "A schoolteacher in a wind-scoured Sahel town rebuilds a collapsed classroom roof with whatever the harvest season can spare.",
  },
  {
    icon: "🎬",
    title: "THE LONG EXPOSURE (2026) — Thriller",
    body: "A photojournalist's contact sheet from a border town becomes evidence nobody official wants to see developed.",
  },
  {
    icon: "🎬",
    title: "SALT & STATIC (2025) — Comedy-drama",
    body: "A failing radio station in a coastal fishing town gets one last shot at relevance when its transmitter starts picking up a rival country's frequency.",
  },
  {
    icon: "🎬",
    title: "NIGHTSHADE AVENUE (2026) — Horror · Upcoming",
    body: "A night-shift pharmacist starts filling prescriptions that were never written by any doctor in the building.",
  },
] as const;

const MERCH = [
  {
    name: "Premiere Poster — A Quiet Distance",
    description: "Screen-printed A2 poster from the film's theatrical release, numbered edition.",
    priceLabel: "12,000 FCFA",
    imageUrl: IMG.poster,
    whatsappMessage: "Hi MERIDIAN FILMS — I'd like to order the A Quiet Distance poster.",
    attributes: [{ icon: "🖨️", label: "Numbered edition" }],
    filterTags: ["posters"],
  },
  {
    name: "Screening Tee",
    description: "Heavyweight cotton tee with the current season's film slate printed on the back.",
    priceLabel: "15,000 FCFA",
    imageUrl: IMG.tee,
    whatsappMessage: "Hi MERIDIAN FILMS — I'd like to order the Screening Tee.",
    filterTags: ["apparel"],
  },
  {
    name: "Director's Notebook",
    description: "The same dot-grid notebook our writers pitch from — 160 pages, hardback.",
    priceLabel: "6,000 FCFA",
    imageUrl: IMG.notebook,
    whatsappMessage: "Hi MERIDIAN FILMS — I'd like to order the Director's Notebook.",
    filterTags: ["stationery"],
  },
  {
    name: "Festival Tote",
    description: "Canvas tote stamped with the festival laurels our films have screened at this year.",
    priceLabel: "8,000 FCFA",
    imageUrl: IMG.tote,
    whatsappMessage: "Hi MERIDIAN FILMS — I'd like to order the Festival Tote.",
    filterTags: ["accessories"],
  },
  {
    name: "Score Vinyl — A Quiet Distance OST",
    description: "Original score on 180g vinyl, gatefold sleeve with liner notes from the composer.",
    priceLabel: "22,000 FCFA",
    imageUrl: IMG.vinyl,
    whatsappMessage: "Hi MERIDIAN FILMS — I'd like to order the A Quiet Distance vinyl.",
    badge: "LIMITED",
    filterTags: ["music"],
  },
] as const;

function nav(id: string) {
  return { id, type: "navigation" as const, props: { brand: "MERIDIAN FILMS", links: [...NAV] } };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© MERIDIAN FILMS — independent cinema, produced across West Africa.",
      links: [
        { label: "Films", href: "/films" },
        { label: "Submissions", href: "/submissions" },
        { label: "FAQ", href: "/faq" },
      ],
    },
  };
}

export function meridianFilmsWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "MERIDIAN FILMS",
    theme: {
      primary: "#0A0A0A",
      accent: "#C9A227",
      background: "#F2EFE9",
      text: "#0A0A0A",
      surface: "#FFFFFF",
      link: "#8A6D1A",
      fontDisplay: "Space Grotesk",
      fontBody: "Inter",
      spacing: "airy",
      contentWidth: "wide",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "tight",
      radius: "sharp",
      buttonStyle: "outline",
      aestheticId: "meridian-films",
    },
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          nav("meridian-nav-home"),
          {
            id: "meridian-announce",
            type: "announcement-bar",
            props: {
              text: "A QUIET DISTANCE now playing — festival run continues through the season.",
              background: "#0A0A0A",
              color: "#F2EFE9",
            },
          },
          {
            id: "meridian-hero",
            type: "editorial-hero",
            props: {
              heading: "We make films that don't need\na trailer to explain themselves.",
              subheading: "MERIDIAN FILMS produces and distributes independent cinema across West Africa — five features in three years, four festival selections.",
              buttonLabel: "See the slate",
              buttonHref: "/films",
              imageUrl: IMG.hero,
              imageAlt: "Still frame from A Quiet Distance",
              overlayOpacity: 0.55,
              align: "left",
              heightVh: 85,
            },
          },
          {
            id: "meridian-marquee",
            type: "marquee",
            props: {
              items: [
                "FESPACO — Official Selection",
                "Durban International Film Festival",
                "Carthage Film Festival — Jury Prize",
                "Luxor African Film Festival",
              ],
              speed: 35,
              background: "#0A0A0A",
              color: "#C9A227",
              separator: "·",
            },
          },
          {
            id: "meridian-slate",
            type: "features",
            props: {
              heading: "Current slate",
              subheading: "Five films, one house style: quiet cameras, loud silences.",
              items: [...FILMS],
            },
          },
          {
            id: "meridian-what-we-make",
            type: "features",
            props: {
              heading: "What we make",
              items: [
                { icon: "🎞️", title: "Feature-length only", body: "We don't produce commercials or corporate video — every project on this site is a theatrical feature." },
                { icon: "🌍", title: "Produced where they're set", body: "Every film is shot on location in the country its story is set in, with a majority-local crew." },
                { icon: "🎙️", title: "Original scores, always", body: "No licensed soundtrack has ever appeared in a MERIDIAN release — every score is commissioned for the film." },
              ],
            },
          },
          {
            id: "meridian-trailer",
            type: "video",
            props: {
              heading: "Now playing",
              items: [
                { src: "", title: "A Quiet Distance — Official Trailer", caption: "In theaters and on the festival circuit now.", thumbnail: IMG.filmOne },
              ],
              layout: "featured",
              columns: 2,
            },
          },
          {
            id: "meridian-press-tease",
            type: "testimonials",
            props: {
              heading: "What critics are saying",
              topics: ["A Quiet Distance", "Harmattan"],
              items: [
                {
                  quote: "The rare road movie that trusts silence as much as dialogue.",
                  name: "Continental Film Review",
                  role: "A Quiet Distance",
                  skinType: "",
                  skinConcern: "",
                  reviewTopics: ["A Quiet Distance"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Harmattan finds an entire moral universe in one collapsed classroom roof.",
                  name: "Sahel Cinema Journal",
                  role: "Harmattan",
                  skinType: "",
                  skinConcern: "",
                  reviewTopics: ["Harmattan"],
                  verified: true,
                  rating: 5,
                },
              ],
            },
          },
          {
            id: "meridian-newsletter",
            type: "newsletter",
            props: {
              heading: "Get premiere dates first",
              subheading: "Screening announcements and festival dates, before they go public.",
              buttonLabel: "Sign up",
              successMessage: "You're in — we'll email you before we announce anywhere else.",
            },
          },
          {
            id: "meridian-popup",
            type: "email-popup",
            props: {
              enabled: true,
              mode: "email",
              heading: "First look at what's next",
              body: "Join the list for premiere dates and early trailer drops — nothing else.",
              buttonLabel: "Sign up",
              dismissLabel: "Not now",
              delaySeconds: 8,
              remindAfterDays: 21,
            },
          },
          {
            id: "meridian-wa-home",
            type: "whatsapp",
            props: {
              label: "Press & festival inquiries",
              phone: PHONE,
              message: "Hi MERIDIAN FILMS — I have a press or festival inquiry.",
            },
          },
          footer("meridian-footer-home"),
        ],
      },
      {
        slug: "films",
        title: "Films",
        sections: [
          nav("meridian-nav-films"),
          {
            id: "meridian-films-hero",
            type: "hero",
            props: {
              heading: "The full slate",
              subheading: "Five features, one house style — every synopsis below is the whole pitch, nothing withheld for a trailer.",
              buttonLabel: "Pitch us your own",
              buttonHref: "/submissions",
              align: "center",
              background: "#0A0A0A",
            },
          },
          {
            id: "meridian-films-list",
            type: "features",
            props: {
              heading: "Feature films",
              items: [...FILMS],
            },
          },
          {
            id: "meridian-films-screenings",
            type: "events",
            props: {
              heading: "Upcoming screenings",
              items: [
                { title: "A Quiet Distance — Festival Screening", date: "2026-11-14", location: "Ouagadougou, Burkina Faso", description: "Official selection, evening screening followed by a Q&A with the director." },
                { title: "Harmattan — Regional Premiere", date: "2026-12-02", location: "Dakar, Senegal", description: "One-night regional premiere ahead of wider distribution." },
                { title: "The Long Exposure — Work-in-Progress Screening", date: "2027-01-20", location: "Accra, Ghana", description: "Rough-cut screening for press and festival programmers." },
              ],
            },
          },
          footer("meridian-footer-films"),
        ],
      },
      {
        slug: "shop",
        title: "Shop",
        sections: [
          nav("meridian-nav-shop"),
          {
            id: "meridian-shop-hero",
            type: "hero",
            props: {
              heading: "Shop the slate",
              subheading: "Posters, apparel, and the score on vinyl — printed in small runs alongside each release.",
              buttonLabel: "See current films",
              buttonHref: "/films",
              align: "center",
            },
          },
          {
            id: "meridian-shop-products",
            type: "products",
            props: {
              heading: "All merchandise",
              layout: "grid",
              columns: 3,
              orderStyle: "sheet",
              orderCtaLabel: "Place order",
              filterLabel: "Filter by category",
              promoBanner: {
                text: "The Premiere Box → poster, tee, and notebook, bundled for one order",
                subtext: "Ships alongside our next regional premiere",
                background: "#C9A227",
                color: "#0A0A0A",
                insertAfterIndex: 2,
              },
              items: [
                ...MERCH,
                {
                  name: "The Premiere Box",
                  description: "Premiere Poster, Screening Tee, and Director's Notebook — one box, one order.",
                  priceLabel: "29,000 FCFA",
                  valuePriceLabel: "33,000 FCFA",
                  imageUrl: IMG.box,
                  whatsappMessage: "Hi MERIDIAN FILMS — I'd like to order The Premiere Box.",
                  badge: "SET",
                  attributes: [{ icon: "🎁", label: "12% cheaper than buying separately" }],
                  filterTags: ["posters", "apparel", "stationery"],
                },
              ],
            },
          },
          {
            id: "meridian-shop-trust",
            type: "trust-badges",
            props: {
              items: [
                { icon: "🔒", label: "Secure checkout", description: "Wave · Orange Money · card" },
                { icon: "📦", label: "Small-batch runs", description: "Printed alongside each release — limited restocks" },
                { icon: "🚚", label: "Regional delivery", description: "West Africa 2–5 days" },
              ],
              layout: "grid",
            },
          },
          footer("meridian-footer-shop"),
        ],
      },
      {
        slug: "submissions",
        title: "Submissions",
        sections: [
          nav("meridian-nav-submissions"),
          {
            id: "meridian-submissions-hero",
            type: "hero",
            props: {
              heading: "We read every pitch ourselves",
              subheading: "No coverage service, no form letter — a producer reads your logline and gets back to you either way.",
              buttonLabel: "See what we look for",
              buttonHref: "#guidelines",
              align: "left",
              background: "#0A0A0A",
            },
          },
          {
            id: "meridian-submissions-guidelines",
            type: "text",
            props: {
              heading: "What we're looking for",
              body: "Feature-length narrative fiction, budget-conscious, story rooted in a specific place rather than a generic setting. We don't produce commercials, music videos, or unscripted formats. If your logline needs a trailer to make sense, it's probably not for us — we lead with synopses, not sizzle reels.",
            },
          },
          {
            id: "meridian-submissions-form",
            type: "form",
            props: {
              heading: "Submit a pitch",
              subheading: "One-page logline and a link to any prior work — we'll follow up within three weeks either way.",
              buttonLabel: "Submit",
              successMessage: "Received — a MERIDIAN producer will follow up within three weeks.",
              fields: [
                { id: "name", label: "Your name", type: "text", required: true, placeholder: "", options: [] },
                { id: "email", label: "Email", type: "email", required: true, placeholder: "you@email.com", options: [] },
                { id: "title", label: "Working title", type: "text", required: true, placeholder: "", options: [] },
                { id: "logline", label: "Logline (one paragraph)", type: "textarea", required: true, placeholder: "What's the film, in three sentences?", options: [] },
                { id: "link", label: "Link to prior work (optional)", type: "text", required: false, placeholder: "https://…", options: [] },
              ],
            },
          },
          {
            id: "meridian-submissions-wa",
            type: "whatsapp",
            props: {
              label: "Ask before you submit",
              phone: PHONE,
              message: "Hi MERIDIAN FILMS — I have a question before submitting a pitch.",
            },
          },
          footer("meridian-footer-submissions"),
        ],
      },
      {
        slug: "press",
        title: "Press",
        sections: [
          nav("meridian-nav-press"),
          {
            id: "meridian-press-hero",
            type: "hero",
            props: {
              heading: "Press & festivals",
              subheading: "Reviews, festival selections, and press contact for interviews or screener requests.",
              buttonLabel: "Request a screener",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#0A0A0A",
            },
          },
          {
            id: "meridian-press-stats",
            type: "stats",
            props: {
              heading: "By the numbers",
              layout: "row",
              items: [
                { value: "5", label: "Features produced" },
                { value: "4", label: "Festival selections" },
                { value: "3", label: "Countries filmed in" },
                { value: "1", label: "Jury prize" },
              ],
            },
          },
          {
            id: "meridian-press-quotes",
            type: "testimonials",
            props: {
              heading: "In the press",
              topics: ["A Quiet Distance", "Harmattan", "Salt & Static"],
              items: [
                {
                  quote: "The rare road movie that trusts silence as much as dialogue.",
                  name: "Continental Film Review",
                  role: "A Quiet Distance",
                  skinType: "",
                  skinConcern: "",
                  reviewTopics: ["A Quiet Distance"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Harmattan finds an entire moral universe in one collapsed classroom roof.",
                  name: "Sahel Cinema Journal",
                  role: "Harmattan",
                  skinType: "",
                  skinConcern: "",
                  reviewTopics: ["Harmattan"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Proof that a small radio-station comedy can say more about a region's economy than most documentaries manage.",
                  name: "West African Screen",
                  role: "Salt & Static",
                  skinType: "",
                  skinConcern: "",
                  reviewTopics: ["Salt & Static"],
                  verified: true,
                  rating: 4,
                },
              ],
            },
          },
          footer("meridian-footer-press"),
        ],
      },
      {
        slug: "about",
        title: "About",
        sections: [
          nav("meridian-nav-about"),
          {
            id: "meridian-about-hero",
            type: "hero",
            props: {
              heading: "We started with a five-film promise",
              subheading: "MERIDIAN FILMS was founded to make five features on purpose, in five different countries, before ever opening a development slate beyond that.",
              buttonLabel: "See the slate",
              buttonHref: "/films",
              align: "left",
            },
          },
          {
            id: "meridian-about-image",
            type: "image",
            props: {
              src: IMG.studio,
              alt: "MERIDIAN FILMS production office",
              caption: "A five-person core team, majority-local crews on every shoot",
            },
          },
          {
            id: "meridian-about-body",
            type: "text",
            props: {
              heading: "Our story",
              body: "MERIDIAN FILMS was founded by three producers who kept getting asked to attach a bigger, more 'bankable' name to modest, specific stories — and kept watching what made those stories specific get sanded off in the process. We made a five-film promise instead: five features, five different countries, majority-local crews, and no note that trades a real place for a more marketable one. Four festival selections and one jury prize later, the promise became the company.",
            },
          },
          {
            id: "meridian-about-values",
            type: "features",
            props: {
              heading: "What we stand for",
              items: [
                { title: "Shot where it's set", body: "Every film is produced in the country its story takes place in, with a majority-local crew — not a substitute location." },
                { title: "Synopsis before sizzle", body: "If a pitch needs a trailer to explain itself, we pass — the logline should already be the whole idea." },
                { title: "Original scores only", body: "No licensed soundtrack has appeared in a MERIDIAN release. Every score is commissioned for the film." },
                { title: "A producer reads every pitch", body: "No coverage service, no form rejection — someone on our team reads and replies personally." },
              ],
            },
          },
          footer("meridian-footer-about"),
        ],
      },
      {
        slug: "faq",
        title: "FAQ",
        sections: [
          nav("meridian-nav-faq"),
          {
            id: "meridian-faq",
            type: "faq",
            props: {
              heading: "Frequently asked",
              items: [
                {
                  question: "How do I request a press screener?",
                  answer: "Message us on WhatsApp with your outlet and the film you're covering — we send secure screener links directly, no third-party service.",
                },
                {
                  question: "Do you accept unsolicited pitches?",
                  answer: "Yes — see the Submissions page. We read every logline ourselves and reply within three weeks either way.",
                },
                {
                  question: "Where can I watch your films?",
                  answer: "Theatrically during each film's regional run, and on the festival circuit before that. We announce streaming availability on the newsletter, never before.",
                },
                {
                  question: "Do you produce commercial or corporate video work?",
                  answer: "No — MERIDIAN only produces feature-length narrative films. For commercial production, a studio like our Production & film neighbors may be a better fit.",
                },
                {
                  question: "How do I get merch delivered outside West Africa?",
                  answer: "Message us on WhatsApp — international shipping is available on request for most items, priced at cost.",
                },
              ],
              contactPanel: {
                heading: "Still have a question?",
                body: "Our team answers press, submission, and general questions directly on WhatsApp.",
                buttonLabel: "Message us",
                buttonHref: "#whatsapp",
                imageUrl: IMG.founder,
              },
            },
          },
          {
            id: "meridian-faq-contact",
            type: "contact",
            props: {
              heading: "Get in touch",
              email: "hello@meridianfilms.example",
              phone: PHONE,
              address: "Plateau, Abidjan — by appointment",
            },
          },
          {
            id: "meridian-faq-form",
            type: "form",
            props: {
              heading: "Send a message",
              subheading: "Press, festivals, merch — we read every note.",
              buttonLabel: "Send",
              successMessage: "Thanks — MERIDIAN FILMS received your message.",
              fields: [
                { id: "name", label: "Your name", type: "text", required: true, placeholder: "", options: [] },
                { id: "email", label: "Email", type: "email", required: true, placeholder: "you@email.com", options: [] },
                { id: "phone", label: "WhatsApp", type: "phone", required: false, placeholder: "+225…", options: [] },
                {
                  id: "topic",
                  label: "Topic",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Press", "Submissions", "Merch order", "Festival programming", "Other"],
                },
                { id: "message", label: "Message", type: "textarea", required: true, placeholder: "How can we help?", options: [] },
              ],
            },
          },
          {
            id: "meridian-faq-wa",
            type: "whatsapp",
            props: {
              label: "WhatsApp MERIDIAN FILMS",
              phone: PHONE,
              message: "Hi MERIDIAN FILMS — I have a question.",
            },
          },
          footer("meridian-footer-faq"),
        ],
      },
    ],
  };
}
