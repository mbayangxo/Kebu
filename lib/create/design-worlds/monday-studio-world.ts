import type { WebsiteDefinition } from "../website-schema";

/**
 * MONDAY CRÉATIF — Agence créative & studio de production
 * Bold pop: jaune électrique + noir intense + blanc pur
 * Space Grotesk (display) + DM Sans (body)
 * Direction artistique, branding, motion, content création
 */
export function mondayStudioWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "MONDAY CRÉATIF",
    theme: {
      primary: "#0A0A0A",
      accent: "#F5E014",
      background: "#FAFAFA",
      text: "#0A0A0A",
      surface: "#F5E014",
      fontDisplay: "Space Grotesk",
      fontBody: "DM Sans",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "tight",
      radius: "sharp",
      aestheticId: "bold-pop-creative-studio",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Agence Créative · Dakar",
              heading: "On fait les\nchoses qui\nmarquent.",
              subheading:
                "MONDAY CRÉATIF est une agence de création basée à Dakar. Branding, direction artistique, motion design, content création et stratégie digitale pour des marques africaines qui veulent faire du bruit.",
              primaryCta: { label: "Voir nos projets", href: "/travaux" },
              secondaryCta: { label: "Travailler avec nous", href: "https://wa.me/221710000000" },
              backgroundImageUrl: "",
              overlay: 0.0,
              textAlign: "left",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "150", suffix: "+", label: "Projets réalisés" },
                { value: "60", suffix: "+", label: "Clients actifs" },
                { value: "6", label: "Ans d'existence" },
                { value: "12", label: "Créatifs dans l'équipe" },
              ],
              background: "#F5E014",
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "Branding",
                "Direction Artistique",
                "Motion Design",
                "Content Création",
                "Stratégie Digitale",
                "UI/UX Design",
                "Identité Visuelle",
                "Packaging",
              ],
              speed: "fast",
              separator: "★",
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Ce qu'on fait",
              tiles: [
                {
                  label: "Brand Identity",
                  description: "Logo, charte, brandbook, ton de voix",
                  imageUrl: "",
                  href: "/travaux",
                },
                {
                  label: "Motion & Vidéo",
                  description: "Motion design, reels, animations, contenus réseaux sociaux",
                  imageUrl: "",
                  href: "/travaux",
                },
                {
                  label: "Digital & Web",
                  description: "Sites web, landing pages, campagnes digitales, social media",
                  imageUrl: "",
                  href: "/travaux",
                },
                {
                  label: "Campagnes",
                  description: "Direction artistique de campagnes publicitaires 360°",
                  imageUrl: "",
                  href: "/travaux",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Sélection de travaux",
              layout: "masonry",
              images: [
                { url: "", alt: "Identité visuelle marque de mode africaine" },
                { url: "", alt: "Motion design campaign FMCG" },
                { url: "", alt: "Branding startup FinTech" },
                { url: "", alt: "Packaging produits naturels" },
                { url: "", alt: "Campagne réseaux sociaux" },
                { url: "", alt: "Site web e-commerce luxe" },
              ],
              instagramHandle: "@mondaycréatif",
              followLabel: "Suivre le studio",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ce que disent nos clients",
              items: [
                {
                  quote:
                    "MONDAY a rebrandé notre entreprise de A à Z. Résultat : une identité moderne, distinctive, qui nous distingue de tous nos concurrents. Notre chiffre d'affaires a augmenté de 35% depuis le relancement.",
                  author: "DG, groupe agroalimentaire",
                  role: "Dakar, 2024",
                },
                {
                  quote:
                    "L'équipe comprend le marché africain ET les standards créatifs internationaux. Rares sont les agences capables de cette double maîtrise.",
                  author: "Directrice Marketing",
                  role: "Opérateur télécoms Sénégal",
                },
                {
                  quote:
                    "Notre lancement de produit a généré 500K vues en 48h grâce à leur campagne. Brief le lundi, contenu le mercredi, live le vendredi.",
                  author: "Fondateur, startup consumer tech",
                  role: "Dakar-Paris",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Parlons de votre projet",
              subheading:
                "Décrivez votre projet, votre cible et votre budget. Brief gratuit, réponse sous 24h.",
              phoneNumber: "221710000000",
              message:
                "Bonjour MONDAY CRÉATIF, je voudrais discuter d'un projet de [branding / motion / digital / campagne] pour [marque / produit]. Budget indicatif : [montant] FCFA.",
              buttonLabel: "Démarrer le projet",
            },
          },
        ],
      },
      {
        slug: "travaux",
        title: "Travaux",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Nos travaux",
              subheading: "150+ projets. Branding, motion, digital, campagnes.",
              backgroundImageUrl: "",
              overlay: 0.0,
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Par discipline",
              tiles: [
                { label: "Brand Identity", description: "Logos, chartes, brandbooks", imageUrl: "", href: "/travaux" },
                { label: "Motion & Vidéo", description: "Animations, reels, motion graphics", imageUrl: "", href: "/travaux" },
                { label: "Digital", description: "Web, social, campagnes", imageUrl: "", href: "/travaux" },
                { label: "Packaging", description: "Packaging, PLV, print", imageUrl: "", href: "/travaux" },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "",
              layout: "masonry",
              images: [
                { url: "", alt: "Projet brand 1" },
                { url: "", alt: "Projet motion 1" },
                { url: "", alt: "Projet digital 1" },
                { url: "", alt: "Projet packaging 1" },
                { url: "", alt: "Projet campagne 1" },
                { url: "", alt: "Projet brand 2" },
                { url: "", alt: "Projet motion 2" },
                { url: "", alt: "Projet digital 2" },
              ],
            },
          },
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          {
            type: "products",
            props: {
              heading: "Ce qu'on peut faire pour vous",
              subheading: "Forfaits à titre indicatif. Devis précis après brief.",
              columns: 3,
              items: [
                {
                  name: "Brand Identity complète",
                  description:
                    "Logo, palette, typographie, ton de voix, brandbook + déclinaisons.",
                  price: 750000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221710000000",
                },
                {
                  name: "Content mensuel",
                  description:
                    "12 publications/mois (photo, vidéo, copy) pour vos réseaux sociaux.",
                  price: 350000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Récurrent",
                  ctaLabel: "Démarrer",
                  ctaHref: "https://wa.me/221710000000",
                },
                {
                  name: "Site web complet",
                  description:
                    "Design + développement Webflow. 5–10 pages responsive, animations, SEO on-page.",
                  price: 900000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221710000000",
                },
                {
                  name: "Motion design",
                  description:
                    "Animation logo, explainer vidéo, motion reel. Livraison 5–15 jours.",
                  price: 450000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221710000000",
                },
                {
                  name: "Campagne de lancement",
                  description:
                    "Direction artistique complète : visuels, vidéo, copy. Lancement produit ou marque.",
                  price: 1500000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Populaire",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221710000000",
                },
                {
                  name: "Audit de marque",
                  description:
                    "Analyse positionnement, identité et communication. Recommandations + plan d'action.",
                  price: 300000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "1ère étape",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221710000000",
                },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Quel est votre délai moyen ?",
                  answer:
                    "Brand identity complète : 3–4 semaines. Site web : 4–6 semaines. Campagne de lancement : 2–3 semaines selon le scope.",
                },
                {
                  question: "Travaillez-vous avec de petites structures ?",
                  answer:
                    "Oui. Nous avons des forfaits adaptés aux startups et aux indépendants. Budget minimum recommandé : 200 000 FCFA.",
                },
                {
                  question: "Intervenez-vous hors Sénégal ?",
                  answer:
                    "Oui, régulièrement en Côte d'Ivoire, Mali, France. Nous travaillons en remote pour tous pays.",
                },
              ],
              contactPanel: {
                heading: "Prêt à créer ?",
                body: "Brief en 10 min, devis sous 24h.",
                ctaLabel: "Nous contacter",
                ctaHref: "https://wa.me/221710000000",
              },
            },
          },
        ],
      },
      {
        slug: "studio",
        title: "Le studio",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "MONDAY CRÉATIF",
              heading: "Une agence africaine\npour le marché mondial.",
              body: "Fondée à Dakar en 2018 par Oumar Diagne et Sarah Mendy, MONDAY CRÉATIF s'est imposé comme l'une des agences créatives les plus actives d'Afrique de l'Ouest. 12 créatifs pluridisciplinaires, une conviction : les marques africaines méritent un niveau de création qui rivalise avec les meilleures agences mondiales.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Travailler avec nous", href: "https://wa.me/221710000000" },
            },
          },
          {
            type: "contact",
            props: {
              heading: "Le studio",
              subheading: "Ouvert lundi–vendredi 9h–18h. Pitch sur rendez-vous.",
              address: "MONDAY CRÉATIF — Sacré-Cœur 3, Dakar, Sénégal",
              phone: "+221 71 000 00 00",
              email: "bonjour@monday-creatif.sn",
              mapEmbedUrl: "",
            },
          },
        ],
      },
    ],
  };
}
