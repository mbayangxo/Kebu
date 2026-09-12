import type { WebsiteDefinition } from "../website-schema";

/**
 * DAKAR FILMS — Agence de production vidéo
 * Dark cinematic: bleu nuit profond + rouge vif + blanc
 * Bebas Neue (display) + Inter (body)
 * Production publicitaire, clips musicaux, documentaires, corporate
 */
export function videoProductionWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "DAKAR FILMS",
    theme: {
      primary: "#0A0E1A",
      accent: "#E8232A",
      background: "#0A0E1A",
      text: "#FFFFFF",
      surface: "#141824",
      fontDisplay: "Bebas Neue",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      radius: "sharp",
      aestheticId: "dark-cinematic-video-production",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Production Vidéo · Dakar, Sénégal",
              heading: "On raconte\nvotre histoire\nen images.",
              subheading:
                "Publicités TV, clips musicaux, documentaires et films corporate. DAKAR FILMS — 8 ans d'expérience, 200+ productions livrées en Afrique de l'Ouest.",
              primaryCta: { label: "Voir nos productions", href: "/productions" },
              secondaryCta: { label: "Demander un devis", href: "https://wa.me/221770000000" },
              backgroundImageUrl: "",
              overlay: 0.75,
              textAlign: "left",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "200", suffix: "+", label: "Productions livrées" },
                { value: "8", label: "Ans d'expérience" },
                { value: "15", label: "Pays couverts" },
                { value: "4.9", prefix: "★", label: "Note clients" },
              ],
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "Publicité TV",
                "Clips Musicaux",
                "Documentaires",
                "Corporate",
                "Réseaux Sociaux",
                "Événements",
                "Motion Design",
                "Drone",
              ],
              speed: "normal",
              separator: "·",
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Nos spécialités",
              tiles: [
                {
                  label: "Publicité & Marques",
                  description: "Spots TV, campagnes digitales, films institutionnels",
                  imageUrl: "",
                  href: "/productions",
                },
                {
                  label: "Musique & Culture",
                  description: "Clips musicaux, documentaires artistiques, concerts",
                  imageUrl: "",
                  href: "/productions",
                },
                {
                  label: "Corporate & Formation",
                  description: "Films d'entreprise, témoignages, e-learning",
                  imageUrl: "",
                  href: "/productions",
                },
                {
                  label: "Drone & Aérien",
                  description: "Prises de vue aériennes, couverture événementielle",
                  imageUrl: "",
                  href: "/productions",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Nos productions",
              layout: "masonry",
              images: [
                { url: "", alt: "Spot publicitaire Orange Sénégal" },
                { url: "", alt: "Clip musical artiste afrobeat" },
                { url: "", alt: "Documentaire diaspora africaine" },
                { url: "", alt: "Film corporate entreprise minière" },
                { url: "", alt: "Vue aérienne Dakar au crépuscule" },
                { url: "", alt: "Tournage plateau studio" },
              ],
              instagramHandle: "@dakarfilms",
              followLabel: "Suivre sur Instagram",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ils nous font confiance",
              items: [
                {
                  quote:
                    "DAKAR FILMS a produit notre campagne TV en 3 semaines. Qualité internationale, équipe réactive et budget respecté. Notre spot a été diffusé dans 5 pays.",
                  author: "Directeur Marketing",
                  role: "Groupe Ecobank Sénégal",
                },
                {
                  quote:
                    "Le clip de mon album a explosé avec 2 millions de vues en une semaine. La vision artistique de DAKAR FILMS a transcendé ce que j'imaginais.",
                  author: "Sidy Diallo",
                  role: "Artiste, Dakar",
                },
                {
                  quote:
                    "Leur équipe drone a capturé nos chantiers sous des angles impossibles. Le film de présentation a conquis nos investisseurs.",
                  author: "Ibrahim Sylla",
                  role: "Directeur, Groupe Immobilier Prestige",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Démarrer votre projet",
              subheading:
                "Décrivez votre idée, votre budget et votre date cible. Devis sous 24h, sans engagement.",
              phoneNumber: "221770000000",
              message:
                "Bonjour DAKAR FILMS, je souhaite produire [type de vidéo : publicité / clip / corporate / documentaire] pour [marque / artiste / entreprise]. Budget indicatif : [montant] FCFA. Date souhaitée : [date]. Merci.",
              buttonLabel: "Demander un devis",
            },
          },
        ],
      },
      {
        slug: "productions",
        title: "Productions",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Nos productions",
              subheading: "200+ films livrés. Publicité, musique, corporate, documentaire.",
              backgroundImageUrl: "",
              overlay: 0.7,
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Par genre",
              tiles: [
                { label: "Publicité", description: "Spots TV et digital", imageUrl: "", href: "/productions" },
                { label: "Musique", description: "Clips et live sessions", imageUrl: "", href: "/productions" },
                { label: "Corporate", description: "Films d'entreprise", imageUrl: "", href: "/productions" },
                { label: "Documentaire", description: "Court et long métrages", imageUrl: "", href: "/productions" },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "",
              layout: "masonry",
              images: [
                { url: "", alt: "Production 1" },
                { url: "", alt: "Production 2" },
                { url: "", alt: "Production 3" },
                { url: "", alt: "Production 4" },
                { url: "", alt: "Production 5" },
                { url: "", alt: "Production 6" },
                { url: "", alt: "Production 7" },
                { url: "", alt: "Production 8" },
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
            type: "features",
            props: {
              heading: "Notre processus de production",
              layout: "horizontal",
              items: [
                { icon: "💡", title: "1. Brief créatif", description: "Échange sur votre vision, cible et objectifs. Moodboard et proposition créative sous 48h." },
                { icon: "📝", title: "2. Développement", description: "Écriture du script, storyboard, casting, repérage des lieux. Validation avant tournage." },
                { icon: "🎬", title: "3. Tournage", description: "Équipe full-service : réalisateur, cadreurs, son, lumière, drone. Studio ou extérieur." },
                { icon: "🎞️", title: "4. Post-production", description: "Montage, étalonnage couleurs, sound design, motion graphics, effets spéciaux." },
                { icon: "📦", title: "5. Livraison", description: "Formats optimisés TV, web, réseaux sociaux. Archives HD livrées en bonus." },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Forfaits",
              subheading: "Tarifs indicatifs. Devis précis après brief. Acompte 30% à la commande.",
              columns: 3,
              items: [
                {
                  name: "Vidéo Réseaux Sociaux",
                  description:
                    "1 minute optimisée Instagram/TikTok/Facebook. Tournage ½ journée, montage, sous-titres.",
                  price: 350000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221770000000",
                },
                {
                  name: "Film Corporate",
                  description:
                    "Film institutionnel 3–5 min. Journée de tournage, interviews, drone, montage et motion design.",
                  price: 1200000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Populaire",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221770000000",
                },
                {
                  name: "Spot Publicitaire TV",
                  description:
                    "30 secondes prêt à diffusion. Script, casting, journée de tournage, post-prod complète.",
                  price: 2500000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221770000000",
                },
                {
                  name: "Clip Musical",
                  description:
                    "Clip professionnel 3–4 min. Réalisation créative, locations multiples, étalonnage cinéma.",
                  price: 800000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221770000000",
                },
                {
                  name: "Couverture Événement",
                  description:
                    "Journée complète événement (conférence, lancement, cérémonie). Teaser 1 min livré J+2.",
                  price: 600000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221770000000",
                },
                {
                  name: "Documentaire",
                  description:
                    "Court métrage documentaire 20–40 min. Développement complet, tournage multi-jours, festival-ready.",
                  price: 4500000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Sur mesure",
                  ctaLabel: "En discuter",
                  ctaHref: "https://wa.me/221770000000",
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
                  question: "Quel est le délai moyen pour une production ?",
                  answer:
                    "Une vidéo réseaux sociaux : 1 semaine. Un film corporate : 2–3 semaines. Un spot TV : 3–4 semaines. Un documentaire : 2–6 mois selon l'ampleur. Nous pouvons accélérer pour les urgences.",
                },
                {
                  question: "Intervenez-vous hors Dakar ?",
                  answer:
                    "Oui, nous avons tourné au Sénégal, Côte d'Ivoire, Mali, Cameroun et France. Des frais de déplacement s'ajoutent selon la destination.",
                },
                {
                  question: "Fournissez-vous les acteurs et modèles ?",
                  answer:
                    "Oui, nous disposons d'un réseau de comédiens, mannequins et voix off professionnels à Dakar. Casting inclus dans les forfaits Corporate et TV.",
                },
                {
                  question: "Quels formats livrez-vous ?",
                  answer:
                    "Formats adaptés à chaque usage : 16:9 (TV/YouTube), 9:16 (Reels/TikTok), 1:1 (Instagram), 4:3. Fichiers ProRes, H.264 et H.265 selon besoin.",
                },
              ],
              contactPanel: {
                heading: "Un projet en tête ?",
                body: "Brief gratuit, devis sous 24h, sans engagement.",
                ctaLabel: "Parler de votre projet",
                ctaHref: "https://wa.me/221770000000",
              },
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
              heading: "Notre studio",
              subheading: "Studio équipé à Dakar. Tournage en intérieur et extérieur.",
              address: "DAKAR FILMS — Liberté 6, Dakar, Sénégal",
              phone: "+221 77 000 00 00",
              email: "bonjour@dakarfilms.sn",
              mapEmbedUrl: "",
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Demander un devis",
              subheading: "Décrivez votre projet en quelques lignes. Réponse sous 2h en semaine.",
              phoneNumber: "221770000000",
              message: "Bonjour DAKAR FILMS, je voudrais discuter d'un projet de production vidéo.",
              buttonLabel: "Nous écrire",
            },
          },
        ],
      },
    ],
  };
}
