import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Creative Studio — editorial photography / art direction portfolio.
 * B&W aesthetic, oversized typography, portfolio mosaic, founder voice.
 * IA: Accueil · Portfolio · Services · Contact
 */

const NAV = [
  { label: "Portfolio", href: "/portfolio" },
  { label: "Services", href: "/services" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "GRID STUDIO", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© GRID STUDIO — direction artistique, photographie, identité visuelle. Basé à Dakar.",
      links: [
        { label: "Portfolio", href: "/portfolio" },
        { label: "Services", href: "/services" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function creativeStudioWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Studio Créatif",
    theme: {
      primary: "#0D0D0D",
      accent: "#F5F5F5",
      background: "#0D0D0D",
      text: "#F5F5F5",
      fontDisplay: "Bebas Neue",
      fontBody: "Inter",
      spacing: "airy",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      aestheticId: "bw-editorial-portfolio",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("cs-nav-home"),
          {
            id: "cs-hero",
            type: "editorial-hero",
            props: {
              heading: "WE MAKE\nTHINGS\nLOOK GOOD.",
              subheading:
                "Direction artistique, photographie éditoriale, identité visuelle — pour les marques africaines qui refusent de passer inaperçues.",
              buttonLabel: "Voir le portfolio",
              buttonHref: "/portfolio",
              imageUrl: "",
              imageAlt: "Shooting éditorial GRID STUDIO",
              align: "left",
              overlayOpacity: 0.55,
              heightVh: 90,
              background: "#0D0D0D",
            },
          },
          {
            id: "cs-marquee",
            type: "marquee",
            props: {
              items: [
                "DIRECTION ARTISTIQUE",
                "PHOTOGRAPHIE",
                "BRANDING",
                "IDENTITÉ VISUELLE",
                "CAMPAGNES MODE",
                "TOURNAGES PRODUIT",
                "DAKAR × ABIDJAN",
              ],
              speed: 35,
              background: "#F5F5F5",
              color: "#0D0D0D",
              separator: "/",
            },
          },
          {
            id: "cs-gallery-home",
            type: "gallery",
            props: {
              heading: "Travaux récents",
              layout: "featured",
              columns: 3,
              items: [
                { src: "", alt: "Campagne mode — collection été" },
                { src: "", alt: "Portrait éditorial — fondateur marque" },
                { src: "", alt: "Shooting produit — cosmétique naturelle" },
                { src: "", alt: "Identité visuelle — restaurant africain" },
                { src: "", alt: "Campagne presse — marque tech Dakar" },
                { src: "", alt: "Contenu social — artiste musicien" },
              ],
            },
          },
          {
            id: "cs-split-founder",
            type: "split",
            props: {
              heading: "UN REGARD AFRICAIN\nSUR LE MONDE.",
              body: "GRID STUDIO, c'est Mamadou Fall — directeur artistique basé à Dakar depuis 2017. Nous travaillons avec des marques qui veulent raconter une histoire vraie, pas une image copiée de l'Occident.\n\nNotre processus : conception, direction, production, livraison. Pas de sous-traitance. Pas de templates.",
              imageUrl: "",
              imageAlt: "Mamadou Fall, directeur artistique GRID STUDIO",
              imagePosition: "right",
              buttonLabel: "Notre approche",
              buttonHref: "/contact",
            },
          },
          {
            id: "cs-services-features",
            type: "features",
            props: {
              heading: "Ce qu'on fait",
              items: [
                {
                  title: "Direction artistique",
                  body: "Concept visuel, moodboard, casting, styling, production complète — pour campagnes publicitaires, éditoriaux, lookbooks.",
                },
                {
                  title: "Photographie",
                  body: "Portrait, produit, mode, architecture — en studio Dakar ou en extérieur. Retouche incluse. Livraison 7 jours.",
                },
                {
                  title: "Identité visuelle",
                  body: "Logo, charte graphique, système de couleurs et typographie — pour les marques qui construisent sur le long terme.",
                },
                {
                  title: "Contenu social",
                  body: "Packs de 10, 20 ou 30 visuels par mois — réseaux sociaux, publicités, stories. Adapté à chaque plateforme.",
                },
              ],
            },
          },
          {
            id: "cs-clients",
            type: "testimonials",
            props: {
              heading: "Ils nous ont fait confiance",
              items: [
                {
                  quote: "GRID STUDIO a transformé notre identité visuelle — nos photos Instagram ont multiplié l'engagement par 4 en deux mois. Résultat mesurable.",
                  name: "Astou Ndiaye",
                  role: "Fondatrice, marque mode Dakar",
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Processus professionnel, ponctuel, créatif. Mamadou comprend l'esthétique africaine contemporaine — ce n'est pas courant.",
                  name: "Ibrahim Kouyaté",
                  role: "Directeur marketing, startup fintech",
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Le lookbook livré en 5 jours, qualité impeccable. On a refait appel à eux trois fois depuis.",
                  name: "Mariama Baldé",
                  role: "Gérante, boutique lifestyle",
                  verified: true,
                  rating: 5,
                },
              ],
            },
          },
          {
            id: "cs-cta-wa",
            type: "whatsapp",
            props: {
              label: "Démarrer un projet — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour GRID STUDIO — je voudrais discuter d'un projet de direction artistique / photographie. Êtes-vous disponibles pour un appel cette semaine ?",
            },
          },
          footer("cs-footer-home"),
        ],
      },
      {
        slug: "portfolio",
        title: "Portfolio",
        sections: [
          nav("cs-nav-portfolio"),
          {
            id: "cs-portfolio-hero",
            type: "hero",
            props: {
              heading: "Portfolio",
              subheading: "Direction artistique · Photographie · Branding — travaux sélectionnés.",
              buttonLabel: "Démarrer un projet",
              buttonHref: "/contact",
              align: "left",
              background: "#0D0D0D",
            },
          },
          {
            id: "cs-portfolio-categories",
            type: "category-tiles",
            props: {
              heading: "Explorer par discipline",
              columns: 4,
              items: [
                { label: "Mode", href: "/portfolio#mode", imageUrl: "", description: "Lookbooks, campagnes" },
                { label: "Produit", href: "/portfolio#produit", imageUrl: "", description: "Packshots, lifestyle" },
                { label: "Portrait", href: "/portfolio#portrait", imageUrl: "", description: "Éditoriaux, marques" },
                { label: "Branding", href: "/portfolio#branding", imageUrl: "", description: "Logos, chartes visuelles" },
              ],
            },
          },
          {
            id: "cs-portfolio-gallery",
            type: "gallery",
            props: {
              heading: "Travaux",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Lookbook — collection prêt-à-porter" },
                { src: "", alt: "Campagne — marque cosmétique naturelle" },
                { src: "", alt: "Portrait — artiste plasticienne" },
                { src: "", alt: "Identité — restaurant fusion" },
                { src: "", alt: "Produit — packaging huiles capillaires" },
                { src: "", alt: "Editorial — magazine mode africain" },
                { src: "", alt: "Campagne — marque streetwear Dakar" },
                { src: "", alt: "Portrait — fondateur startup" },
                { src: "", alt: "Produit — bijoux artisanaux" },
                { src: "", alt: "Branding — école de design" },
                { src: "", alt: "Mode — shooting extérieur Dakar" },
                { src: "", alt: "Campagne — marque alimentaire" },
              ],
            },
          },
          footer("cs-footer-portfolio"),
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          nav("cs-nav-services"),
          {
            id: "cs-services-hero",
            type: "hero",
            props: {
              heading: "Ce qu'on fait",
              subheading: "De la conception à la livraison — production visuelle complète pour marques africaines ambitieuses.",
              buttonLabel: "Demander un devis",
              buttonHref: "/contact",
              align: "center",
              background: "#0D0D0D",
            },
          },
          {
            id: "cs-services-products",
            type: "products",
            props: {
              heading: "Nos offres",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "Demander un devis",
              items: [
                {
                  name: "Pack Contenu Social — 10 visuels",
                  description:
                    "10 visuels haute résolution — photos produit ou lifestyle. Shooting demi-journée, retouche incluse. Livraison 5 jours ouvrés.",
                  priceLabel: "À partir de 150 000 FCFA",
                  imageUrl: "",
                  whatsappMessage:
                    "Bonjour GRID STUDIO — je voudrais un devis pour le Pack Contenu Social (10 visuels). Voici mon activité :",
                },
                {
                  name: "Pack Lookbook — 20 photos",
                  description:
                    "20 photos lookbook — direction artistique complète, casting, styling sur demande. Idéal pour lancement collection.",
                  priceLabel: "À partir de 350 000 FCFA",
                  badge: "POPULAIRE",
                  imageUrl: "",
                  whatsappMessage:
                    "Bonjour GRID STUDIO — je voudrais un devis pour le Pack Lookbook (20 photos). Mon projet :",
                },
                {
                  name: "Identité Visuelle Complète",
                  description:
                    "Logo, palette couleurs, typographie, règles d'utilisation — livrable : PDF charte + fichiers sources vectoriels.",
                  priceLabel: "À partir de 250 000 FCFA",
                  imageUrl: "",
                  whatsappMessage:
                    "Bonjour GRID STUDIO — je voudrais un devis pour une identité visuelle complète. Ma marque :",
                },
                {
                  name: "Campagne Publicité Complète",
                  description:
                    "Concept créatif, direction artistique, production photo et vidéo — pour pub digitale ou affichage. Devis sur demande.",
                  priceLabel: "Devis sur demande",
                  imageUrl: "",
                  whatsappMessage:
                    "Bonjour GRID STUDIO — je voudrais discuter d'une campagne publicitaire. Mon brief :",
                },
              ],
            },
          },
          {
            id: "cs-process",
            type: "features",
            props: {
              heading: "Notre processus",
              items: [
                {
                  title: "1. Brief",
                  body: "On commence par comprendre votre marque, vos cibles et vos objectifs — appel WhatsApp ou réunion à Dakar.",
                },
                {
                  title: "2. Concept",
                  body: "Moodboard, direction artistique, planning de production — tout validé avec vous avant le tournage.",
                },
                {
                  title: "3. Production",
                  body: "Shooting en studio ou en extérieur — équipe légère, mobile, efficace. On vient à vous si besoin.",
                },
                {
                  title: "4. Livraison",
                  body: "Fichiers haute résolution via lien de téléchargement sécurisé — délai 5 à 10 jours selon le pack.",
                },
              ],
            },
          },
          footer("cs-footer-services"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("cs-nav-contact"),
          {
            id: "cs-contact-section",
            type: "contact",
            props: {
              heading: "Travaillons ensemble",
              email: "hello@gridstudio.example",
              phone: "+221770000000",
              address: "GRID STUDIO — Dakar, Sénégal · Déplacements Abidjan, Bamako sur projet",
            },
          },
          {
            id: "cs-contact-wa",
            type: "whatsapp",
            props: {
              label: "WhatsApp — décrire votre projet",
              phone: "+221770000000",
              message: "Bonjour GRID STUDIO — je voudrais démarrer un projet. Êtes-vous disponibles cette semaine ?",
            },
          },
          {
            id: "cs-contact-form",
            type: "form",
            props: {
              heading: "Demande de projet",
              subheading: "Décrivez votre projet — on vous répond sous 24h.",
              buttonLabel: "Envoyer le brief",
              successMessage: "Brief reçu — on vous répond sous 24h ouvrés.",
              fields: [
                { id: "nom", label: "Nom / raison sociale", type: "text", required: true, placeholder: "Votre nom ou marque", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "email", label: "Email", type: "email", required: false, placeholder: "votre@email.com", options: [] },
                {
                  id: "service",
                  label: "Type de projet",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Contenu social", "Lookbook / campagne mode", "Photographie produit", "Identité visuelle", "Direction artistique complète", "Autre"],
                },
                { id: "budget", label: "Budget indicatif", type: "text", required: false, placeholder: "Ex : 200 000 FCFA", options: [] },
                {
                  id: "brief",
                  label: "Brief / description du projet",
                  type: "textarea",
                  required: true,
                  placeholder: "Décrivez votre marque, vos objectifs, vos délais…",
                  options: [],
                },
              ],
            },
          },
          footer("cs-footer-contact"),
        ],
      },
    ],
  };
}
