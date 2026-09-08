import type { WebsiteDefinition } from "./website-schema";

/** Ndaoan House — A24 × Disney-scale ambition × photo × internet content studio. */
export const NDAOAN_AESTHETIC_ID = "ndaoan-cinema" as const;

export function ndaoanHouseTheme(): WebsiteDefinition["theme"] {
  return {
    primary: "#030303",
    accent: "#D4A017",
    background: "#030303",
    text: "#FAF6F0",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "comfortable",
    bodySize: "md",
    headingScale: "xl",
    letterSpacing: "tight",
    aestheticId: NDAOAN_AESTHETIC_ID,
  };
}

export const NDAOAN_NAV = [
  { label: "Home", href: "/" },
  { label: "Films", href: "/films" },
  { label: "Commercials", href: "/commercials" },
  { label: "Animation", href: "/animation" },
  { label: "Photography", href: "/photography" },
  { label: "Studio", href: "/studio" },
  { label: "Partners", href: "/partners" },
  { label: "Contact", href: "/contact" },
] as const;

/** Multi-page Ndaoan House production site — works with DkLNS + K-Direction. */
export function ndaoanWebsiteDefinition(): WebsiteDefinition {
  const theme = ndaoanHouseTheme();
  return {
    schemaVersion: "website-v1",
    title: "Ndaoan House",
    theme,
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "ndaoan-nav",
            type: "navigation",
            props: { brand: "Ndaoan House", links: [...NDAOAN_NAV] },
          },
          {
            id: "ndaoan-hero",
            type: "hero",
            props: {
              heading: "Ndaoan House",
              subheading:
                "Films. Commercials. Animation. Photography. Internet content for companies. A production house with A24 taste, Disney-scale craft discipline, and a studio that ships moving pictures every day.",
              buttonLabel: "See the studio",
              buttonHref: "/studio",
              align: "center",
              background: "#030303",
            },
          },
          {
            id: "ndaoan-home-about",
            type: "text",
            props: {
              heading: "Anything with content",
              body:
                "Ndaoan House is a production company for moving pictures — features and shorts, branded commercials, animation, still photography, and always-on internet content studios for companies. We treat every frame like it has to earn its place on a big screen and a phone screen.",
            },
          },
          {
            id: "ndaoan-home-lanes",
            type: "features",
            props: {
              heading: "Production lanes",
              items: [
                {
                  title: "Film",
                  body: "Narrative and documentary moving pictures — from concept to color to deliverables.",
                },
                {
                  title: "Commercials",
                  body: "Brand films and spots that feel cinematic, not template-ad.",
                },
                {
                  title: "Animation",
                  body: "Motion design and animated storytelling for campaigns and product worlds.",
                },
                {
                  title: "Photography",
                  body: "Still campaigns, lookbooks, and production stills that match the film language.",
                },
                {
                  title: "Internet content studio",
                  body: "Ongoing content for companies — series, social cuts, and always-on creative production.",
                },
              ],
            },
          },
          {
            id: "ndaoan-home-partners",
            type: "text",
            props: {
              heading: "Who we work with",
              body:
                "DkLNS brings talent management and creative direction — including artists like May Lecor. K-Direction partners on label and artistry worlds. Ndaoan House is the house that shoots, animates, photographs, and finishes.",
            },
          },
          {
            id: "ndaoan-home-cta",
            type: "hero",
            props: {
              heading: "Start a production",
              subheading: "Films, commercials, animation, photography, or a company content studio.",
              buttonLabel: "Book the house",
              buttonHref: "/contact",
              align: "center",
              background: "#0A0A0C",
            },
          },
        ],
      },
      {
        slug: "films",
        title: "Films",
        sections: [
          {
            id: "ndaoan-films-nav",
            type: "navigation",
            props: { brand: "Ndaoan House", links: [...NDAOAN_NAV] },
          },
          {
            id: "ndaoan-films-hero",
            type: "hero",
            props: {
              heading: "Films",
              subheading: "Moving pictures with weight — stories that hold up on a cinema screen.",
              buttonLabel: "Commercials",
              buttonHref: "/commercials",
              align: "left",
              background: "#0A0A0C",
            },
          },
          {
            id: "ndaoan-films-body",
            type: "text",
            props: {
              heading: "Film division",
              body:
                "From short films to long-form narrative and documentary, Ndaoan House produces with an independent-cinema sensibility and a studio pipeline: development, production, post, delivery. Think A24 taste with the operational seriousness of a major house.",
            },
          },
          {
            id: "ndaoan-films-feats",
            type: "features",
            props: {
              heading: "Film capabilities",
              items: [
                { title: "Development", body: "Treatments, lookbooks, and production blueprints." },
                { title: "Production", body: "Crew, locations, and on-set leadership." },
                { title: "Post", body: "Edit, sound, color, finishing for festival and platform." },
              ],
            },
          },
        ],
      },
      {
        slug: "commercials",
        title: "Commercials",
        sections: [
          {
            id: "ndaoan-com-nav",
            type: "navigation",
            props: { brand: "Ndaoan House", links: [...NDAOAN_NAV] },
          },
          {
            id: "ndaoan-com-hero",
            type: "hero",
            props: {
              heading: "Commercials",
              subheading: "Brand films and spots for companies that refuse disposable advertising.",
              buttonLabel: "Content studio",
              buttonHref: "/studio",
              align: "left",
              background: "#030303",
            },
          },
          {
            id: "ndaoan-com-body",
            type: "text",
            props: {
              heading: "Commercial production",
              body:
                "Ndaoan House makes commercials as cinema for brands — product stories, launch films, and campaign systems. Agencies and management partners (including DkLNS) bring talent and briefs; we deliver the picture.",
            },
          },
          {
            id: "ndaoan-com-feats",
            type: "features",
            props: {
              heading: "For brands",
              items: [
                { title: "Launch films", body: "Hero films for product and brand moments." },
                { title: "Campaign packs", body: "Cuts for TV, web, and social from one shoot." },
                { title: "Talent x brand", body: "Work with managed artists via DkLNS and label partners like K-Direction." },
              ],
            },
          },
        ],
      },
      {
        slug: "animation",
        title: "Animation",
        sections: [
          {
            id: "ndaoan-anim-nav",
            type: "navigation",
            props: { brand: "Ndaoan House", links: [...NDAOAN_NAV] },
          },
          {
            id: "ndaoan-anim-hero",
            type: "hero",
            props: {
              heading: "Animation",
              subheading: "Motion design and animated worlds — Disney-level care for every frame.",
              buttonLabel: "Photography",
              buttonHref: "/photography",
              align: "left",
              background: "#0A0A0C",
            },
          },
          {
            id: "ndaoan-anim-body",
            type: "text",
            props: {
              heading: "Animation studio",
              body:
                "Character, explainer, and brand worlds in motion. Ndaoan’s animation lane sits beside live action so companies can mix film, animation, and internet content without switching houses.",
            },
          },
          {
            id: "ndaoan-anim-feats",
            type: "features",
            props: {
              heading: "Animation offers",
              items: [
                { title: "Brand motion", body: "Identity systems that move." },
                { title: "Story animation", body: "Shorts and series for campaigns and platforms." },
                { title: "Hybrid", body: "Live action + animation finishing under one roof." },
              ],
            },
          },
        ],
      },
      {
        slug: "photography",
        title: "Photography",
        sections: [
          {
            id: "ndaoan-photo-nav",
            type: "navigation",
            props: { brand: "Ndaoan House", links: [...NDAOAN_NAV] },
          },
          {
            id: "ndaoan-photo-hero",
            type: "hero",
            props: {
              heading: "Photography",
              subheading: "A photography company inside a production house — stills that match the film.",
              buttonLabel: "Studio",
              buttonHref: "/studio",
              align: "left",
              background: "#030303",
            },
          },
          {
            id: "ndaoan-photo-body",
            type: "text",
            props: {
              heading: "Still & motion language",
              body:
                "Campaign photography, artist portraits, production stills, and lookbooks. When DkLNS or K-Direction need images that feel like the same world as the film, Ndaoan House shoots both.",
            },
          },
          {
            id: "ndaoan-photo-gallery",
            type: "gallery",
            props: {
              heading: "Studio stills",
              items: [
                { src: "/templates/maylecor/logo-small.png", alt: "Studio mark" },
                { src: "/templates/maylecor/logo-banner.jpg", alt: "Production texture" },
              ],
            },
          },
        ],
      },
      {
        slug: "studio",
        title: "Studio",
        sections: [
          {
            id: "ndaoan-stu-nav",
            type: "navigation",
            props: { brand: "Ndaoan House", links: [...NDAOAN_NAV] },
          },
          {
            id: "ndaoan-stu-hero",
            type: "hero",
            props: {
              heading: "Content studio",
              subheading: "An internet content studio for companies — always-on production, not one-off ads.",
              buttonLabel: "Partners",
              buttonHref: "/partners",
              align: "left",
              background: "#0A0A0C",
            },
          },
          {
            id: "ndaoan-stu-body",
            type: "text",
            props: {
              heading: "Company content house",
              body:
                "Ndaoan House runs like a studio for the internet age: series formats, social packs, product films, and recurring shoots so companies have a production partner, not a freelance scramble. Disney-scale process, indie-cinema taste.",
            },
          },
          {
            id: "ndaoan-stu-feats",
            type: "features",
            props: {
              heading: "Studio model",
              items: [
                { title: "Retainer productions", body: "Monthly content pipelines for brands." },
                { title: "Format design", body: "Series that audiences return to." },
                { title: "Multi-format delivery", body: "Cinema, web, social — one shoot, many cuts." },
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
            id: "ndaoan-par-nav",
            type: "navigation",
            props: { brand: "Ndaoan House", links: [...NDAOAN_NAV] },
          },
          {
            id: "ndaoan-par-hero",
            type: "hero",
            props: {
              heading: "Partners",
              subheading: "DkLNS and K-Direction work with Ndaoan House.",
              buttonLabel: "Contact",
              buttonHref: "/contact",
              align: "left",
              background: "#030303",
            },
          },
          {
            id: "ndaoan-par-list",
            type: "features",
            props: {
              heading: "Creative network",
              items: [
                {
                  title: "DkLNS",
                  body: "Management and creative agency. Talent like May Lecor is signed there; Ndaoan House produces the pictures.",
                },
                {
                  title: "K-Direction",
                  body: "Label and artistry partner — shared worlds for artists, events, and campaigns that need a production house.",
                },
                {
                  title: "Companies & brands",
                  body: "Direct production for film, commercials, animation, photography, and internet content studios.",
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
            id: "ndaoan-con-nav",
            type: "navigation",
            props: { brand: "Ndaoan House", links: [...NDAOAN_NAV] },
          },
          {
            id: "ndaoan-con-hero",
            type: "hero",
            props: {
              heading: "Contact",
              subheading: "Book film, commercial, animation, photography, or a content studio retainer.",
              buttonLabel: "WhatsApp the house",
              buttonHref: "#whatsapp",
              align: "left",
              background: "#030303",
            },
          },
          {
            id: "ndaoan-con-info",
            type: "contact",
            props: {
              heading: "Production desk",
              email: "hello@ndaoan.house",
              phone: "+221770000000",
              address: "Dakar · productions worldwide",
            },
          },
          {
            id: "ndaoan-con-wa",
            type: "whatsapp",
            props: {
              label: "Message Ndaoan House",
              phone: "+221770000000",
              message: "Hi Ndaoan House — I want to start a production / content studio.",
            },
          },
          {
            id: "ndaoan-con-footer",
            type: "footer",
            props: {
              text: "© Ndaoan House — Film · Commercials · Animation · Photo · Studio. Partners: DkLNS · K-Direction.",
            },
          },
        ],
      },
    ],
  };
}
