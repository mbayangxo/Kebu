import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * ATELIER SALL — architecture & interior design studio, IN TOUCH editorial pattern.
 * Minimal warm white + graphite aesthetic. Project gallery is the hero.
 * Services, team, process, contact. No quiz — portfolio-first.
 */

const NAV = [
  { label: "Projets", href: "/projets" },
  { label: "Services", href: "/services" },
  { label: "L'atelier", href: "/atelier" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "ATELIER SALL", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© ATELIER SALL — Architecture & design d'intérieur. Dakar, Sénégal.",
      links: [
        { label: "Projets", href: "/projets" },
        { label: "Services", href: "/services" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function architectureWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "ATELIER SALL",
    theme: {
      primary: "#1C1C1C",
      accent: "#C49A6C",
      background: "#F8F6F3",
      text: "#1C1C1C",
      fontDisplay: "Playfair Display",
      fontBody: "Inter",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "minimal-architecture-portfolio",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("as-nav-home"),
          {
            id: "as-hero",
            type: "editorial-hero",
            props: {
              heading: "ESPACE.\nLUMIÈRE.\nSENS.",
              subheading:
                "Architecture résidentielle et commerciale, design d'intérieur. Dakar × Abidjan × Marrakech.",
              buttonLabel: "Voir nos projets",
              buttonHref: "/projets",
              imageUrl: "",
              imageAlt: "ATELIER SALL — projet architectural Dakar",
              align: "left",
              overlayOpacity: 0.35,
              heightVh: 90,
              background: "#1C1C1C",
            },
          },
          {
            id: "as-stats",
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "85", suffix: "+", label: "Projets livrés" },
                { value: "14", label: "Ans d'activité" },
                { value: "3", label: "Pays d'opération" },
                { value: "8", label: "Architectes & designers" },
              ],
            },
          },
          {
            id: "as-featured-projects",
            type: "features",
            props: {
              heading: "Projets phares",
              subheading: "RÉSIDENTIEL · COMMERCIAL · INTÉRIEUR",
              layout: "grid",
              items: [
                {
                  title: "Villa Almadies — Dakar",
                  body: "Résidence familiale 400m², patio central, matériaux locaux et contemporains, vue sur l'océan. Livré 2024.",
                  imageUrl: "",
                  icon: "🏡",
                  href: "/projets",
                },
                {
                  title: "Tower Plateau — Bureaux",
                  body: "Immeuble de bureaux 6 étages, 2 800m². Façade ventilée naturellement, certifié HQE Afrique. Livré 2023.",
                  imageUrl: "",
                  icon: "🏢",
                  href: "/projets",
                },
                {
                  title: "Restaurant Ngor",
                  body: "Design d'intérieur restaurant gastronomique — matériaux naturels, lumière sculptée, 80 couverts. Livré 2024.",
                  imageUrl: "",
                  icon: "🍽️",
                  href: "/projets",
                },
                {
                  title: "Boutique Hôtel, Saly",
                  body: "8 suites indépendantes, piscine à débordement, jardin tropical. Architecture vernaculaire contemporaine.",
                  imageUrl: "",
                  icon: "🌊",
                  href: "/projets",
                },
              ],
            },
          },
          {
            id: "as-gallery",
            type: "gallery",
            props: {
              heading: "Réalisations",
              layout: "masonry",
              columns: 3,
              instagramHandle: "ateliersall.arch",
              followLabel: "Suivre l'atelier",
              items: [
                { src: "", alt: "Villa Almadies — facade" },
                { src: "", alt: "Intérieur salon — matériaux africains" },
                { src: "", alt: "Patio végétalisé" },
                { src: "", alt: "Bureau design d'intérieur" },
                { src: "", alt: "Boutique hôtel Saly" },
                { src: "", alt: "Restaurant Ngor — salle" },
                { src: "", alt: "Détail escalier béton" },
                { src: "", alt: "Terrasse vue mer" },
                { src: "", alt: "Cuisine ouverte contemporaine" },
              ],
            },
          },
          {
            id: "as-testimonials",
            type: "testimonials",
            props: {
              heading: "Nos clients",
              items: [
                {
                  quote: "ATELIER SALL a dépassé toutes nos attentes. La villa est fonctionnelle, belle, et respecte notre culture. Le patio central a transformé notre vie familiale.",
                  name: "Famille Ndiaye",
                  role: "Villa Almadies — Dakar",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Processus rigoureux, délais respectés, budget maîtrisé. Le design d'intérieur du restaurant a multiplié nos réservations par 3.",
                  name: "Hamidou Diop",
                  role: "Restaurant Ngor",
                  rating: 5,
                  verified: true,
                },
              ],
            },
          },
          {
            id: "as-cta-wa",
            type: "whatsapp",
            props: {
              label: "Discuter de votre projet",
              phone: "+221770000000",
              message: "Bonjour ATELIER SALL — j'ai un projet architectural / design d'intérieur et je voudrais en discuter. Type de projet : [villa / bureaux / restaurant / rénovation]. Ville : [Dakar / autre].",
            },
          },
          footer("as-footer-home"),
        ],
      },
      {
        slug: "projets",
        title: "Projets",
        sections: [
          nav("as-nav-projets"),
          {
            id: "as-projets-hero",
            type: "hero",
            props: {
              heading: "Nos projets",
              subheading: "Architecture résidentielle, commerciale et hôtelière — design d'intérieur. 85 projets livrés.",
              buttonLabel: "Discuter de votre projet",
              buttonHref: "/contact",
              align: "left",
              background: "#1C1C1C",
            },
          },
          {
            id: "as-projets-categories",
            type: "category-tiles",
            props: {
              heading: "Explorer par type",
              columns: 4,
              items: [
                { label: "Résidentiel", href: "/projets#residentiel", imageUrl: "", description: "Villas, maisons, appartements" },
                { label: "Commercial", href: "/projets#commercial", imageUrl: "", description: "Bureaux, retail, hôtels" },
                { label: "Intérieur", href: "/projets#interieur", imageUrl: "", description: "Design d'intérieur" },
                { label: "Rénovation", href: "/projets#renovation", imageUrl: "", description: "Réhabilitation & mise à neuf" },
              ],
            },
          },
          {
            id: "as-projets-gallery",
            type: "gallery",
            props: {
              heading: "Portfolio complet",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Villa Almadies — facade" },
                { src: "", alt: "Tower Plateau — extérieur" },
                { src: "", alt: "Restaurant Ngor — intérieur" },
                { src: "", alt: "Boutique hôtel Saly — suite" },
                { src: "", alt: "Appartement Mermoz — rénovation" },
                { src: "", alt: "Showroom Ouakam" },
                { src: "", alt: "Maison Casamance" },
                { src: "", alt: "Bureaux tech startup" },
                { src: "", alt: "Restaurant Abidjan" },
                { src: "", alt: "Villa Marrakech" },
                { src: "", alt: "Patio maison sénégalaise" },
                { src: "", alt: "Salon contemporain" },
              ],
            },
          },
          footer("as-footer-projets"),
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          nav("as-nav-services"),
          {
            id: "as-services-hero",
            type: "hero",
            props: {
              heading: "Ce que nous faisons",
              subheading: "De la conception à la réception des travaux — accompagnement complet ou mission partielle.",
              buttonLabel: "Demander un devis",
              buttonHref: "/contact",
              align: "left",
              background: "#1C1C1C",
            },
          },
          {
            id: "as-services-list",
            type: "features",
            props: {
              heading: "Missions",
              layout: "grid",
              items: [
                {
                  icon: "📐",
                  title: "Architecture neuve",
                  body: "Conception complète — permis de construire, plans d'exécution, suivi de chantier, réception. Résidentiel, commercial, industriel.",
                },
                {
                  icon: "🔨",
                  title: "Rénovation & réhabilitation",
                  body: "Diagnostic, projection 3D, plans de rénovation, coordination avec les entreprises. Délai et budget maîtrisés.",
                },
                {
                  icon: "🛋️",
                  title: "Design d'intérieur",
                  body: "Conception complète de l'espace : mobilier, matériaux, éclairage, couleurs. Livrable : 3D + cahier matériaux + sourcing.",
                },
                {
                  icon: "🏙️",
                  title: "Architecture commerciale",
                  body: "Restaurants, boutiques, bureaux, hôtels. Identité spatiale alignée avec la marque. Mise en œuvre clé en main si souhaité.",
                },
                {
                  icon: "🌿",
                  title: "Architecture bioclimatique",
                  body: "Conception pour le climat sahélien — ventilation naturelle, matériaux locaux, confort thermique sans climatisation excessive.",
                },
                {
                  icon: "📏",
                  title: "Étude de faisabilité",
                  body: "Analyse du terrain / de l'existant, budget prévisionnel, délai estimatif. Prestation préalable à tout projet.",
                },
              ],
            },
          },
          {
            id: "as-process",
            type: "features",
            props: {
              heading: "Notre processus",
              layout: "grid",
              items: [
                {
                  icon: "1",
                  title: "Brief & diagnostic",
                  body: "Réunion WhatsApp ou sur site — besoins, budget, délais, contraintes. Rapport de faisabilité remis en 5 jours.",
                },
                {
                  icon: "2",
                  title: "Esquisse & 3D",
                  body: "Premières intentions, volumétries, 3D immersive. Minimum 2 options soumises. Révisions incluses.",
                },
                {
                  icon: "3",
                  title: "Plans d'exécution",
                  body: "Plans techniques complets, détails constructifs, DPGE. Dossier permis de construire si nécessaire.",
                },
                {
                  icon: "4",
                  title: "Suivi de chantier",
                  body: "Visites hebdomadaires, rapport photos, arbitrage technique. Réception et levée de réserves.",
                },
              ],
            },
          },
          footer("as-footer-services"),
        ],
      },
      {
        slug: "atelier",
        title: "L'atelier",
        sections: [
          nav("as-nav-atelier"),
          {
            id: "as-atelier-hero",
            type: "hero",
            props: {
              heading: "L'atelier",
              subheading: "8 architectes et designers — formés à Dakar, Paris, Lisbonne, Casablanca. Fondé en 2010.",
              buttonLabel: "Discuter d'un projet",
              buttonHref: "/contact",
              align: "left",
              background: "#1C1C1C",
            },
          },
          {
            id: "as-atelier-split",
            type: "split",
            props: {
              heading: "Architecte de la lumière africaine.",
              body: "Ibrahima Sall a fondé l'atelier en 2010 après un Master à l'École Nationale Supérieure d'Architecture de Paris-La Villette.\n\nSa conviction : l'architecture africaine contemporaine doit s'enraciner dans ses propres matériaux, son climat, ses modes de vie — pas importer des solutions pensées pour d'autres latitudes.",
              imageUrl: "",
              imageAlt: "Ibrahima Sall, architecte fondateur",
              imagePosition: "right",
              buttonLabel: "Contacter Ibrahima",
              buttonHref: "/contact",
            },
          },
          {
            id: "as-equipe",
            type: "features",
            props: {
              heading: "L'équipe",
              layout: "grid",
              items: [
                {
                  title: "Ibrahima Sall — Architecte fondateur",
                  body: "DPLG Paris-La Villette · Spécialité résidentiel haut de gamme et hôtellerie.",
                  imageUrl: "",
                  icon: "👨‍💼",
                },
                {
                  title: "Aminata Diop — Architecture commerciale",
                  body: "ENSAS Dakar + Master Lisbonne · Restaurants, bureaux, retail.",
                  imageUrl: "",
                  icon: "👩‍💼",
                },
                {
                  title: "Oumar Baldé — Design d'intérieur",
                  body: "ESMOD Paris · Spécialiste matériaux africains contemporains.",
                  imageUrl: "",
                  icon: "👨‍🎨",
                },
                {
                  title: "Fatou Fall — Architecture bioclimatique",
                  body: "ENAU Tunis · Conception durable, ventilation naturelle, confort tropical.",
                  imageUrl: "",
                  icon: "👩‍🌿",
                },
              ],
            },
          },
          footer("as-footer-atelier"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("as-nav-contact"),
          {
            id: "as-contact-section",
            type: "contact",
            props: {
              heading: "Discutons de votre projet",
              email: "contact@ateliersall.example",
              phone: "+221770000000",
              address: "ATELIER SALL — Plateau, Dakar · Interventions Sénégal, Côte d'Ivoire, Maroc",
            },
          },
          {
            id: "as-contact-wa",
            type: "whatsapp",
            props: {
              label: "WhatsApp — décrivez votre projet",
              phone: "+221770000000",
              message: "Bonjour ATELIER SALL — j'ai un projet et voudrais discuter. Type : [architecture neuve / rénovation / design d'intérieur]. Superficie : [m²]. Budget indicatif : [FCFA]. Ville :",
            },
          },
          {
            id: "as-contact-form",
            type: "form",
            props: {
              heading: "Formulaire de contact",
              subheading: "Réponse sous 48h ouvrées.",
              buttonLabel: "Envoyer ma demande",
              successMessage: "Demande reçue — notre équipe vous contacte sous 48h.",
              fields: [
                { id: "nom", label: "Nom / Entreprise", type: "text", required: true, placeholder: "Votre nom ou raison sociale", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "email", label: "Email", type: "email", required: false, placeholder: "votre@email.com", options: [] },
                {
                  id: "type_projet",
                  label: "Type de projet",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Architecture neuve résidentielle", "Architecture neuve commerciale", "Rénovation", "Design d'intérieur", "Étude de faisabilité", "Autre"],
                },
                { id: "superficie", label: "Superficie approximative", type: "text", required: false, placeholder: "Ex: 200 m²", options: [] },
                { id: "budget", label: "Budget indicatif", type: "text", required: false, placeholder: "Ex: 80 000 000 FCFA", options: [] },
                { id: "description", label: "Description du projet", type: "textarea", required: true, placeholder: "Décrivez votre projet, vos besoins, vos délais...", options: [] },
              ],
            },
          },
          footer("as-footer-contact"),
        ],
      },
    ],
  };
}
