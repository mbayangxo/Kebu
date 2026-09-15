import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Talent Agency — roster, casting briefs, WhatsApp bookings
 * Management Company — client roster, services, brand deals, contact
 */

function nav(id: string, brand: string, links: { label: string; href: string }[]) {
  return { id, type: "navigation" as const, props: { brand, links } };
}
function footer(id: string, text: string, links: { label: string; href: string }[]) {
  return { id, type: "footer" as const, props: { text, links } };
}

// ─── TALENT AGENCY ────────────────────────────────────────────────────────────

const TALENT_NAV = [
  { label: "Roster", href: "/roster" },
  { label: "Casting", href: "/casting" },
  { label: "Services", href: "/services" },
  { label: "Contact", href: "/contact" },
];

export function talentAgencyWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Talent Agency",
    theme: {
      primary: "#111111",
      accent: "#E8C84A",
      background: "#F7F6F2",
      text: "#111111",
      fontDisplay: "Playfair Display",
      fontBody: "Inter",
      spacing: "airy",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "talent-noir-gold",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("ta-nav-home", "STELLAR", TALENT_NAV),
          {
            id: "ta-announce",
            type: "announcement-bar",
            props: {
              text: "Casting ouvert — saison 2025. Envoyez votre book sur WhatsApp.",
              background: "#111111",
              textColor: "#E8C84A",
            },
          },
          {
            id: "ta-hero",
            type: "hero",
            props: {
              heading: "Talents africains,\nscène mondiale.",
              subheading:
                "Agence de talent basée à Dakar. Nous représentons mannequins, acteurs, influenceurs et artistes. Casting, publicité, film, digital.",
              buttonLabel: "Voir le roster",
              buttonHref: "/roster",
              align: "left",
              background: "#111111",
            },
          },
          {
            id: "ta-roster-home",
            type: "features",
            props: {
              heading: "Talents phares",
              items: [
                { title: "Mannequins", body: "Editorial, campaign, runway — profils sélectionnés pour le marché Afrique et international." },
                { title: "Acteurs & comédiens", body: "Séries, publicités, court-métrages — casting réalisé sous 48h." },
                { title: "Influenceurs", body: "Micro à macro — communautés engagées au Sénégal, Côte d'Ivoire, Mali, France." },
                { title: "Artistes & musiciens", body: "Performances live, sync, brand deals — représentation complète." },
              ],
            },
          },
          {
            id: "ta-brands",
            type: "testimonials",
            props: {
              heading: "Ils nous font confiance",
              items: [
                {
                  quote: "L'agence nous a trouvé le bon talent en 24h pour notre campagne. Professionnel, réactif, résultat au-delà des attentes.",
                  name: "Directeur créatif",
                  role: "Agence de publicité — Dakar",
                },
                {
                  quote: "Roster diversifié, casting rapide. On travaille avec Stellar depuis 2 ans sur toutes nos productions.",
                  name: "Productrice",
                  role: "Maison de production — Abidjan",
                },
              ],
            },
          },
          {
            id: "ta-wa-home",
            type: "whatsapp",
            props: {
              label: "Soumettre un casting — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — j'ai un casting / une demande de talent. Voici le brief :\n- Type de projet :\n- Profil recherché :\n- Budget :\n- Dates :",
            },
          },
          footer("ta-footer-home", "© STELLAR Talent Agency — Dakar · Abidjan · Paris. Tous droits réservés.", TALENT_NAV),
        ],
      },
      {
        slug: "roster",
        title: "Roster",
        sections: [
          nav("ta-nav-roster", "STELLAR", TALENT_NAV),
          {
            id: "ta-roster-hero",
            type: "hero",
            props: {
              heading: "Le roster",
              subheading: "Mannequins · acteurs · influenceurs · artistes. Demandez les books complets sur WhatsApp.",
              buttonLabel: "Brief casting",
              buttonHref: "/casting",
              align: "left",
              background: "#111111",
            },
          },
          {
            id: "ta-roster-grid",
            type: "products",
            props: {
              heading: "Talents disponibles",
              subheading: "Cliquez sur un profil ou envoyez-nous un brief — nous vous proposons les talents les mieux adaptés.",
              items: [],
            },
          },
          {
            id: "ta-roster-categories",
            type: "features",
            props: {
              heading: "Par spécialité",
              items: [
                { title: "Mannequins femme", body: "Tailles 34–44. Styles : editorial, commercial, runway. Marchés : Afrique, Europe, Moyen-Orient." },
                { title: "Mannequins homme", body: "Profils athlétiques et élancés. Publicités, catalogues, films de mode." },
                { title: "Enfants & ados", body: "6–17 ans. Publicités, spots TV, contenus digital. Accompagnement parental inclus." },
                { title: "Plus size & courbe", body: "Représentation inclusive — profils 44 à 58+. Campagnes nationales et internationales." },
              ],
            },
          },
          {
            id: "ta-roster-wa",
            type: "whatsapp",
            props: {
              label: "Demander le book complet — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais voir le book complet d'un talent. Voici mon brief :\n- Type de projet :\n- Profil :\n- Dates :",
            },
          },
          footer("ta-footer-roster", "© STELLAR Talent Agency — Dakar · Abidjan · Paris.", TALENT_NAV),
        ],
      },
      {
        slug: "casting",
        title: "Casting",
        sections: [
          nav("ta-nav-casting", "STELLAR", TALENT_NAV),
          {
            id: "ta-cast-hero",
            type: "hero",
            props: {
              heading: "Soumettre un casting",
              subheading: "Brief reçu — sélection de talents proposée en moins de 24h.",
              buttonLabel: "Envoyer un brief",
              buttonHref: "#form",
              align: "left",
              background: "#111111",
            },
          },
          {
            id: "ta-cast-process",
            type: "features",
            props: {
              heading: "Comment ça marche",
              items: [
                { title: "1. Brief", body: "Partagez le projet, le profil recherché, le budget et les dates sur le formulaire ou WhatsApp." },
                { title: "2. Sélection", body: "On vous propose 3–5 talents adaptés avec books et tarifs en moins de 24h." },
                { title: "3. Option & confirm", body: "Vous optionnez le talent — il est réservé pour votre projet. Contrat signé, go." },
                { title: "4. Shoot / tournage", body: "Le talent arrive préparé. Nous gérons la logistique et le suivi sur place." },
              ],
            },
          },
          {
            id: "ta-cast-form",
            type: "form",
            props: {
              heading: "Brief casting",
              subheading: "Remplissez — réponse sous 24h.",
              buttonLabel: "Envoyer le brief",
              successMessage: "Brief reçu — nous vous répondons sous 24h avec une sélection.",
              fields: [
                { id: "nom", label: "Nom & société", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "email", label: "Email", type: "email", required: false, placeholder: "", options: [] },
                { id: "type_projet", label: "Type de projet", type: "select", required: true, placeholder: "", options: ["Publicité / campagne", "Film / série", "Lookbook / éditorial", "Événement / live", "Contenu digital", "Autre"] },
                { id: "profil", label: "Profil recherché", type: "textarea", required: true, placeholder: "Âge, genre, style, particularités…", options: [] },
                { id: "budget", label: "Budget indicatif", type: "select", required: false, placeholder: "", options: ["< 500 000 XOF", "500 000–2M XOF", "2M–5M XOF", "> 5M XOF", "À discuter"] },
                { id: "dates", label: "Dates souhaitées", type: "text", required: true, placeholder: "Ex : 15–17 mars 2025", options: [] },
                { id: "note", label: "Détails supplémentaires", type: "textarea", required: false, placeholder: "", options: [] },
              ],
            },
          },
          {
            id: "ta-cast-wa",
            type: "whatsapp",
            props: {
              label: "Envoyer le brief sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — voici mon brief casting :\n- Type de projet :\n- Profil :\n- Budget :\n- Dates :",
            },
          },
          footer("ta-footer-casting", "© STELLAR Talent Agency.", TALENT_NAV),
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          nav("ta-nav-services", "STELLAR", TALENT_NAV),
          {
            id: "ta-svc-hero",
            type: "hero",
            props: {
              heading: "Services",
              subheading: "Talent, production, brand deals — un seul interlocuteur pour votre casting.",
              buttonLabel: "Nous contacter",
              buttonHref: "/contact",
              align: "center",
              background: "#111111",
            },
          },
          {
            id: "ta-svc-list",
            type: "features",
            props: {
              heading: "Ce qu'on fait",
              items: [
                { title: "Représentation exclusive", body: "On gère votre carrière de A à Z — book, casting, contrats, paiements, planning." },
                { title: "Casting & production", body: "Sélection de talents pour marques, agences et maisons de production. Brief → sélection 24h." },
                { title: "Brand deals & partenariats", body: "On négocie et structure vos contrats de marque — publicité, ambassade, co-création." },
                { title: "Développement de carrière", body: "Formation, coaching, coaching photo, media training — on vous prépare aux grands projets." },
                { title: "International", body: "Réseaux Europe, Moyen-Orient, Amériques. On vous accompagne sur les marchés à l'export." },
                { title: "Production de contenu", body: "Shooting éditorial, vidéo de présentation, digital content — pour alimenter vos réseaux." },
              ],
            },
          },
          {
            id: "ta-svc-wa",
            type: "whatsapp",
            props: {
              label: "En savoir plus — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais en savoir plus sur vos services :",
            },
          },
          footer("ta-footer-services", "© STELLAR Talent Agency.", TALENT_NAV),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("ta-nav-contact", "STELLAR", TALENT_NAV),
          {
            id: "ta-contact",
            type: "contact",
            props: {
              heading: "Nous contacter",
              email: "booking@stellar-agency.com",
              phone: "+221770000000",
              address: "Dakar — Plateau · Lun–ven 9h–18h · Casting sur RDV",
            },
          },
          {
            id: "ta-faq",
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                { question: "Comment rejoindre le roster ?", answer: "Envoyez votre book (photos, vidéos, mensurations) sur WhatsApp ou par email. On vous répond sous 5 jours ouvrés." },
                { question: "Quels sont vos tarifs ?", answer: "Variables selon le talent, le projet et la durée. Brief + budget → on vous propose les bons profils et les tarifs associés." },
                { question: "Travaillez-vous à l'international ?", answer: "Oui — réseaux Afrique, France, UAE, UK. On structure les contrats export et gère la logistique voyage." },
                { question: "Délai de casting ?", answer: "Brief reçu → sélection proposée sous 24h. Confirmation → option du talent sous 48h." },
              ],
            },
          },
          {
            id: "ta-contact-wa",
            type: "whatsapp",
            props: {
              label: "Écrire sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — j'ai une question pour STELLAR :",
            },
          },
          footer("ta-footer-contact", "© STELLAR Talent Agency — Dakar · Abidjan · Paris.", TALENT_NAV),
        ],
      },
    ],
  };
}

// ─── MANAGEMENT COMPANY ───────────────────────────────────────────────────────

const MGMT_NAV = [
  { label: "Artistes", href: "/artistes" },
  { label: "Services", href: "/services" },
  { label: "Brand deals", href: "/brand-deals" },
  { label: "Contact", href: "/contact" },
];

export function managementCompanyWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Management",
    theme: {
      primary: "#0D0D0D",
      accent: "#FF4D00",
      background: "#F8F8F6",
      text: "#0D0D0D",
      fontDisplay: "Space Grotesk",
      fontBody: "Inter",
      spacing: "airy",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "management-bold-orange",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("mgmt-nav-home", "APEX MGT", MGMT_NAV),
          {
            id: "mgmt-announce",
            type: "announcement-bar",
            props: {
              text: "Nouveau : label partenaire disponible pour les artistes indépendants. Contactez-nous.",
              background: "#FF4D00",
              textColor: "#FFFFFF",
            },
          },
          {
            id: "mgmt-hero",
            type: "hero",
            props: {
              heading: "On gère.\nVous créez.",
              subheading:
                "Management d'artistes, influenceurs et créateurs africains. Carrières, brand deals, contrats, tournées. Basés à Dakar — actifs partout.",
              buttonLabel: "Nos artistes",
              buttonHref: "/artistes",
              align: "left",
              background: "#0D0D0D",
            },
          },
          {
            id: "mgmt-services-home",
            type: "features",
            props: {
              heading: "Ce qu'on gère",
              items: [
                { title: "Carrière & agenda", body: "Planning, confirmations, déplacements, rider technique — on gère tout pour que vous vous concentriez sur la création." },
                { title: "Contrats & deals", body: "Négociation, lecture et signature de contrats. Droits, royalties, brand deals — on protège vos intérêts." },
                { title: "Image & communication", body: "Stratégie de communication, presse, réseaux, digital — on construit votre image avec vous." },
                { title: "Brand deals", body: "On identifie, négocie et structure vos partenariats de marque — en ligne avec votre univers artistique." },
              ],
            },
          },
          {
            id: "mgmt-testimonials",
            type: "testimonials",
            props: {
              heading: "Ils nous font confiance",
              items: [
                {
                  quote: "Avant APEX, je gérais tout seul — shows, contrats, réseaux. Maintenant je fais juste de la musique. Résultat : 3× plus de shows en 6 mois.",
                  name: "Artiste — rap / afrobeats",
                  role: "Dakar",
                },
                {
                  quote: "Mon premier brand deal à 6 chiffres, c'est grâce à eux. Ils ont tout négocié, tout structuré. Je signe, je crée, c'est tout.",
                  name: "Créatrice de contenu — mode",
                  role: "Abidjan",
                },
              ],
            },
          },
          {
            id: "mgmt-wa-home",
            type: "whatsapp",
            props: {
              label: "Parler à l'équipe — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je suis artiste / créateur et j'aimerais en savoir plus sur vos services de management.",
            },
          },
          footer("mgmt-footer-home", "© APEX Management — Dakar · Afrique de l'Ouest · International.", MGMT_NAV),
        ],
      },
      {
        slug: "artistes",
        title: "Artistes",
        sections: [
          nav("mgmt-nav-artistes", "APEX MGT", MGMT_NAV),
          {
            id: "mgmt-art-hero",
            type: "hero",
            props: {
              heading: "Le roster",
              subheading: "Artistes, influenceurs et créateurs gérés par APEX. Demandez un brief pour les bookings.",
              buttonLabel: "Booking WhatsApp",
              buttonHref: "/contact",
              align: "left",
              background: "#0D0D0D",
            },
          },
          {
            id: "mgmt-art-grid",
            type: "products",
            props: {
              heading: "Artistes & créateurs",
              subheading: "Pour les bookings, demandes de collaboration et brand deals — contactez-nous directement.",
              items: [],
            },
          },
          {
            id: "mgmt-art-wa",
            type: "whatsapp",
            props: {
              label: "Booking & collaboration — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais booker / collaborer avec un de vos artistes. Voici ma demande :\n- Artiste :\n- Projet :\n- Dates :\n- Budget :",
            },
          },
          footer("mgmt-footer-artistes", "© APEX Management.", MGMT_NAV),
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          nav("mgmt-nav-services", "APEX MGT", MGMT_NAV),
          {
            id: "mgmt-svc-hero",
            type: "hero",
            props: {
              heading: "Services",
              subheading: "Management complet ou à la carte — selon votre stade de carrière.",
              buttonLabel: "Parler à un manager",
              buttonHref: "/contact",
              align: "center",
              background: "#0D0D0D",
            },
          },
          {
            id: "mgmt-svc-tiers",
            type: "features",
            props: {
              heading: "Nos offres",
              items: [
                { title: "Management 360°", body: "Carrière, deals, presse, réseaux, tournées — prise en charge complète. Commission sur revenus générés." },
                { title: "Label & distribution", body: "On vous sort sur toutes les plateformes (Spotify, Boomplay, Audiomack, Apple…) + promo digitale." },
                { title: "Brand deals uniquement", body: "On identifie et négocie vos partenariats de marque. Commission sur deal conclu." },
                { title: "Conseil ponctuel", body: "Relecture de contrat, stratégie de carrière, audit de réseaux — facturation à la prestation." },
              ],
            },
          },
          {
            id: "mgmt-svc-wa",
            type: "whatsapp",
            props: {
              label: "Discuter de votre projet — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je suis intéressé par vos services de management. Voici mon profil :\n- Je suis :\n- Stade de carrière :\n- Ce dont j'ai besoin :",
            },
          },
          footer("mgmt-footer-services", "© APEX Management.", MGMT_NAV),
        ],
      },
      {
        slug: "brand-deals",
        title: "Brand deals",
        sections: [
          nav("mgmt-nav-brand", "APEX MGT", MGMT_NAV),
          {
            id: "mgmt-brand-hero",
            type: "hero",
            props: {
              heading: "Brand deals &\npartenariats",
              subheading: "Vous cherchez un ambassadeur, un créateur ou un influenceur pour votre marque ? On gère toute la relation.",
              buttonLabel: "Soumettre une demande",
              buttonHref: "#form",
              align: "left",
              background: "#0D0D0D",
            },
          },
          {
            id: "mgmt-brand-form",
            type: "form",
            props: {
              heading: "Demande de partenariat",
              subheading: "Brief reçu → réponse sous 48h.",
              buttonLabel: "Envoyer la demande",
              successMessage: "Demande reçue — on revient vers vous sous 48h.",
              fields: [
                { id: "marque", label: "Marque / société", type: "text", required: true, placeholder: "", options: [] },
                { id: "contact", label: "Votre nom et poste", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "type_deal", label: "Type de partenariat", type: "select", required: true, placeholder: "", options: ["Ambassade de marque", "Post sponsorisé / UGC", "Apparition événement", "Collaboration produit", "Contenu long terme"] },
                { id: "budget", label: "Budget indicatif", type: "select", required: false, placeholder: "", options: ["< 500 000 XOF", "500 000–2M XOF", "2M–10M XOF", "> 10M XOF", "À discuter"] },
                { id: "brief", label: "Brief de la campagne", type: "textarea", required: true, placeholder: "Produit, objectif, message clé, audience cible…", options: [] },
              ],
            },
          },
          footer("mgmt-footer-brand", "© APEX Management.", MGMT_NAV),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("mgmt-nav-contact", "APEX MGT", MGMT_NAV),
          {
            id: "mgmt-contact",
            type: "contact",
            props: {
              heading: "Nous contacter",
              email: "hello@apex-management.com",
              phone: "+221770000000",
              address: "Dakar — Mermoz · Lun–ven 9h–18h",
            },
          },
          {
            id: "mgmt-faq",
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                { question: "Qui pouvez-vous manager ?", answer: "Artistes musicaux, influenceurs, créateurs de contenu, acteurs, athlètes — tout profil avec une audience ou un projet de carrière sérieux." },
                { question: "Comment se rémunère APEX ?", answer: "Commission sur revenus générés (standard : 15–20% selon la prestation). Pas de frais initiaux sur le management 360°." },
                { question: "Faut-il être basé à Dakar ?", answer: "Non — on travaille avec des talents partout en Afrique et dans la diaspora. Tout se gère à distance ou en hybride." },
                { question: "Acceptez-vous les profils émergents ?", answer: "Oui — si on voit le potentiel, on structure votre lancement. Envoyez votre book/portfolio sur WhatsApp." },
              ],
            },
          },
          {
            id: "mgmt-contact-wa",
            type: "whatsapp",
            props: {
              label: "Parler à l'équipe — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — j'ai une question pour APEX Management :",
            },
          },
          footer("mgmt-footer-contact", "© APEX Management — Dakar · Afrique de l'Ouest · International.", MGMT_NAV),
        ],
      },
    ],
  };
}
