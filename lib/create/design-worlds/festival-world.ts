import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * DUNES FESTIVAL — African music festival, DanceFest editorial pattern.
 * Bold type, full-bleed editorial hero, lineup gallery, ticket tiers, sponsor strip.
 * Events section for schedule. WhatsApp for ticket inquiries.
 * No quiz — pure event promo.
 */

const NAV = [
  { label: "Lineup", href: "/lineup" },
  { label: "Programme", href: "/programme" },
  { label: "Billets", href: "/billets" },
  { label: "Info pratique", href: "/info" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "DUNES FESTIVAL", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© DUNES FESTIVAL — Dakar, Sénégal. Respect de la musique africaine.",
      links: [
        { label: "Lineup", href: "/lineup" },
        { label: "Programme", href: "/programme" },
        { label: "Billets", href: "/billets" },
        { label: "Info pratique", href: "/info" },
      ],
    },
  };
}

export function festivalWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "DUNES FESTIVAL",
    theme: {
      primary: "#1C0A00",
      accent: "#FF6B00",
      background: "#0E0800",
      text: "#FFF4E6",
      fontDisplay: "Bebas Neue",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      aestheticId: "editorial-festival",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("df-nav-home"),
          {
            id: "df-announce",
            type: "announcement-bar",
            props: {
              text: "🎟️ BILLETS EARLY BIRD — ENCORE DISPONIBLES · Quantité limitée",
              background: "#FF6B00",
              color: "#0E0800",
              countdownTo: "2025-03-15T00:00:00Z",
              countdownLabel: "Early Bird se termine dans",
            },
          },
          {
            id: "df-hero",
            type: "editorial-hero",
            props: {
              heading: "DUNES\nFESTIVAL\n2025",
              subheading:
                "7–9 mars 2025 · Plage de Saly, Sénégal\n40 artistes · 3 scènes · 3 jours de musique africaine pure",
              buttonLabel: "Prendre mes billets",
              buttonHref: "/billets",
              imageUrl: "",
              imageAlt: "DUNES FESTIVAL 2025 — Saly, Sénégal",
              align: "left",
              overlayOpacity: 0.6,
              heightVh: 95,
              background: "#0E0800",
            },
          },
          {
            id: "df-stats",
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "40", suffix: "+", label: "Artistes" },
                { value: "3", label: "Scènes" },
                { value: "3", label: "Jours" },
                { value: "15 000", suffix: "+", label: "Festivaliers attendus" },
              ],
              background: "#FF6B00",
            },
          },
          {
            id: "df-marquee",
            type: "marquee",
            props: {
              items: [
                "AFROBEATS",
                "MBALAX",
                "AFROPOP",
                "COUPÉ DÉCALÉ",
                "AMAPIANO",
                "ZOUK",
                "BLUES TOUAREG",
                "HIGHLIFE",
                "SALY 2025",
              ],
              speed: 38,
              background: "#1C0A00",
              color: "#FF6B00",
              separator: "◆",
            },
          },
          {
            id: "df-headliners",
            type: "features",
            props: {
              heading: "Têtes d'affiche",
              subheading: "SCÈNE PRINCIPALE · VENDREDI, SAMEDI, DIMANCHE",
              layout: "grid",
              background: "#1C0A00",
              items: [
                {
                  icon: "⭐",
                  title: "Artiste headliner 1",
                  body: "Pays · Genre — description courte de l'artiste et de ce qu'on peut attendre de leur set.",
                  imageUrl: "",
                },
                {
                  icon: "⭐",
                  title: "Artiste headliner 2",
                  body: "Pays · Genre — description courte de l'artiste et de ce qu'on peut attendre de leur set.",
                  imageUrl: "",
                },
                {
                  icon: "⭐",
                  title: "Artiste headliner 3",
                  body: "Pays · Genre — description courte de l'artiste et de ce qu'on peut attendre de leur set.",
                  imageUrl: "",
                },
                {
                  icon: "⭐",
                  title: "Artiste headliner 4",
                  body: "Pays · Genre — description courte de l'artiste et de ce qu'on peut attendre de leur set.",
                  imageUrl: "",
                },
              ],
            },
          },
          {
            id: "df-gallery-vibes",
            type: "gallery",
            props: {
              heading: "L'expérience DUNES",
              layout: "featured",
              columns: 3,
              instagramHandle: "dunesfestival",
              followLabel: "Suivre le festival",
              items: [
                { src: "", alt: "Scène principale face mer — coucher de soleil" },
                { src: "", alt: "Festivaliers dansant sous les étoiles" },
                { src: "", alt: "Village gastronomique — spécialités africaines" },
                { src: "", alt: "Scène acoustique — artiste solo" },
                { src: "", alt: "Artisanat et exposants locaux" },
                { src: "", alt: "Camping et hébergements festival" },
              ],
            },
          },
          {
            id: "df-testimonials",
            type: "testimonials",
            props: {
              heading: "Ils étaient là en 2024",
              items: [
                {
                  quote: "3 jours hors du temps. La scène face mer au coucher de soleil — c'est quelque chose qu'on n'oublie pas. On revient en 2025.",
                  name: "Aliou Badji",
                  role: "Festivalier — Abidjan",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Organisation au top, ambiance familiale, lineup irréprochable. Le festival africain qu'on attendait.",
                  name: "Ndeye Awa Seck",
                  role: "Festivalière — Dakar",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Venu de Bamako exprès. Valait le déplacement. J'ai découvert 5 artistes que j'écoute encore aujourd'hui.",
                  name: "Seydou Coulibaly",
                  role: "Festivalier — Bamako",
                  rating: 5,
                  verified: true,
                },
              ],
            },
          },
          {
            id: "df-cta-wa",
            type: "whatsapp",
            props: {
              label: "Questions sur les billets — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour DUNES FESTIVAL — je voudrais des informations sur les billets pour l'édition 2025. Type de billet : [Day pass / Pass 3 jours / VIP].",
            },
          },
          footer("df-footer-home"),
        ],
      },
      {
        slug: "lineup",
        title: "Lineup",
        sections: [
          nav("df-nav-lineup"),
          {
            id: "df-lineup-hero",
            type: "hero",
            props: {
              heading: "Lineup 2025",
              subheading: "40 artistes · 3 scènes — scène principale, scène acoustique, scène découverte.",
              buttonLabel: "Prendre mes billets",
              buttonHref: "/billets",
              align: "left",
              background: "#0E0800",
            },
          },
          {
            id: "df-lineup-categories",
            type: "category-tiles",
            props: {
              heading: "Explorer par scène",
              columns: 3,
              items: [
                {
                  label: "Scène principale",
                  href: "/lineup#main",
                  imageUrl: "",
                  description: "Headliners · 20h–02h",
                },
                {
                  label: "Scène acoustique",
                  href: "/lineup#acoustic",
                  imageUrl: "",
                  description: "Découvertes · 16h–20h",
                },
                {
                  label: "Scène village",
                  href: "/lineup#village",
                  imageUrl: "",
                  description: "Artisans locaux · 12h–16h",
                },
              ],
            },
          },
          {
            id: "df-lineup-gallery",
            type: "gallery",
            props: {
              heading: "Artistes",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Artiste 1" },
                { src: "", alt: "Artiste 2" },
                { src: "", alt: "Artiste 3" },
                { src: "", alt: "Artiste 4" },
                { src: "", alt: "Artiste 5" },
                { src: "", alt: "Artiste 6" },
                { src: "", alt: "Artiste 7" },
                { src: "", alt: "Artiste 8" },
                { src: "", alt: "Artiste 9" },
              ],
            },
          },
          footer("df-footer-lineup"),
        ],
      },
      {
        slug: "programme",
        title: "Programme",
        sections: [
          nav("df-nav-programme"),
          {
            id: "df-programme-hero",
            type: "hero",
            props: {
              heading: "Programme jour par jour",
              subheading: "7, 8 et 9 mars 2025 — horaires préliminaires. Mis à jour régulièrement.",
              buttonLabel: "Réserver mes billets",
              buttonHref: "/billets",
              align: "left",
              background: "#0E0800",
            },
          },
          {
            id: "df-programme-events",
            type: "events",
            props: {
              heading: "Vendredi 7 mars",
              items: [
                {
                  title: "Ouverture du village",
                  date: "Vendredi 7 mars",
                  time: "12h00",
                  location: "Village festival",
                  description: "Artisanat, gastronomie, exposants. Accès libre avec billet festival.",
                  price: "Inclus billet",
                  href: "/billets",
                },
                {
                  title: "Scène découverte — set 1",
                  date: "Vendredi 7 mars",
                  time: "16h00",
                  location: "Scène village",
                  description: "Premier artiste découverte de l'édition — surprise annoncée 48h avant.",
                  price: "Inclus billet",
                  href: "/billets",
                },
                {
                  title: "Coucher de soleil acoustique",
                  date: "Vendredi 7 mars",
                  time: "18h30",
                  location: "Scène plage",
                  description: "Set acoustique face mer — ambiance intime, 500 places assises.",
                  price: "Inclus billet",
                  href: "/billets",
                },
                {
                  title: "Headliner vendredi",
                  date: "Vendredi 7 mars",
                  time: "21h00",
                  location: "Scène principale",
                  description: "TBA — annonce imminente. Abonnez-vous à notre WhatsApp pour être les premiers informés.",
                  price: "Inclus billet",
                  href: "/billets",
                },
              ],
            },
          },
          footer("df-footer-programme"),
        ],
      },
      {
        slug: "billets",
        title: "Billets",
        sections: [
          nav("df-nav-billets"),
          {
            id: "df-billets-hero",
            type: "hero",
            props: {
              heading: "Billets DUNES 2025",
              subheading: "Paiement Wave, Orange Money, ou virement. Billet envoyé par WhatsApp.",
              buttonLabel: "Commander maintenant",
              buttonHref: "#billets-products",
              align: "center",
              background: "#0E0800",
            },
          },
          {
            id: "df-billets-products",
            type: "products",
            props: {
              heading: "Choisissez votre pass",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "Commander — WhatsApp",
              items: [
                {
                  name: "Day Pass — 1 jour",
                  description: "Accès 1 journée au choix (vendredi, samedi ou dimanche). Toutes les scènes, village inclus.",
                  priceLabel: "15 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour DUNES FESTIVAL — je veux 1× Day Pass (15 000 FCFA). Journée souhaitée : [vendredi / samedi / dimanche]. Paiement par : [Wave / Orange Money].",
                },
                {
                  name: "Pass 3 jours",
                  description: "Accès illimité vendredi, samedi et dimanche. Meilleur rapport qualité-prix. Camping non inclus.",
                  priceLabel: "35 000 FCFA",
                  valuePriceLabel: "45 000 FCFA",
                  badge: "BEST VALUE",
                  imageUrl: "",
                  whatsappMessage: "Bonjour DUNES FESTIVAL — je veux 1× Pass 3 jours (35 000 FCFA). Nombre de billets : [X]. Paiement par : [Wave / Orange Money].",
                },
                {
                  name: "VIP Pass 3 jours",
                  description: "Zone VIP, accès backstage samedi soir, lounge climatisé, dîner de gala vendredi. Stock limité à 200 VIP.",
                  priceLabel: "75 000 FCFA",
                  badge: "STOCK LIMITÉ",
                  imageUrl: "",
                  whatsappMessage: "Bonjour DUNES FESTIVAL — je veux 1× VIP Pass 3 jours (75 000 FCFA). Nombre : [X]. Paiement par : [Wave / Orange Money].",
                },
                {
                  name: "Pass Camping",
                  description: "Emplacement tente ou location tente déjà montée pour 3 nuits. À ajouter à votre billet festival.",
                  priceLabel: "À partir de 20 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour DUNES FESTIVAL — je veux ajouter un pass camping. Option : [emplacement seul / tente fournie]. Nombre de personnes : [X].",
                },
                {
                  name: "Navette Dakar ↔ Saly",
                  description: "Bus climatisé aller-retour depuis Dakar centre. Départ 14h vendredi, retour dimanche 04h.",
                  priceLabel: "8 000 FCFA / pers",
                  imageUrl: "",
                  whatsappMessage: "Bonjour DUNES FESTIVAL — je veux réserver la navette Dakar↔Saly (8 000 FCFA). Nombre de places : [X].",
                },
                {
                  name: "Pack groupe 5+ billets",
                  description: "Réduction groupe à partir de 5 personnes. Valable sur Day Pass et Pass 3 jours. Contact uniquement par WhatsApp.",
                  priceLabel: "-15% sur présentation groupe",
                  imageUrl: "",
                  whatsappMessage: "Bonjour DUNES FESTIVAL — nous sommes un groupe de [X] personnes et souhaitons le tarif groupe. Type de billet : [Day Pass / Pass 3 jours].",
                },
              ],
            },
          },
          {
            id: "df-billets-faq",
            type: "faq",
            props: {
              heading: "FAQ billets",
              items: [
                {
                  question: "Comment recevoir mon billet ?",
                  answer: "Après paiement Wave ou Orange Money, envoyez la capture de confirmation par WhatsApp. Votre e-billet QR code est envoyé en moins de 2h.",
                },
                {
                  question: "Les billets sont-ils remboursables ?",
                  answer: "Annulation jusqu'à 30 jours avant l'événement : remboursement à 80%. En dessous de 30 jours : billet échangeable mais non remboursable.",
                },
                {
                  question: "Puis-je offrir un billet ?",
                  answer: "Oui — précisez le nom du bénéficiaire lors de votre commande. Le billet est envoyé avec son nom.",
                },
                {
                  question: "Y a-t-il des billets à la porte ?",
                  answer: "Oui, à 5 000 FCFA de plus que le tarif en ligne, dans la limite des places disponibles.",
                },
              ],
              contactPanel: {
                heading: "Questions sur votre commande ?",
                body: "Notre équipe répond sur WhatsApp en moins de 1h (8h–22h).",
                buttonLabel: "Contacter l'équipe",
                buttonHref: "/info",
                background: "#FF6B00",
              },
            },
          },
          footer("df-footer-billets"),
        ],
      },
      {
        slug: "info",
        title: "Info pratique",
        sections: [
          nav("df-nav-info"),
          {
            id: "df-info-hero",
            type: "hero",
            props: {
              heading: "Infos pratiques",
              subheading: "Lieu, accès, hébergement, et FAQ — tout ce qu'il faut savoir avant de venir.",
              buttonLabel: "Questions ? WhatsApp",
              buttonHref: "#info-wa",
              align: "left",
              background: "#0E0800",
            },
          },
          {
            id: "df-venue-features",
            type: "features",
            props: {
              heading: "Le site",
              layout: "grid",
              items: [
                {
                  icon: "📍",
                  title: "Plage de Saly, Sénégal",
                  body: "80 km de Dakar par l'autoroute à péage (1h30). Sortie Saly-Portudal. Parking voitures gratuit sur site.",
                },
                {
                  icon: "🍽️",
                  title: "Restauration",
                  body: "25 stands de cuisine africaine et internationale dans le village. Prix maîtrisés — de 2 000 à 8 000 FCFA par plat.",
                },
                {
                  icon: "🏕️",
                  title: "Camping",
                  body: "Zone camping sécurisée à 200m des scènes. Douches et sanitaires disponibles. Pass camping sur réservation.",
                },
                {
                  icon: "🚐",
                  title: "Navettes",
                  body: "Bus climatisé depuis Dakar-Plateau, Rufisque, Thiès. Réservez par WhatsApp — places limitées.",
                },
                {
                  icon: "🏥",
                  title: "Sécurité",
                  body: "Équipe médicale sur place 24h/24. Point de premier secours signalé. Bag check à l'entrée.",
                },
                {
                  icon: "📱",
                  title: "Connectivité",
                  body: "WiFi dans la zone VIP et presse. Zone de recharge téléphone en accès libre. Prises disponibles.",
                },
              ],
            },
          },
          {
            id: "df-map",
            type: "map",
            props: {
              heading: "Comment venir",
              address: "Plage de Saly-Portudal, Sénégal",
              lat: 14.4522,
              lng: -16.9972,
              zoom: 13,
            },
          },
          {
            id: "df-info-contact",
            type: "contact",
            props: {
              heading: "Contact & accréditations",
              email: "info@dunesfestival.example",
              phone: "+221770000000",
              address: "DUNES FESTIVAL — Saly-Portudal, Sénégal · Accueil presse & artistes : presse@dunesfestival.example",
            },
          },
          {
            id: "df-info-wa",
            type: "whatsapp",
            props: {
              label: "Question générale — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour DUNES FESTIVAL — j'ai une question sur [billet / camping / accès / autre]. Ma question :",
            },
          },
          footer("df-footer-info"),
        ],
      },
    ],
  };
}
