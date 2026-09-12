import type { WebsiteDefinition } from "../website-schema";

/**
 * KORA SPORT — Marque sportswear performance africaine
 * Bold performance: noir technique + vert électrique + blanc
 * Space Grotesk (display) + Inter (body)
 * Vêtements sport, running, gym, Dakar
 */
export function sportswearWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "KORA SPORT",
    theme: {
      primary: "#0A1A0F",
      accent: "#39D353",
      background: "#F0F2F0",
      text: "#0A1A0F",
      surface: "#E2E8E3",
      fontDisplay: "Space Grotesk",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "tight",
      radius: "soft",
      aestheticId: "bold-performance-african-sportswear",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "⚡ NOUVELLE COLLECTION RUNNING — Tissus techniques respirants · Livraison Dakar 24h",
              background: "#39D353",
              color: "#0A1A0F",
              linkText: "VOIR",
              linkUrl: "/collection",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Sportswear Performance · Dakar",
              heading: "FAIT POUR\nBOUGER.\nFAIT POUR\nGAGNER.",
              subheading:
                "KORA SPORT crée des vêtements de sport techniques pour les athlètes africains — running, gym, football, entraînement. Performance, durabilité, style africain.",
              primaryCta: { label: "Shop la collection", href: "/collection" },
              secondaryCta: { label: "Nos sports", href: "/sports" },
              backgroundImageUrl: "",
              overlay: 0.6,
              textAlign: "left",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              background: "#0A1A0F",
              items: [
                { value: "1 500", suffix: "+", label: "Athlètes équipés" },
                { value: "8", label: "Disciplines" },
                { value: "2", label: "Ans de R&D" },
                { value: "100%", label: "Fait Dakar" },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Collection actuelle",
              subheading: "Tissus techniques, coupes performance — pour l'entraînement africain.",
              columns: 3,
              items: [
                {
                  name: "Maillot Running Respirant",
                  description:
                    "Polyester technique 140g, mesh respirant, coutures plates anti-frottement. Réfléchissant arrière. S-XXL.",
                  price: 18500,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Running",
                  filterTags: ["Running", "Hauts"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
                {
                  name: "Short Gym 2-en-1",
                  description:
                    "Short entraînement avec cuissard intégré. Polyester stretch, poches zippées. Noir ou vert électrique.",
                  price: 22000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Gym",
                  filterTags: ["Gym", "Shorts"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
                {
                  name: "Legging Compression Femme",
                  description:
                    "Compression légère, taille haute, tissu opaque anti-UV. Noir ou vert électrique. XS-XL.",
                  price: 28000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Femme",
                  filterTags: ["Gym", "Femme", "Leggings"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
                {
                  name: "Veste Training Zip",
                  description:
                    "Veste légère zip intégral, poches zippées, capuche rangeable. Parfait pour les matins de course. S-XXL.",
                  price: 38000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Running", "Vestes"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
                {
                  name: "Maillot Football KORA",
                  description:
                    "Maillot foot technique, mesh aéré, sublimation couleur. Personnalisable nom/numéro. S-XXL.",
                  price: 16000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Football",
                  filterTags: ["Football", "Hauts"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
                {
                  name: "Pack Entraînement (3 pcs)",
                  description:
                    "Maillot + short + chaussettes techniques KORA. Combo complet pour l'entraînement quotidien.",
                  price: 52000,
                  currency: "FCFA",
                  badge: "Économie",
                  imageUrl: "",
                  filterTags: ["Packs", "Gym"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "La technologie KORA",
              layout: "grid",
              items: [
                {
                  icon: "💨",
                  title: "Tissus techniques respirants",
                  description:
                    "Polyester technique DryFit africain — évacuation rapide de la transpiration, séchage ultra-rapide pour l'entraînement intense.",
                },
                {
                  icon: "🌡️",
                  title: "Conçu pour le climat africain",
                  description:
                    "Nos tissus sont testés à Dakar par 35°C. Plus légers et respirants que les marques européennes conçues pour des températures tempérées.",
                },
                {
                  icon: "💪",
                  title: "Coupes performance",
                  description:
                    "Coupés pour la morphologie et la mobilité — pas des adaptations de patterns européens. Chaque vêtement suit le mouvement.",
                },
                {
                  icon: "🔄",
                  title: "Durabilité renforcée",
                  description:
                    "Coutures renforcées aux points de tension, tissu anti-boulochage, couleurs résistantes au lavage. Pour l'entraînement intensif.",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Athlètes KORA",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Running Dakar — maillot KORA" },
                { src: "", alt: "Gym session — legging compression femme" },
                { src: "", alt: "Football entraînement — maillot KORA" },
                { src: "", alt: "Collection veste training — détail" },
                { src: "", alt: "Pack entraînement — flat lay" },
                { src: "", alt: "Athlète KORA — plein air Dakar" },
              ],
              instagramHandle: "@korasport.dk",
              followLabel: "Rejoindre la communauté",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "La communauté KORA",
              items: [
                {
                  quote:
                    "Je cours 50km par semaine à Dakar. Les maillots KORA sont les seuls que je porte maintenant — légèreté, respirabilité, durabilité. Aucune autre marque à ce prix ne fait pareil sous notre soleil.",
                  author: "Alioune D.",
                  role: "Coureur, Dakar Marathon",
                },
                {
                  quote:
                    "Le legging compression femme est parfait — taille haute stable, tissu opaque, coupe qui suit les mouvements. J'entraîne mes clientes avec ça, elles veulent toutes la référence.",
                  author: "Coach Fatou B.",
                  role: "Coach fitness, Dakar",
                },
                {
                  quote:
                    "On a équipé toute notre équipe de football en maillots KORA personnalisés. Qualité supérieure, livraison rapide, et la personnalisation nom/numéro est parfaite.",
                  author: "Capitaine Cheikh S.",
                  role: "Football amateur, Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Commander ou équiper votre équipe",
              subheading:
                "Commande individuelle ou équipement d'équipe — on s'adapte à votre besoin.",
              phoneNumber: "221770000005",
              message:
                "Bonjour KORA SPORT — je voudrais commander. Ce que je cherche : [running / gym / football / pack]. Ma taille : [taille]. Pour une équipe : [nombre de personnes / sport / personnalisation souhaitée].",
              buttonLabel: "Commander sur WhatsApp",
            },
          },
        ],
      },
      {
        slug: "collection",
        title: "Collection",
        sections: [
          {
            type: "hero",
            props: {
              heading: "COLLECTION",
              subheading: "Running, gym, football, entraînement — techniques et durables.",
              backgroundImageUrl: "",
              overlay: 0.65,
            },
          },
          {
            type: "products",
            props: {
              heading: "Tous les produits",
              columns: 3,
              items: [
                {
                  name: "Maillot Running Respirant",
                  description: "Polyester DryFit 140g, mesh, coutures plates.",
                  price: 18500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Running", "Hauts"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
                {
                  name: "Short Running Léger",
                  description: "Short polyester ultra-léger, poche zip, doublé.",
                  price: 16000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Running", "Shorts"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
                {
                  name: "Veste Training Zip",
                  description: "Légère, capuche rangeable, poches. Pour le matin.",
                  price: 38000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Running", "Vestes"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
                {
                  name: "T-Shirt Gym Technique",
                  description: "Coton-polyester blend, coupe ajustée gym.",
                  price: 15000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Gym", "Hauts"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
                {
                  name: "Short Gym 2-en-1",
                  description: "Cuissard intégré, stretch, poches zippées.",
                  price: 22000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Gym", "Shorts"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
                {
                  name: "Legging Compression Femme",
                  description: "Taille haute, anti-UV, tissu opaque. XS-XL.",
                  price: 28000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Gym", "Femme"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
                {
                  name: "Brassière Sport Femme",
                  description: "Maintien moyen, mesh respirant, dos ouvert.",
                  price: 18000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Gym", "Femme"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
                {
                  name: "Maillot Football KORA",
                  description: "Sublimation, mesh aéré, personnalisable.",
                  price: 16000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Football"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
                {
                  name: "Pack Entraînement Complet",
                  description: "Maillot + short + chaussettes techniques.",
                  price: 52000,
                  currency: "FCFA",
                  badge: "Économie -15%",
                  imageUrl: "",
                  filterTags: ["Packs"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000005",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "sports",
        title: "Sports",
        sections: [
          {
            type: "features",
            props: {
              heading: "Nos disciplines",
              layout: "grid",
              items: [
                { icon: "🏃", title: "Running", description: "Maillots et shorts techniques pour la course à pied et les marathons." },
                { icon: "🏋️", title: "Gym & Fitness", description: "Tenues de salle — compression, stretch, respirant pour l'entraînement intensif." },
                { icon: "⚽", title: "Football", description: "Maillots personnalisables pour équipes amateurs et académies." },
                { icon: "🏊", title: "Natation", description: "Maillots de bain techniques et vêtements de plage performance." },
                { icon: "🏀", title: "Basketball", description: "Shorts et maillots larges pour le jeu en salle et en extérieur." },
                { icon: "🥊", title: "Arts martiaux", description: "Shorts et t-shirts techniques pour la boxe, le judo et les arts martiaux." },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Équiper votre équipe",
              subheading: "Pack équipe à partir de 10 pièces — personnalisation et tarifs réduits.",
              phoneNumber: "221770000005",
              message: "Bonjour KORA SPORT — je veux équiper mon équipe. Sport : [sport]. Nombre de joueurs : [nombre]. Personnalisation : [nom + numéro / logo / couleurs équipe]. Budget approximatif :",
              buttonLabel: "Demander un devis équipe",
            },
          },
        ],
      },
    ],
  };
}
