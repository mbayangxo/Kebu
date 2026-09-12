import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * ONG — West African non-governmental organisation.
 * Impact stats, projects, donations (mobile money), volunteer signup, community.
 * IA: Home · Projets · Impact · Adhésion · Contact
 */

const NAV = [
  { label: "Projets", href: "/projets" },
  { label: "Impact", href: "/impact" },
  { label: "Adhérer / Donner", href: "/adhesion" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "ONG", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© ONG — solidarité, développement, impact en Afrique de l'Ouest.",
      links: [
        { label: "Projets", href: "/projets" },
        { label: "Adhérer / Donner", href: "/adhesion" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function ongWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "ONG",
    theme: {
      primary: "#003D6B",
      accent: "#00A3E0",
      background: "#F5F9FC",
      text: "#0A1A2A",
      fontDisplay: "Nunito",
      fontBody: "Open Sans",
      spacing: "comfortable",
      headingScale: "md",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "solidarity-blue",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("ong-nav-home"),
          {
            id: "ong-announce",
            type: "announcement-bar",
            props: {
              text: "Appel à bénévoles — rejoignez notre équipe pour notre prochain projet communautaire",
              background: "#003D6B",
              textColor: "#fff",
            },
          },
          {
            id: "ong-hero",
            type: "hero",
            props: {
              heading: "Ensemble pour un impact durable",
              subheading:
                "Éducation, santé, agriculture, autonomisation des femmes — nous agissons pour les communautés d'Afrique de l'Ouest depuis le terrain.",
              buttonLabel: "Soutenir notre mission",
              buttonHref: "/adhesion",
              align: "left",
              background: "#003D6B",
            },
          },
          {
            id: "ong-missions",
            type: "features",
            props: {
              heading: "Nos domaines d'action",
              items: [
                {
                  title: "Éducation & Alphabétisation",
                  body: "Écoles de village, cours d'alphabétisation pour adultes, bourses scolaires — 1 200 bénéficiaires en 2024.",
                },
                {
                  title: "Santé communautaire",
                  body: "Consultations mobiles, vaccination, sensibilisation — 3 centres de santé soutenus.",
                },
                {
                  title: "Autonomisation des femmes",
                  body: "Groupements de femmes, microfinance, formation professionnelle — 400 femmes accompagnées.",
                },
                {
                  title: "Agriculture durable",
                  body: "Semences améliorées, formation agronomique, accès au crédit agricole — 150 exploitants.",
                },
              ],
            },
          },
          {
            id: "ong-chiffres",
            type: "features",
            props: {
              heading: "Notre impact en chiffres",
              items: [
                { title: "1 200+ bénéficiaires directs", body: "En 2024 — enfants scolarisés, femmes formées, agriculteurs accompagnés." },
                { title: "12 villages", body: "Projets actifs dans 3 régions du Sénégal et 1 région en Guinée." },
                { title: "15 partenaires", body: "ONG internationales, collectivités locales, entreprises mécènes." },
              ],
            },
          },
          {
            id: "ong-gallery-home",
            type: "gallery",
            props: {
              heading: "Sur le terrain",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "École de village" },
                { src: "", alt: "Formation femmes" },
                { src: "", alt: "Consultation santé" },
                { src: "", alt: "Champ agricole" },
                { src: "", alt: "Réunion communauté" },
                { src: "", alt: "Distribution" },
              ],
            },
          },
          {
            id: "ong-testimonials",
            type: "testimonials",
            props: {
              heading: "Voix du terrain",
              items: [
                {
                  quote: "Grâce à la formation, j'ai créé mon activité de couture. Mes enfants vont à l'école maintenant.",
                  name: "Aminata C.",
                  role: "Bénéficiaire — programme femmes",
                },
                {
                  quote: "Notre groupement agricole a doublé sa production avec les nouvelles techniques. Merci pour le soutien.",
                  name: "Ousmane K.",
                  role: "Chef de groupement agricole",
                },
              ],
            },
          },
          {
            id: "ong-don-cta",
            type: "whatsapp",
            props: {
              label: "Faire un don ou devenir bénévole — contactez-nous sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je souhaite soutenir votre ONG. Comment puis-je faire un don ou m'impliquer ?",
            },
          },
          footer("ong-footer-home"),
        ],
      },
      {
        slug: "projets",
        title: "Projets",
        sections: [
          nav("ong-nav-projets"),
          {
            id: "ong-projets-hero",
            type: "hero",
            props: {
              heading: "Nos projets",
              subheading: "Projets en cours et réalisations — transparence totale sur nos actions.",
              buttonLabel: "Soutenir un projet",
              buttonHref: "/adhesion",
              align: "center",
              background: "#003D6B",
            },
          },
          {
            id: "ong-projets-encours",
            type: "features",
            props: {
              heading: "Projets en cours — 2024–2025",
              items: [
                {
                  title: "École de Keur Demba — phase 2",
                  body: "Construction de 3 salles de classe supplémentaires. Budget : 8 500 000 FCFA. Avancement : 65 %. Soutenu par : partenaires locaux + dons individuels.",
                },
                {
                  title: "Groupement de femmes — Ziguinchor",
                  body: "Formation couture + microfinance pour 50 femmes. Budget : 3 200 000 FCFA. Lancement : septembre 2024.",
                },
                {
                  title: "Puits solaire — Tambacounda",
                  body: "Forage + pompe solaire pour 3 villages (1 200 habitants). Budget : 12 000 000 FCFA. Partenaire technique : ONG EauPourTous.",
                },
              ],
            },
          },
          {
            id: "ong-projets-realises",
            type: "features",
            props: {
              heading: "Projets réalisés",
              items: [
                { title: "École primaire — Fatick (2022)", body: "6 salles, 240 élèves scolarisés. Financement : Union Européenne + dons." },
                { title: "Centre de santé — Kolda (2023)", body: "Rénovation + équipement. 800 consultations depuis l'ouverture." },
                { title: "Formation agricole — Kaolack (2023)", body: "80 agriculteurs formés, rendements +40 % en moyenne." },
              ],
            },
          },
          {
            id: "ong-projets-gallery",
            type: "gallery",
            props: {
              heading: "Photos de terrain",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Chantier école" },
                { src: "", alt: "Formation femmes" },
                { src: "", alt: "Puits" },
                { src: "", alt: "Remise de matériel" },
                { src: "", alt: "Inauguration" },
                { src: "", alt: "Enfants école" },
              ],
            },
          },
          footer("ong-footer-projets"),
        ],
      },
      {
        slug: "impact",
        title: "Impact",
        sections: [
          nav("ong-nav-impact"),
          {
            id: "ong-impact-hero",
            type: "hero",
            props: {
              heading: "Notre impact",
              subheading: "Des données concrètes, des vies transformées — rapport annuel disponible.",
              buttonLabel: "Nous rejoindre",
              buttonHref: "/adhesion",
              align: "left",
              background: "#003D6B",
            },
          },
          {
            id: "ong-impact-chiffres",
            type: "features",
            props: {
              heading: "Résultats cumulés depuis 2018",
              items: [
                { title: "5 400 bénéficiaires directs", body: "Enfants, femmes, agriculteurs, familles touchées dans 3 pays." },
                { title: "23 projets réalisés", body: "Éducation, santé, eau, agriculture, formation professionnelle." },
                { title: "62 000 000 FCFA mobilisés", body: "Dons, subventions, partenariats — depuis 2018." },
                { title: "48 bénévoles actifs", body: "Locaux et internationaux — présents sur le terrain chaque année." },
              ],
            },
          },
          {
            id: "ong-impact-rapport",
            type: "text",
            props: {
              heading: "Transparence & rapport annuel",
              body: "Nous publions un rapport annuel détaillant l'utilisation de chaque don : projets financés, bénéficiaires, résultats obtenus, perspectives.\n\nDemandez le rapport 2024 par WhatsApp ou email — il vous est envoyé gratuitement.",
            },
          },
          footer("ong-footer-impact"),
        ],
      },
      {
        slug: "adhesion",
        title: "Adhérer / Donner",
        sections: [
          nav("ong-nav-adhesion"),
          {
            id: "ong-adhesion-hero",
            type: "hero",
            props: {
              heading: "Soutenez notre mission",
              subheading: "Don ponctuel, adhésion annuelle ou bénévolat — chaque contribution compte. Paiement Wave ou Orange Money.",
              buttonLabel: "Faire un don maintenant",
              buttonHref: "#form",
              align: "center",
              background: "#003D6B",
            },
          },
          {
            id: "ong-adhesion-options",
            type: "features",
            props: {
              heading: "Comment nous soutenir",
              items: [
                {
                  title: "Don ponctuel — à partir de 2 000 FCFA",
                  body: "Wave ou Orange Money — vous recevez un reçu et un compte-rendu de l'utilisation. Aucun minimum.",
                },
                {
                  title: "Adhésion annuelle — 10 000 FCFA",
                  body: "Membre actif — rapports trimestriels, invitation aux événements, vote en assemblée générale.",
                },
                {
                  title: "Devenir bénévole",
                  body: "Terrain ou à distance — compétences en éducation, santé, gestion, communication bienvenues.",
                },
                {
                  title: "Partenariat entreprise",
                  body: "Mécénat, RSE, co-financement de projet — contactez-nous pour construire un partenariat sur mesure.",
                },
              ],
            },
          },
          {
            id: "ong-adhesion-form",
            type: "form",
            props: {
              heading: "Formulaire d'adhésion / don",
              subheading: "Remplissez le formulaire — nous vous envoyons les instructions de paiement Wave / Orange Money par WhatsApp.",
              buttonLabel: "Envoyer",
              successMessage: "Merci ! Nous vous contactons sous 24 h pour finaliser votre soutien.",
              fields: [
                { id: "nom", label: "Prénom et nom", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "email", label: "Email", type: "email", required: false, placeholder: "votre@email.com", options: [] },
                {
                  id: "type",
                  label: "Type de soutien",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Don ponctuel", "Adhésion annuelle (10 000 FCFA)", "Bénévolat", "Partenariat entreprise"],
                },
                {
                  id: "montant",
                  label: "Montant du don (si ponctuel)",
                  type: "text",
                  required: false,
                  placeholder: "Ex : 5 000 FCFA",
                  options: [],
                },
                {
                  id: "message",
                  label: "Message ou projet à soutenir",
                  type: "textarea",
                  required: false,
                  placeholder: "Ex : je souhaite soutenir le projet école de Keur Demba…",
                  options: [],
                },
              ],
            },
          },
          {
            id: "ong-adhesion-wa",
            type: "whatsapp",
            props: {
              label: "Faire un don via WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je souhaite faire un don ou adhérer à votre ONG. Comment procéder ?",
            },
          },
          footer("ong-footer-adhesion"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("ong-nav-contact"),
          {
            id: "ong-contact-section",
            type: "contact",
            props: {
              heading: "Nous contacter",
              email: "contact@ong.example",
              phone: "+221770000000",
              address: "Siège social — votre adresse, Dakar, Sénégal",
            },
          },
          {
            id: "ong-faq",
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                {
                  question: "Mon don est-il déductible des impôts ?",
                  answer: "Selon la législation sénégalaise — contactez-nous pour un reçu officiel. Nous sommes une ONG reconnue d'utilité publique.",
                },
                {
                  question: "Comment être sûr que mon don est bien utilisé ?",
                  answer: "Nous publions un rapport annuel et des comptes-rendus trimestriels — chaque don est tracé et associé à un projet.",
                },
                {
                  question: "Puis-je choisir le projet que je finance ?",
                  answer: "Oui — précisez le projet dans le formulaire ou par WhatsApp. Nous vous confirmons l'affectation et vous envoyons un rapport.",
                },
              ],
            },
          },
          footer("ong-footer-contact"),
        ],
      },
    ],
  };
}
