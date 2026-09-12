import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * SMILE DAKAR — dental clinic, Easy Smile clean pattern.
 * Trustworthy white + teal aesthetic, appointment-first, services with pricing,
 * doctor profiles, before/after gallery, WhatsApp booking. No quiz.
 */

const NAV = [
  { label: "Services", href: "/services" },
  { label: "L'équipe", href: "/equipe" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Rendez-vous", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "SMILE DAKAR", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© SMILE DAKAR — Cabinet dentaire moderne. Dakar, Sénégal. Urgences disponibles.",
      links: [
        { label: "Services", href: "/services" },
        { label: "Tarifs", href: "/tarifs" },
        { label: "Rendez-vous", href: "/contact" },
      ],
    },
  };
}

export function dentalClinicWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "SMILE DAKAR",
    theme: {
      primary: "#0B3D52",
      accent: "#00B4CC",
      background: "#F8FCFF",
      text: "#0B3D52",
      fontDisplay: "Nunito",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "md",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "clinical-teal-trust",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("sd-nav-home"),
          {
            id: "sd-announce",
            type: "announcement-bar",
            props: {
              text: "🦷 Détartrage + bilan offert pour tout nouveau patient · Sur rendez-vous WhatsApp",
              background: "#00B4CC",
              color: "#F8FCFF",
            },
          },
          {
            id: "sd-hero",
            type: "split",
            props: {
              heading: "Un sourire\nque vous\naimez.",
              body: "SMILE DAKAR — cabinet dentaire moderne au Plateau. Soins courants, implants, blanchiment, orthodontie.\n\nRDV en moins de 24h · Urgences le jour même · Paiement Wave et Orange Money.",
              imageUrl: "",
              imageAlt: "SMILE DAKAR — cabinet dentaire Dakar",
              imagePosition: "right",
              buttonLabel: "Prendre rendez-vous",
              buttonHref: "/contact",
            },
          },
          {
            id: "sd-stats",
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "4 200", suffix: "+", label: "Patients soignés" },
                { value: "12", label: "Ans d'expérience" },
                { value: "6", label: "Dentistes spécialisés" },
                { value: "98", suffix: "%", label: "Satisfaction patients" },
              ],
            },
          },
          {
            id: "sd-services-home",
            type: "features",
            props: {
              heading: "Nos spécialités",
              layout: "grid",
              items: [
                {
                  icon: "🦷",
                  title: "Soins courants",
                  body: "Détartrage, plombages, traitement de carie, extraction. Anesthésie locale confortable. RDV 24h.",
                },
                {
                  icon: "✨",
                  title: "Blanchiment dentaire",
                  body: "Blanchiment professionnel en cabinet (1h30) ou kit maison personnalisé. Résultats garantis.",
                },
                {
                  icon: "🦴",
                  title: "Implants dentaires",
                  body: "Remplacement de dents manquantes par implant titane. Résultat esthétique et fonctionnel durable.",
                },
                {
                  icon: "😁",
                  title: "Orthodontie",
                  body: "Appareil fixe, aligneurs transparents (Invisalign-compatible). Bilan orthodontique offert.",
                },
                {
                  icon: "👶",
                  title: "Pédodontie",
                  body: "Soins dentaires enfants de 3 à 16 ans. Cadre rassurant, dentiste spécialisé enfant.",
                },
                {
                  icon: "🏥",
                  title: "Chirurgie orale",
                  body: "Extractions complexes, kystes, gestion des dents de sagesse. Suivi post-op inclus.",
                },
              ],
            },
          },
          {
            id: "sd-gallery",
            type: "gallery",
            props: {
              heading: "Avant / Après",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Blanchiment — avant/après" },
                { src: "", alt: "Implant dentaire — résultat final" },
                { src: "", alt: "Orthodontie — sourire transformé" },
                { src: "", alt: "Cabinet SMILE DAKAR — salle de soins" },
                { src: "", alt: "Équipe médicale" },
                { src: "", alt: "Salle d'attente moderne" },
              ],
            },
          },
          {
            id: "sd-testimonials",
            type: "testimonials",
            props: {
              heading: "Ce que disent nos patients",
              items: [
                {
                  quote: "Peur du dentiste toute ma vie — SMILE DAKAR a tout changé. Équipe douce, pas de douleur, résultats bluffants pour mon blanchiment.",
                  name: "Ousmane Badji",
                  role: "Patient depuis 2 ans",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Mon enfant de 6 ans redoutait le dentiste. Ici, l'équipe a su le mettre à l'aise — il repart souriant. Ça n'a pas de prix.",
                  name: "Fatou Diallo",
                  role: "Mère de patient",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Implant posé il y a 18 mois — aucun problème, résultat naturel, ni vu ni connu. Merci Dr. Ndiaye.",
                  name: "Ibrahim Kouyaté",
                  role: "Patient — implant",
                  rating: 5,
                  verified: true,
                },
              ],
            },
          },
          {
            id: "sd-cta-wa",
            type: "whatsapp",
            props: {
              label: "Prendre rendez-vous — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour SMILE DAKAR — je voudrais prendre rendez-vous. Motif : [détartrage / consultation / urgence / blanchiment / autre]. Je suis disponible [jours/heures].",
            },
          },
          footer("sd-footer-home"),
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          nav("sd-nav-services"),
          {
            id: "sd-services-hero",
            type: "hero",
            props: {
              heading: "Nos services",
              subheading: "Soins courants à la chirurgie spécialisée — tous les soins dentaires sous un même toit.",
              buttonLabel: "Prendre rendez-vous",
              buttonHref: "/contact",
              align: "left",
              background: "#0B3D52",
            },
          },
          {
            id: "sd-services-categories",
            type: "category-tiles",
            props: {
              heading: "Explorer par spécialité",
              columns: 3,
              items: [
                { label: "Soins généraux", href: "/services#general", imageUrl: "", description: "Caries, détartrage, extractions" },
                { label: "Esthétique", href: "/services#esthetique", imageUrl: "", description: "Blanchiment, facettes, sourire" },
                { label: "Implants & chirurgie", href: "/services#implants", imageUrl: "", description: "Dents manquantes, chirurgie orale" },
              ],
            },
          },
          {
            id: "sd-services-detail",
            type: "features",
            props: {
              heading: "Détail des soins",
              layout: "grid",
              items: [
                {
                  icon: "🧹",
                  title: "Détartrage & prophylaxie",
                  body: "Nettoyage professionnel ultra-sons + polissage. Bilan complet offert pour tout nouveau patient. Durée 45 min.",
                },
                {
                  icon: "🦷",
                  title: "Traitement carie",
                  body: "Composite blanc esthétique, amalgame-free. Anesthésie sans douleur. Durée 45 min à 1h30 selon la carie.",
                },
                {
                  icon: "🌿",
                  title: "Traitement de canal",
                  body: "Traitement endodontique sous microscope. Préservation de la dent naturelle. Durée 1h30 à 2 séances.",
                },
                {
                  icon: "✨",
                  title: "Blanchiment professionnel",
                  body: "Éclaircissement au LED + gel à 35% en 1h30. Jusqu'à 8 nuances plus blanches. Kit maison offert.",
                },
                {
                  icon: "💎",
                  title: "Facettes céramique",
                  body: "Correction forme, couleur, alignement. Résultat définitif en 2 séances. Bilan esthétique offert.",
                },
                {
                  icon: "🔩",
                  title: "Implant dentaire",
                  body: "Pose chirurgicale en 1h sous anesthésie locale. Couronne définitive posée 3–4 mois après. Garantie 10 ans.",
                },
              ],
            },
          },
          footer("sd-footer-services"),
        ],
      },
      {
        slug: "equipe",
        title: "L'équipe",
        sections: [
          nav("sd-nav-equipe"),
          {
            id: "sd-equipe-hero",
            type: "hero",
            props: {
              heading: "Notre équipe",
              subheading: "6 dentistes spécialisés, formés en France, au Maroc et au Sénégal. Tous anglophones et francophones.",
              buttonLabel: "Prendre rendez-vous",
              buttonHref: "/contact",
              align: "left",
              background: "#0B3D52",
            },
          },
          {
            id: "sd-equipe-list",
            type: "features",
            props: {
              heading: "Dentistes SMILE DAKAR",
              layout: "grid",
              items: [
                {
                  title: "Dr. Aminata Ndiaye — Directrice",
                  body: "Chirurgien-dentiste Université Cheikh Anta Diop · DU parodontologie Paris VII · 12 ans d'expérience. Soins généraux, parodontologie.",
                  imageUrl: "",
                  icon: "👩‍⚕️",
                },
                {
                  title: "Dr. Ibrahima Sall — Implantologie",
                  body: "Diplôme implantologie Rabat · 200+ implants posés · Spécialité : implants immédiats et greffes osseuses.",
                  imageUrl: "",
                  icon: "👨‍⚕️",
                },
                {
                  title: "Dr. Mariama Diop — Pédodontie",
                  body: "Spécialisée enfants 3–16 ans · Formation Paris V · Approche douce et ludique · Cabinet enfant dédié.",
                  imageUrl: "",
                  icon: "👩‍⚕️",
                },
                {
                  title: "Dr. Oumar Baldé — Orthodontie",
                  body: "Orthodontie fixe + aligneurs transparents · Formation Bordeaux · Bilan orthodontique offert.",
                  imageUrl: "",
                  icon: "👨‍⚕️",
                },
              ],
            },
          },
          footer("sd-footer-equipe"),
        ],
      },
      {
        slug: "tarifs",
        title: "Tarifs",
        sections: [
          nav("sd-nav-tarifs"),
          {
            id: "sd-tarifs-hero",
            type: "hero",
            props: {
              heading: "Tarifs transparents",
              subheading: "Tous les tarifs affichés — pas de surprise. Paiement Wave, Orange Money, ou cash en 2× sans frais.",
              buttonLabel: "Prendre rendez-vous",
              buttonHref: "/contact",
              align: "left",
              background: "#0B3D52",
            },
          },
          {
            id: "sd-tarifs-products",
            type: "products",
            props: {
              heading: "Soins courants",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "Réserver ce soin",
              items: [
                {
                  name: "Consultation + bilan",
                  description: "Radio panoramique + examen complet + plan de traitement. Offert pour tout nouveau patient.",
                  priceLabel: "OFFERT (nouv. patient)",
                  badge: "GRATUIT",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SMILE DAKAR — je suis un nouveau patient et voudrais un bilan gratuit. Disponibilités souhaitées :",
                },
                {
                  name: "Détartrage",
                  description: "Nettoyage ultra-sons + polissage. Durée 45 min. À faire tous les 6 mois.",
                  priceLabel: "15 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SMILE DAKAR — je veux un détartrage (15 000 FCFA). Disponibilités souhaitées :",
                },
                {
                  name: "Obturation (composite blanc)",
                  description: "Traitement d'une carie, composite couleur dent. Par dent selon complexité.",
                  priceLabel: "20 000–35 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SMILE DAKAR — j'ai besoin d'un soin de carie. Dent concernée : [numéro/localisation]. Disponibilités :",
                },
                {
                  name: "Extraction simple",
                  description: "Extraction d'une dent sous anesthésie locale. Avec ordonnance post-op.",
                  priceLabel: "20 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SMILE DAKAR — j'ai besoin d'une extraction. Urgence : [oui/non]. Disponibilités souhaitées :",
                },
                {
                  name: "Blanchiment professionnel",
                  description: "LED + gel 35% en cabinet, 1h30. + kit maison de renforcement offert.",
                  priceLabel: "85 000 FCFA",
                  badge: "POPULAIRE",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SMILE DAKAR — je veux un blanchiment professionnel (85 000 FCFA). Disponibilités souhaitées :",
                },
                {
                  name: "Implant dentaire complet",
                  description: "Pose chirurgicale + couronne implanto-portée. Paiement en 3× Wave ou Orange Money.",
                  priceLabel: "À partir de 450 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SMILE DAKAR — je suis intéressé(e) par un implant dentaire. Dent manquante : [localisation]. Puis-je avoir un RDV pour un bilan ?",
                },
              ],
            },
          },
          {
            id: "sd-tarifs-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Acceptez-vous l'assurance maladie / IPM ?",
                  answer: "Oui — nous travaillons avec la MSAS, l'IPRES, la CSS et la plupart des IPM privées. Apportez votre carte et attestation le jour du RDV.",
                },
                {
                  question: "Prenez-vous en charge les urgences ?",
                  answer: "Oui — urgences dentaires acceptées le jour même sur WhatsApp avant 18h. Abcès, douleur intense, dent cassée.",
                },
                {
                  question: "Comment payer en plusieurs fois ?",
                  answer: "Paiement en 2× possible pour les soins au-dessus de 50 000 FCFA : Wave, Orange Money ou virement. En 3× à partir de 150 000 FCFA.",
                },
                {
                  question: "Combien de temps dure un rendez-vous ?",
                  answer: "Détartrage : 45 min · Composite : 1h · Blanchiment : 1h30 · Implant : 1h. Nous respections les horaires — maximum 5 min d'attente.",
                },
              ],
              contactPanel: {
                heading: "Urgence dentaire ?",
                body: "Abcès, douleur intense, dent cassée — contactez-nous sur WhatsApp avant 18h pour un RDV le jour même.",
                buttonLabel: "Urgence — WhatsApp",
                buttonHref: "/contact",
                background: "#00B4CC",
              },
            },
          },
          footer("sd-footer-tarifs"),
        ],
      },
      {
        slug: "contact",
        title: "Rendez-vous",
        sections: [
          nav("sd-nav-contact"),
          {
            id: "sd-contact-section",
            type: "contact",
            props: {
              heading: "Prendre rendez-vous",
              email: "rdv@smiledakar.example",
              phone: "+221770000000",
              address: "SMILE DAKAR — 45 Av. Léopold Sédar Senghor, Plateau, Dakar · Lun–Sam 8h–19h · Urgences 7j/7",
            },
          },
          {
            id: "sd-map",
            type: "map",
            props: {
              heading: "Nous trouver",
              address: "Plateau, Dakar, Sénégal",
              lat: 14.6928,
              lng: -17.4467,
              zoom: 15,
            },
          },
          {
            id: "sd-contact-wa",
            type: "whatsapp",
            props: {
              label: "RDV ou urgence — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour SMILE DAKAR — je voudrais prendre rendez-vous. Motif : [soins / urgence / blanchiment / implant / pédiatrie]. Disponibilités souhaitées :",
            },
          },
          footer("sd-footer-contact"),
        ],
      },
    ],
  };
}
