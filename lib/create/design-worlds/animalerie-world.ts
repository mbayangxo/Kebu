import type { WebsiteDefinition } from "../website-schema";

/**
 * BAMBA PET — Animalerie en ligne Dakar
 * Warm playful: vert fougère + orange mandarine + crème naturelle
 * Nunito (display) + Inter (body)
 * Animaux domestiques, accessoires, vétérinaire, livraison Dakar
 */
export function animalerieWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: 1,
    title: "BAMBA PET",
    theme: {
      primary: "#1D4A2A",
      accent: "#F4752C",
      background: "#FDFAF4",
      text: "#1A2A1D",
      fontHeading: "Nunito",
      fontBody: "Inter",
      borderRadius: "lg",
      spacing: "comfortable",
      aestheticId: "playful-pet-store",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "🐾 Livraison gratuite à Dakar dès 15 000 FCFA d'achat · Paiement Wave & Orange Money",
              background: "#1D4A2A",
              color: "#FDFAF4",
              linkText: "Commander",
              linkUrl: "/produits",
            },
          },
          {
            type: "hero",
            props: {
              heading: "Tout pour votre animal,\nlivré chez vous à Dakar.",
              subheading:
                "Nourriture, accessoires, soins et conseil vétérinaire. BAMBA PET, la première animalerie en ligne du Sénégal.",
              backgroundImageUrl: "",
              overlay: 0.4,
              primaryCta: { label: "Voir les produits", href: "/produits" },
              secondaryCta: { label: "Commander sur WhatsApp", href: "https://wa.me/221785000000" },
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "2 500", suffix: "+", label: "Clients actifs" },
                { value: "800", suffix: "+", label: "Produits disponibles" },
                { value: "24h", label: "Délai livraison Dakar" },
                { value: "4.8", prefix: "★", label: "Note clients" },
              ],
              background: "#F4752C",
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Par animal",
              tiles: [
                {
                  label: "🐕 Chiens",
                  description: "Croquettes, jouets, laisses, colliers, soins",
                  imageUrl: "",
                  href: "/produits",
                },
                {
                  label: "🐈 Chats",
                  description: "Litière, griffoirs, gamelles, colliers, friandises",
                  imageUrl: "",
                  href: "/produits",
                },
                {
                  label: "🐦 Oiseaux",
                  description: "Cages, graines, bâtons de miel, perchoirs",
                  imageUrl: "",
                  href: "/produits",
                },
                {
                  label: "🐠 Aquariophilie",
                  description: "Aquariums, filtres, pompes, poissons, décor",
                  imageUrl: "",
                  href: "/produits",
                },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Produits phares",
              subheading: "Les favoris de nos clients. Livraison Dakar sous 24h.",
              columns: 3,
              items: [
                {
                  name: "Royal Canin Adult Dog 15kg",
                  description: "Croquettes complètes pour chiens adultes toutes races. Vitamines et minéraux équilibrés.",
                  price: 42000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221785000000",
                },
                {
                  name: "Litière Agglomérante 10L",
                  description: "Litière ultra-absorbante, sans odeur, 4 semaines d'utilisation. Marque French Cat.",
                  price: 8500,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221785000000",
                },
                {
                  name: "Harnais + Laisse Chiot",
                  description: "Harnais réglable 5 tailles, laisse extensible 5m, crochet acier inoxydable.",
                  price: 12000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221785000000",
                },
                {
                  name: "Nourriture Chat Whiskas 6×85g",
                  description: "Pâtée en sauce variétés : thon, poulet, bœuf. Emballage individuel fraîcheur.",
                  price: 6500,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221785000000",
                },
                {
                  name: "Kit Démarrage Aquarium 60L",
                  description: "Aquarium 60L avec pompe, filtre, éclairage LED, thermomètre et substrat.",
                  price: 85000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221785000000",
                },
                {
                  name: "Vaccin Antirabique Chien",
                  description: "Vaccin antirabique annuel administré par notre vétérinaire partenaire. Sur rendez-vous.",
                  price: 15000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Santé",
                  ctaLabel: "Prendre RDV",
                  ctaHref: "https://wa.me/221785000000",
                },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "Pourquoi choisir BAMBA PET",
              layout: "grid",
              items: [
                {
                  icon: "🚚",
                  title: "Livraison 24h Dakar",
                  description: "Commandez avant 14h, livraison le lendemain matin dans tout Grand-Dakar.",
                },
                {
                  icon: "👨‍⚕️",
                  title: "Conseil vétérinaire",
                  description:
                    "Un vétérinaire répond à vos questions sur WhatsApp. Gratuit pour tous nos clients.",
                },
                {
                  icon: "💳",
                  title: "Paiement flexible",
                  description: "Wave, Orange Money, paiement à la livraison. En 2 fois sans frais dès 25 000 FCFA.",
                },
                {
                  icon: "🔄",
                  title: "Abonnement mensuel",
                  description:
                    "Programmez votre commande de croquettes. Livraison automatique, réduction de 10%.",
                },
              ],
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Nos clients adorent",
              items: [
                {
                  quote:
                    "Je commande les croquettes de Rex toutes les 2 semaines sur BAMBA PET. Livraison impeccable, toujours dans les délais. C'est devenu un réflexe !",
                  author: "Fatou B.",
                  role: "Propriétaire de Rex, labrador 3 ans",
                },
                {
                  quote:
                    "Le vétérinaire en ligne m'a aidé quand ma chatte ne mangeait plus. Diagnostic rapide et solution efficace. Ce service vaut de l'or.",
                  author: "Mamadou K.",
                  role: "Propriétaire de Luna, chat persan",
                },
                {
                  quote:
                    "Kit aquarium reçu emballé parfaitement. Tout était inclus, j'ai pu lancer mon bac en une heure. Je recommande sans hésiter.",
                  author: "Ibrahim S.",
                  role: "Aquariophile débutant",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Commander par WhatsApp",
              subheading:
                "Envoyez-nous votre liste de produits. Nous vous confirmons la disponibilité et la livraison.",
              phoneNumber: "221785000000",
              message:
                "Bonjour BAMBA PET, je souhaite commander : [produit 1], [produit 2]. Adresse de livraison : [votre adresse à Dakar]. Paiement : [Wave / Orange Money / à la livraison].",
              buttonLabel: "Passer une commande",
            },
          },
        ],
      },
      {
        slug: "produits",
        title: "Produits",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Notre catalogue",
              subheading: "800+ produits pour chiens, chats, oiseaux et aquariophilie.",
              backgroundImageUrl: "",
              overlay: 0.4,
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Catégories",
              tiles: [
                { label: "Alimentation", description: "Croquettes, pâtées, friandises, compléments", imageUrl: "", href: "/produits" },
                { label: "Accessoires", description: "Laisses, colliers, jouets, transportins", imageUrl: "", href: "/produits" },
                { label: "Hygiène & Soins", description: "Shampoings, brosses, antiparasitaires", imageUrl: "", href: "/produits" },
                { label: "Habitat", description: "Cages, aquariums, niches, griffoirs", imageUrl: "", href: "/produits" },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Alimentation",
              columns: 3,
              items: [
                {
                  name: "Royal Canin Adult Dog 15kg",
                  description: "Croquettes adulte toutes races. Formule équilibrée riche en protéines.",
                  price: 42000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221785000000",
                },
                {
                  name: "Purina Pro Plan Cat Senior",
                  description: "Croquettes pour chats senior 7+ ans. Riche en poulet, faible en graisse.",
                  price: 18500,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221785000000",
                },
                {
                  name: "Mélange Graines Perroquet 1kg",
                  description: "Mélange premium pour perroquets et perruches. Graines, noix, fruits secs.",
                  price: 5000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221785000000",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "veterinaire",
        title: "Vétérinaire",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Santé animale",
              heading: "Un vétérinaire\ntoujours disponible.",
              body: "BAMBA PET collabore avec le Dr. Seydou Ndiaye, vétérinaire diplômé de l'EISMV de Dakar. Consultez gratuitement par WhatsApp pour les urgences légères. Pour les soins en clinique, prenez rendez-vous directement depuis notre site.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Consulter par WhatsApp", href: "https://wa.me/221785000001" },
            },
          },
          {
            type: "products",
            props: {
              heading: "Services vétérinaires",
              columns: 3,
              items: [
                {
                  name: "Consultation WhatsApp",
                  description: "Avis vétérinaire sur symptômes, alimentation, comportement. Réponse sous 2h.",
                  price: 0,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "GRATUIT",
                  ctaLabel: "Consulter",
                  ctaHref: "https://wa.me/221785000001",
                },
                {
                  name: "Consultation clinique",
                  description: "Examen clinique complet par le Dr. Ndiaye. Sur rendez-vous à la clinique partenaire.",
                  price: 15000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Prendre RDV",
                  ctaHref: "https://wa.me/221785000001",
                },
                {
                  name: "Pack Vaccination Chien",
                  description: "Vaccination antirabique + carnet de santé + consultation. Valable 1 an.",
                  price: 25000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Prendre RDV",
                  ctaHref: "https://wa.me/221785000001",
                },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions santé",
              items: [
                {
                  question: "Mon chien refuse de manger depuis 2 jours, que faire ?",
                  answer:
                    "Un manque d'appétit peut avoir plusieurs causes : changement de nourriture, stress, ou problème de santé. Contactez-nous sur WhatsApp pour une première évaluation gratuite par notre vétérinaire.",
                },
                {
                  question: "À quelle fréquence vacciner mon chat ?",
                  answer:
                    "Le vaccin antirabique est annuel. Le vaccin typhus/coryza peut être tous les 3 ans après les primovaccinations. Notre vétérinaire établit le calendrier adapté lors de la première consultation.",
                },
                {
                  question: "Traitez-vous les animaux de ferme ?",
                  answer:
                    "Nous sommes spécialisés dans les animaux de compagnie (chiens, chats, oiseaux, rongeurs). Pour les animaux de ferme, contactez-nous et nous vous orienterons vers un vétérinaire rural.",
                },
              ],
              contactPanel: {
                heading: "Urgence vétérinaire ?",
                body: "Contactez le Dr. Ndiaye directement. Disponible 7j/7 de 8h à 20h.",
                ctaLabel: "Appeler le vétérinaire",
                ctaHref: "https://wa.me/221785000001",
              },
            },
          },
        ],
      },
    ],
  };
}
