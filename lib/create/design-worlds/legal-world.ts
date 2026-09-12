import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Cabinet Juridique / Legal — West African law firm or legal consultant.
 * Practice areas, consultation booking, WhatsApp, confidential, mobile money.
 * IA: Home · Domaines · Consultation · Tarifs · Contact
 */

const NAV = [
  { label: "Domaines", href: "/domaines" },
  { label: "Consultation", href: "/consultation" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "Cabinet", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Cabinet — conseil juridique, litiges, droit des affaires. Confidentialité garantie.",
      links: [
        { label: "Domaines", href: "/domaines" },
        { label: "Consultation", href: "/consultation" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function legalWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Cabinet Juridique",
    theme: {
      primary: "#1A2535",
      accent: "#9B7A3C",
      background: "#F8F7F5",
      text: "#1A2535",
      fontDisplay: "Playfair Display",
      fontBody: "Source Sans 3",
      spacing: "comfortable",
      headingScale: "md",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "legal-slate-gold",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("legal-nav-home"),
          {
            id: "legal-hero",
            type: "hero",
            props: {
              heading: "Votre défense, notre expertise",
              subheading:
                "Conseil juridique, litiges, droit des affaires, droit de la famille — cabinet basé en Afrique de l'Ouest. Consultation en personne ou à distance. Confidentialité absolue.",
              buttonLabel: "Prendre rendez-vous",
              buttonHref: "/consultation",
              align: "left",
              background: "#1A2535",
            },
          },
          {
            id: "legal-domaines-home",
            type: "features",
            props: {
              heading: "Nos domaines d'intervention",
              items: [
                {
                  title: "Droit des affaires",
                  body: "Création de société, contrats commerciaux, litiges fournisseurs, recouvrement de créances.",
                },
                {
                  title: "Droit de la famille",
                  body: "Divorce, garde d'enfants, successions, régimes matrimoniaux — accompagnement humain et discret.",
                },
                {
                  title: "Droit immobilier",
                  body: "Transactions, baux, litiges de voisinage, titre foncier, copropriété.",
                },
                {
                  title: "Droit du travail",
                  body: "Licenciement, contrats, litiges employeur/employé, négociation syndicale.",
                },
              ],
            },
          },
          {
            id: "legal-atouts",
            type: "features",
            props: {
              heading: "Pourquoi nous choisir",
              items: [
                { title: "Confidentialité garantie", body: "Secret professionnel absolu — vos affaires restent privées." },
                { title: "Consultation WhatsApp", body: "Première consultation possible par message — réponse sous 24 h ouvrées." },
                { title: "Paiement flexible", body: "Honoraires en 2 fois — Wave, Orange Money ou virement. Sans surprise." },
              ],
            },
          },
          {
            id: "legal-testimonials",
            type: "testimonials",
            props: {
              heading: "Témoignages clients",
              items: [
                {
                  quote: "Litige commercial résolu en 3 mois. Conseil clair, défense efficace. Je recommande.",
                  name: "Thierno B.",
                  role: "Chef d'entreprise",
                },
                {
                  quote: "Succession familiale complexe traitée avec discrétion et professionnalisme. Merci.",
                  name: "Anonyme",
                  role: "Client — droit de la famille",
                },
              ],
            },
          },
          {
            id: "legal-cta-wa",
            type: "whatsapp",
            props: {
              label: "Question juridique ? Contactez-nous sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — j'ai une question juridique et souhaiterais prendre un rendez-vous de consultation.",
            },
          },
          footer("legal-footer-home"),
        ],
      },
      {
        slug: "domaines",
        title: "Domaines",
        sections: [
          nav("legal-nav-domaines"),
          {
            id: "legal-domaines-hero",
            type: "hero",
            props: {
              heading: "Domaines d'expertise",
              subheading: "Droit des affaires, de la famille, immobilier, travail, pénal — conseil et représentation.",
              buttonLabel: "Prendre rendez-vous",
              buttonHref: "/consultation",
              align: "center",
              background: "#1A2535",
            },
          },
          {
            id: "legal-domaines-affaires",
            type: "features",
            props: {
              heading: "Droit des affaires",
              items: [
                { title: "Création & structuration de société", body: "SARL, SA, SAS, GIE — immatriculation, statuts, pacte d'associés." },
                { title: "Contrats commerciaux", body: "Rédaction, révision, négociation — contrats fournisseurs, distributeurs, partenaires." },
                { title: "Recouvrement de créances", body: "Lettres de mise en demeure, injonctions de payer, saisies — procédures accélérées." },
                { title: "Litiges commerciaux", body: "Médiation, arbitrage, tribunal de commerce — défense de vos intérêts." },
              ],
            },
          },
          {
            id: "legal-domaines-famille",
            type: "features",
            props: {
              heading: "Droit de la famille & successions",
              items: [
                { title: "Divorce & séparation", body: "Consentement mutuel ou contentieux — protection de vos droits et de vos enfants." },
                { title: "Garde d'enfants", body: "Résidence, pension alimentaire, droit de visite — accompagnement bienveillant." },
                { title: "Successions", body: "Héritage, testaments, partages — traitement légal conforme au droit local et musulman." },
              ],
            },
          },
          {
            id: "legal-domaines-autres",
            type: "features",
            props: {
              heading: "Autres domaines",
              items: [
                { title: "Droit immobilier", body: "Vente, bail, copropriété, litiges voisins, titre foncier, permis de construire." },
                { title: "Droit du travail", body: "Rupture de contrat, harcèlement, négociation, inspection du travail." },
                { title: "Droit pénal", body: "Défense pénale, victimes, instruction judiciaire — cabinet discret et rigoureux." },
              ],
            },
          },
          footer("legal-footer-domaines"),
        ],
      },
      {
        slug: "consultation",
        title: "Consultation",
        sections: [
          nav("legal-nav-consultation"),
          {
            id: "legal-consult-hero",
            type: "hero",
            props: {
              heading: "Prenez rendez-vous",
              subheading: "Consultation en cabinet ou à distance — réponse sous 24 h ouvrées. Première consultation confidentielle.",
              buttonLabel: "Formulaire de rendez-vous",
              buttonHref: "#form",
              align: "left",
              background: "#1A2535",
            },
          },
          {
            id: "legal-consult-modes",
            type: "features",
            props: {
              heading: "Modes de consultation",
              items: [
                { title: "En cabinet", body: "Rendez-vous en présentiel — confidentialité totale, bureau privé." },
                { title: "À distance — WhatsApp / téléphone", body: "Consultation juridique par message ou appel — pratique, discret, efficace." },
                { title: "Urgence", body: "Situation urgente (garde à vue, saisie, convocation) — contactez-nous immédiatement par WhatsApp." },
              ],
            },
          },
          {
            id: "legal-consult-form",
            type: "form",
            props: {
              heading: "Formulaire de rendez-vous",
              subheading: "Remplissez le formulaire — nous vous rappelons sous 24 h pour confirmer la consultation. Toutes les informations restent confidentielles.",
              buttonLabel: "Envoyer ma demande",
              successMessage: "Demande reçue — nous vous contactons sous 24 h ouvrées.",
              fields: [
                { id: "nom", label: "Prénom et nom", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "Téléphone / WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "email", label: "Email (optionnel)", type: "email", required: false, placeholder: "votre@email.com", options: [] },
                {
                  id: "domaine",
                  label: "Domaine juridique",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: [
                    "Droit des affaires",
                    "Droit de la famille",
                    "Successions",
                    "Droit immobilier",
                    "Droit du travail",
                    "Droit pénal",
                    "Autre / Je ne sais pas",
                  ],
                },
                {
                  id: "mode",
                  label: "Mode de consultation souhaité",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["En cabinet", "À distance (WhatsApp / téléphone)", "Urgence"],
                },
                {
                  id: "description",
                  label: "Description succincte de la situation",
                  type: "textarea",
                  required: false,
                  placeholder: "En quelques lignes — sans données sensibles, nous aborderons les détails lors de la consultation.",
                  options: [],
                },
              ],
            },
          },
          {
            id: "legal-consult-wa",
            type: "whatsapp",
            props: {
              label: "Prise de rendez-vous urgente sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je souhaite prendre un rendez-vous de consultation juridique. Voici ma situation :",
            },
          },
          footer("legal-footer-consultation"),
        ],
      },
      {
        slug: "tarifs",
        title: "Tarifs",
        sections: [
          nav("legal-nav-tarifs"),
          {
            id: "legal-tarifs-hero",
            type: "hero",
            props: {
              heading: "Honoraires",
              subheading: "Transparence totale sur nos tarifs — honoraires fixes ou au résultat selon les dossiers.",
              buttonLabel: "Prendre rendez-vous",
              buttonHref: "/consultation",
              align: "left",
              background: "#1A2535",
            },
          },
          {
            id: "legal-tarifs-list",
            type: "features",
            props: {
              heading: "Grille tarifaire",
              items: [
                {
                  title: "Consultation initiale — 25 000 FCFA",
                  body: "1 h — analyse de votre situation, conseils, stratégie. En cabinet ou à distance.",
                },
                {
                  title: "Rédaction de contrat — à partir de 50 000 FCFA",
                  body: "Contrat commercial, bail, statuts de société — selon complexité. Devis fourni avant engagement.",
                },
                {
                  title: "Représentation judiciaire — sur devis",
                  body: "Honoraires selon la nature du litige, les juridictions et la durée prévisible. Devis écrit.",
                },
                {
                  title: "Forfait droit des affaires — à partir de 150 000 FCFA/mois",
                  body: "Suivi juridique mensuel de votre entreprise — contrats, conseils, veille. Idéal PME.",
                },
              ],
            },
          },
          {
            id: "legal-tarifs-paiement",
            type: "text",
            props: {
              heading: "Modalités de paiement",
              body: "Honoraires payables en 1 ou 2 fois selon accord — acompte à la signature de la lettre de mission.\nModes acceptés : Wave, Orange Money, virement bancaire, espèces.\nDevis écrit systématique avant toute mission — aucun frais caché.",
            },
          },
          footer("legal-footer-tarifs"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("legal-nav-contact"),
          {
            id: "legal-contact-section",
            type: "contact",
            props: {
              heading: "Nous contacter",
              email: "cabinet@juridique.example",
              phone: "+221770000000",
              address: "Cabinet — votre adresse, quartier, ville · Lun–ven 8h–18h",
            },
          },
          {
            id: "legal-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "La première consultation est-elle payante ?",
                  answer: "La première consultation est facturée 25 000 FCFA — elle inclut l'analyse de votre situation et un avis juridique précis.",
                },
                {
                  question: "Mes informations resteront-elles confidentielles ?",
                  answer: "Oui — le secret professionnel est une obligation absolue pour tout avocat ou conseiller juridique. Vos données ne sont jamais partagées.",
                },
                {
                  question: "Intervenez-vous dans tout le Sénégal ?",
                  answer: "Oui — nous plaidons devant les juridictions de Dakar et des régions. Consultations à distance disponibles partout.",
                },
                {
                  question: "Puis-je payer en plusieurs fois ?",
                  answer: "Oui — paiement en 2 fois possible pour la plupart des missions. Acompte à la signature, solde à la clôture ou à mi-mission.",
                },
              ],
            },
          },
          footer("legal-footer-contact"),
        ],
      },
    ],
  };
}
