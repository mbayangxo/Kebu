import type { WebsiteDefinition } from "../website-schema";

/**
 * ÉCLAT STUDIO — Agence de communication & RP africaine
 * Minimal bold: blanc cassé + noir graphite + rouge coral pop
 * Playfair Display (display) + Inter (body)
 * Relations presse, brand strategy, influence & événementiel
 */
export function prAgencyWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "ÉCLAT STUDIO",
    theme: {
      primary: "#111111",
      accent: "#E84545",
      background: "#F8F6F3",
      text: "#111111",
      fontDisplay: "Playfair Display",
      fontBody: "Inter",
      radius: "sharp",
      spacing: "airy",
      headingScale: "md",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "bold-minimal-pr-agency",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Agence de communication & RP · Dakar",
              heading: "Votre marque\ndoit être\nracontée.",
              subheading:
                "Stratégie de marque, relations presse, influence et événementiel pour les entreprises africaines qui veulent s'imposer.",
              primaryCta: { label: "Nos services", href: "/services" },
              secondaryCta: { label: "Démarrer un projet", href: "https://wa.me/221755000000" },
              backgroundImageUrl: "",
              overlay: 0.5,
              textAlign: "left",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "120", suffix: "+", label: "Marques accompagnées" },
                { value: "850", suffix: "+", label: "Articles presse générés" },
                { value: "8 ans", label: "D'expertise" },
                { value: "14", label: "Pays couverts" },
              ],
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "Relations presse",
                "Brand strategy",
                "Influence marketing",
                "Événementiel",
                "Community management",
                "Media planning",
                "Lancement de marque",
                "Crisis management",
              ],
              speed: "normal",
              separator: "—",
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Ce que nous faisons",
              tiles: [
                {
                  label: "Relations Presse",
                  description: "Communiqués, dossiers de presse, conférences et placement médias",
                  imageUrl: "",
                  href: "/services",
                },
                {
                  label: "Brand Strategy",
                  description: "Positionnement, identité de marque et architecture éditoriale",
                  imageUrl: "",
                  href: "/services",
                },
                {
                  label: "Influence",
                  description: "Sélection et gestion de campagnes d'influence Afrique de l'Ouest",
                  imageUrl: "",
                  href: "/services",
                },
                {
                  label: "Événementiel",
                  description: "Lancement de produit, soirée presse, activation brand",
                  imageUrl: "",
                  href: "/services",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Notre différence",
              heading: "Le réseau africain qui fait la différence.",
              body: "ÉCLAT STUDIO dispose du réseau journalistique et d'influence le plus dense d'Afrique de l'Ouest. Nos relations dans la presse nationale, régionale et internationale, combinées à un carnet d'influenceurs soigneusement sélectionnés, donnent à vos messages une portée réelle.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Nos références", href: "/references" },
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ils nous font confiance",
              items: [
                {
                  quote:
                    "ÉCLAT a transformé notre lancement de marque. En 3 mois, nous avons eu 40 articles presse et 12 placements TV. Résultats au-delà de nos attentes.",
                  author: "Directrice Marketing",
                  role: "Marque cosmétiques, Dakar",
                },
                {
                  quote:
                    "La campagne d'influence pour notre application a généré 25 000 téléchargements en une semaine. ÉCLAT sait choisir les bons profils.",
                  author: "CEO",
                  role: "FinTech sénégalaise",
                },
                {
                  quote:
                    "Notre soirée de lancement organisée par ÉCLAT était parfaite. Presse, influenceurs, décoration, timing — tout était impeccable.",
                  author: "Fondatrice",
                  role: "Marque fashion Abidjan",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Parler de votre projet",
              subheading:
                "Brief gratuit et confidentiel. Nous vous présentons une proposition sous 48h.",
              phoneNumber: "221755000000",
              message:
                "Bonjour ÉCLAT STUDIO, je souhaite discuter d'un projet de communication pour [ma marque / mon lancement / mon événement]. Secteur : [votre secteur]. Merci.",
              buttonLabel: "Nous contacter",
            },
          },
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Nos services",
              subheading: "De la stratégie à l'exécution. Tout sous un même toit.",
              backgroundImageUrl: "",
              overlay: 0.55,
            },
          },
          {
            type: "features",
            props: {
              heading: "Relations Presse & Médias",
              layout: "horizontal",
              items: [
                {
                  icon: "📰",
                  title: "Communiqués de presse",
                  description: "Rédaction et diffusion aux médias ciblés selon votre secteur et audience.",
                },
                {
                  icon: "🎙️",
                  title: "Conférence de presse",
                  description: "Organisation complète : lieu, invitations, dossier de presse, revue de presse.",
                },
                {
                  icon: "📺",
                  title: "Placement TV & Radio",
                  description: "Interviews, reportages et émissions sur RTS, TFM, 2STV et radios nationales.",
                },
                {
                  icon: "🌍",
                  title: "Couverture internationale",
                  description: "Placement dans Jeune Afrique, RFI, Le Monde Afrique et médias diaspora.",
                },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "Influence & Digital",
              layout: "grid",
              items: [
                { icon: "📱", title: "Influence Afrique", description: "Sélection rigoureuse d'influenceurs authentiques par secteur." },
                { icon: "📊", title: "Community Management", description: "Gestion quotidienne de vos réseaux sociaux avec reporting mensuel." },
                { icon: "🎯", title: "Media Planning", description: "Achat d'espace publicitaire digital et print avec optimisation ROI." },
                { icon: "⚡", title: "Crisis Management", description: "Cellule de crise disponible 24h/24. Réponse rapide et stratégique." },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Nos forfaits",
              subheading: "Tarifs mensuels. Engagement minimum 3 mois. Devis sur-mesure disponible.",
              columns: 3,
              items: [
                {
                  name: "Starter",
                  description:
                    "1 communiqué/mois, diffusion 50 médias, community management 2 réseaux, rapport mensuel.",
                  price: 350000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Démarrer",
                  ctaHref: "https://wa.me/221755000000",
                },
                {
                  name: "Growth",
                  description:
                    "2 communiqués/mois, placement TV/radio inclus, 1 campagne influence/trimestre, reporting hebdo.",
                  price: 750000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Recommandé",
                  ctaLabel: "Démarrer",
                  ctaHref: "https://wa.me/221755000000",
                },
                {
                  name: "Full Service",
                  description:
                    "RP complètes, influence mensuelle, community management, media planning, accès cellule de crise.",
                  price: 1500000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221755000000",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "references",
        title: "Références",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Nos références",
              subheading:
                "120+ marques accompagnées dans 14 pays africains. Beauté, tech, mode, finance et bien-être.",
              backgroundImageUrl: "",
              overlay: 0.5,
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Par secteur",
              tiles: [
                { label: "Beauté & Mode", description: "Lancements de marque, lookbooks, campagnes influence", imageUrl: "", href: "/references" },
                { label: "Tech & Finance", description: "FinTech, applications, e-commerce", imageUrl: "", href: "/references" },
                { label: "FMCG & Food", description: "Grandes marques de consommation", imageUrl: "", href: "/references" },
                { label: "Institutionnel", description: "ONG, institutions, ambassades", imageUrl: "", href: "/references" },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Activations récentes",
              layout: "masonry",
              images: [
                { url: "", alt: "Soirée lancement marque cosmétiques" },
                { url: "", alt: "Conférence de presse tech" },
                { url: "", alt: "Activation mode Dakar Fashion Week" },
                { url: "", alt: "Campagne influence beauté" },
                { url: "", alt: "Press trip voyage" },
                { url: "", alt: "Soirée VIP marque premium" },
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
            type: "contact",
            props: {
              heading: "Notre bureau",
              subheading: "Rendez-vous sur rendez-vous. Brief téléphonique gratuit disponible.",
              address: "ÉCLAT STUDIO — Almadies, Dakar, Sénégal",
              phone: "+221 75 500 00 00",
              email: "hello@eclatstudio.sn",
              mapEmbedUrl: "",
            },
          },
          {
            type: "form",
            props: {
              heading: "Brief projet",
              subheading: "Remplissez ce formulaire et nous vous rappelons sous 24h.",
              submitLabel: "Envoyer le brief",
              fields: [
                { name: "nom", label: "Nom & prénom", type: "text", required: true },
                { name: "entreprise", label: "Entreprise / Marque", type: "text", required: true },
                { name: "telephone", label: "Téléphone", type: "tel", required: true },
                { name: "email", label: "Email professionnel", type: "email", required: true },
                {
                  name: "service",
                  label: "Service recherché",
                  type: "select",
                  required: true,
                  options: [
                    { value: "rp", label: "Relations presse" },
                    { value: "influence", label: "Influence marketing" },
                    { value: "evenement", label: "Événementiel" },
                    { value: "strategie", label: "Brand strategy" },
                    { value: "digital", label: "Community management" },
                    { value: "complet", label: "Full service" },
                  ],
                },
                { name: "budget", label: "Budget mensuel estimé (FCFA)", type: "text", required: false },
                { name: "message", label: "Décrivez votre projet", type: "textarea", required: true },
              ],
            },
          },
        ],
      },
    ],
  };
}
