import type { WebsiteDefinition } from "../website-schema";

/**
 * SAVEURS STUDIO — Photographe culinaire & food styling
 * Warm editorial: brun riche + or chaud + crème texturé
 * Lora (display) + Lato (body)
 * Photographie culinaire, food styling, marques alimentaires, Dakar
 */
export function photoCulinaireWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "SAVEURS STUDIO",
    theme: {
      primary: "#3B1F0A",
      accent: "#D4820A",
      background: "#FBF7F2",
      text: "#2A1606",
      surface: "#F3E9D9",
      fontDisplay: "Lora",
      fontBody: "Lato",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "soft",
      aestheticId: "warm-food-photography-editorial",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Photographe Culinaire · Dakar",
              heading: "La beauté\ndans chaque\nassiette.",
              subheading:
                "SAVEURS STUDIO capture l'essence de la cuisine africaine — saveurs, textures, couleurs. Photographies culinaires qui font saliver, vendre et raconter une histoire.",
              primaryCta: { label: "Voir le portfolio", href: "/portfolio" },
              secondaryCta: { label: "Demander un devis", href: "/contact" },
              backgroundImageUrl: "",
              overlay: 0.2,
              textAlign: "left",
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "PHOTOGRAPHIE CULINAIRE",
                "FOOD STYLING",
                "RESTAURANTS",
                "MARQUES ALIMENTAIRES",
                "RECETTES",
                "DAKAR",
                "ABIDJAN",
                "ÉDITION",
              ],
              speed: 30,
              background: "#3B1F0A",
              color: "#FBF7F2",
              separator: "·",
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Derniers travaux",
              layout: "featured",
              columns: 3,
              instagramHandle: "@saveursstudio.dk",
              followLabel: "Suivre notre travail",
              items: [
                { src: "", alt: "Thiéboudienne gastronomique — shooting restaurant Dakar" },
                { src: "", alt: "Desserts chocolat — marque pâtisserie" },
                { src: "", alt: "Épices africaines — shooting produit" },
                { src: "", alt: "Fruits tropicaux — marque jus naturel" },
                { src: "", alt: "Yassa poulet — chef cuisinier dakarois" },
                { src: "", alt: "Table dressée — restaurant fine dining" },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "Ce que nous faisons",
              layout: "grid",
              items: [
                {
                  icon: "📸",
                  title: "Photographie culinaire",
                  description:
                    "Photos de plats, packshots produits, shooting de cuisine — images haute résolution pour menus, e-commerce et presse.",
                },
                {
                  icon: "🎨",
                  title: "Food styling",
                  description:
                    "Composition, dressage, mise en scène — chaque plat est une œuvre. Votre food stylist intervient sur chaque shooting.",
                },
                {
                  icon: "📱",
                  title: "Contenu social",
                  description:
                    "Packs photos pour Instagram et TikTok — formats, ratios et esthétique adaptés aux plateformes.",
                },
                {
                  icon: "📖",
                  title: "Édition & recettes",
                  description:
                    "Shootings pour livres de cuisine, magazines gastronomiques et contenus éditoriaux.",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "À propos",
              heading: "Aïssata Diallo,\nphotographe culinaire.",
              body: "Née à Dakar, formée à l'École des Arts Visuels de Paris, Aïssata a passé 3 ans à photographier des cuisines gastronomiques en Europe avant de rentrer à Dakar en 2019. Aujourd'hui, SAVEURS STUDIO documente la richesse culinaire africaine — des plats de rue aux tables étoilées.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Notre portfolio", href: "/portfolio" },
            },
          },
          {
            type: "products",
            props: {
              heading: "Nos forfaits",
              subheading: "De l'image unique au contenu mensuel — des tarifs clairs.",
              columns: 3,
              items: [
                {
                  name: "Pack Social Media — 10 photos",
                  description:
                    "Demi-journée de shooting. 10 photos retouchées format Instagram. Idéal pour lancer une campagne ou un nouveau plat.",
                  priceLabel: "À partir de 120 000 FCFA",
                  imageUrl: "",
                  whatsappMessage:
                    "Bonjour SAVEURS STUDIO — je voudrais un devis pour le Pack Social Media (10 photos). Mon restaurant/marque :",
                },
                {
                  name: "Pack Restaurant — Carte complète",
                  description:
                    "Shooting complet de votre menu — 30 à 50 photos. Journée entière, food styling inclus. Livraison 7 jours ouvrés.",
                  priceLabel: "Sur devis",
                  imageUrl: "",
                  badge: "Populaire",
                  whatsappMessage:
                    "Bonjour SAVEURS STUDIO — je voudrais un devis pour photographier ma carte de restaurant. Mon établissement :",
                },
                {
                  name: "Pack Marque — Contenu mensuel",
                  description:
                    "30 photos/mois pour marque alimentaire ou restaurant. Shooting mensuel, calendrier éditorial, formats multi-réseaux.",
                  priceLabel: "À partir de 250 000 FCFA/mois",
                  imageUrl: "",
                  whatsappMessage:
                    "Bonjour SAVEURS STUDIO — je voudrais un devis pour le Pack Marque mensuel. Ma marque/activité :",
                },
                {
                  name: "Shooting Packshot Produit",
                  description:
                    "Photos produit sur fond blanc et ambiance — jus, épices, conserves, sauces. 20 produits minimum.",
                  priceLabel: "À partir de 80 000 FCFA",
                  imageUrl: "",
                  whatsappMessage:
                    "Bonjour SAVEURS STUDIO — je voudrais un devis pour photographier mes produits alimentaires.",
                },
              ],
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ils nous font confiance",
              items: [
                {
                  quote:
                    "SAVEURS STUDIO a transformé notre présence Instagram. Les photos sont magnifiques — les plats africains sont enfin présentés avec la beauté qu'ils méritent.",
                  author: "Moussa D.",
                  role: "Propriétaire, restaurant gastro Dakar",
                },
                {
                  quote:
                    "Aïssata comprend la cuisine africaine. Elle ne la 'westernise' pas — elle la sublime en restant authentique. C'est rare et précieux.",
                  author: "Ndéye F.",
                  role: "Fondatrice, marque épices sénégalaises",
                },
                {
                  quote:
                    "Notre livre de recettes illustré n'aurait pas pu exister sans SAVEURS STUDIO. 120 photos, 3 jours de shooting — travail impeccable.",
                  author: "Chef Amadou K.",
                  role: "Chef cuisinier, auteur culinaire",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Demander un devis",
              subheading:
                "Décrivez votre projet en quelques lignes. Réponse sous 24h.",
              phoneNumber: "221770000001",
              message:
                "Bonjour SAVEURS STUDIO — je voudrais un devis pour un shooting culinaire. Mon projet : [restaurant / marque alimentaire / livre / réseaux sociaux]. Nombre de plats/produits : [nombre]. Date souhaitée : [date].",
              buttonLabel: "Demander un devis — WhatsApp",
            },
          },
        ],
      },
      {
        slug: "portfolio",
        title: "Portfolio",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Portfolio",
              subheading: "Photographie culinaire, food styling, contenu marques — travaux sélectionnés.",
              buttonLabel: "Demander un devis",
              buttonHref: "/contact",
              align: "left",
              background: "#3B1F0A",
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Explorer par catégorie",
              columns: 4,
              items: [
                { label: "Restaurants", href: "/portfolio#restaurants", imageUrl: "", description: "Menus, ambiance" },
                { label: "Produits", href: "/portfolio#produits", imageUrl: "", description: "Packshots, lifestyle" },
                { label: "Recettes", href: "/portfolio#recettes", imageUrl: "", description: "Édition culinaire" },
                { label: "Social Media", href: "/portfolio#social", imageUrl: "", description: "Instagram, TikTok" },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Travaux",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Thiéboudienne — shooting gastronomique" },
                { src: "", alt: "Fruits tropicaux — marque jus Dakar" },
                { src: "", alt: "Yassa — chef restaurant Plateau" },
                { src: "", alt: "Épices africaines — shooting produit" },
                { src: "", alt: "Desserts chocolat — pâtisserie" },
                { src: "", alt: "Table dressée — restaurant Almadies" },
                { src: "", alt: "Mafé bœuf — food styling éditorial" },
                { src: "", alt: "Cocktails tropicaux — bar Dakar" },
                { src: "", alt: "Légumes du marché — marque bio" },
                { src: "", alt: "Pastels sénégalais — street food" },
                { src: "", alt: "Attiéké crevettes — restaurant ivoirien" },
                { src: "", alt: "Viennoiseries — boulangerie artisanale" },
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
              heading: "Travaillons ensemble",
              email: "hello@saveursstudio.sn",
              phone: "+221770000001",
              address: "SAVEURS STUDIO — Dakar, Sénégal · Déplacements Abidjan, Lomé sur projet",
            },
          },
          {
            type: "whatsapp",
            props: {
              label: "WhatsApp — décrire votre projet",
              phone: "+221770000001",
              message: "Bonjour SAVEURS STUDIO — je voudrais discuter d'un projet culinaire.",
            },
          },
          {
            type: "form",
            props: {
              heading: "Brief de projet",
              subheading: "Décrivez votre projet — on revient vers vous sous 24h.",
              buttonLabel: "Envoyer le brief",
              successMessage: "Brief reçu — on vous répond sous 24h ouvrés.",
              fields: [
                { id: "nom", label: "Nom / entreprise", type: "text", required: true, placeholder: "Votre nom ou restaurant", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "email", label: "Email", type: "email", required: false, placeholder: "votre@email.com", options: [] },
                {
                  id: "type",
                  label: "Type de projet",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Shooting restaurant / menu", "Contenu social media", "Packshots produits", "Livre de recettes", "Campagne marque alimentaire", "Autre"],
                },
                { id: "plats", label: "Nombre de plats / produits", type: "text", required: false, placeholder: "Ex : 20 plats", options: [] },
                { id: "brief", label: "Description du projet", type: "textarea", required: true, placeholder: "Décrivez votre cuisine, votre univers, vos objectifs…", options: [] },
              ],
            },
          },
        ],
      },
    ],
  };
}
