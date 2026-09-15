import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Agriculture — West African farm / producer.
 * Seasonal product availability, "Disponible maintenant" live badge, bulk orders,
 * WhatsApp command, mobile money, delivery.
 * IA: Home · Produits · Commande en gros · Livraison · Contact
 */

const NAV = [
  { label: "Produits", href: "/produits" },
  { label: "Commande en gros", href: "/gros" },
  { label: "Livraison", href: "/livraison" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "Ferme", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Ferme — produits frais du Sénégal, livrés chez vous. Commandez sur WhatsApp.",
      links: [
        { label: "Produits", href: "/produits" },
        { label: "Commande en gros", href: "/gros" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function agricultureWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Agriculture",
    theme: {
      primary: "#1B4A1B",
      accent: "#7AB648",
      background: "#F5F9F0",
      text: "#1B2B1B",
      fontDisplay: "DM Sans",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "md",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "farm-green",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("agri-nav-home"),
          {
            id: "agri-announce",
            type: "announcement-bar",
            props: {
              text: "🟢 Disponible maintenant : mangues, tomates, oignons — commandez sur WhatsApp",
              background: "#7AB648",
              textColor: "#fff",
            },
          },
          {
            id: "agri-hero",
            type: "hero",
            props: {
              heading: "Produits frais, directement du producteur",
              subheading:
                "Fruits, légumes, céréales — cultivés localement, livrés en ville. Commandes en gros pour revendeurs, restaurateurs, hôtels. Paiement Wave ou Orange Money.",
              buttonLabel: "Commander sur WhatsApp",
              buttonHref: "#whatsapp",
              align: "left",
              background: "#1B4A1B",
            },
          },
          {
            id: "agri-disponibles",
            type: "features",
            props: {
              heading: "Disponibles cette saison",
              items: [
                {
                  title: "🟢 Mangues — en stock",
                  body: "Mangues Kent et Keitt — calibres export et local. Sac de 20 kg ou palette. Prix : à partir de 3 500 FCFA/sac.",
                },
                {
                  title: "🟢 Oignons — en stock",
                  body: "Oignons locaux calibre moyen — sac de 25 kg. Prix : 8 000 FCFA/sac. Minimum 2 sacs.",
                },
                {
                  title: "🟢 Tomates — en stock",
                  body: "Tomates cerises et rondes — carton de 10 kg. Prix : 4 500 FCFA/carton.",
                },
                {
                  title: "🕐 Patates douces — semaines prochaines",
                  body: "Récolte en cours — disponibles dans 2 à 3 semaines. Précommandez maintenant.",
                },
              ],
            },
          },
          {
            id: "agri-gallery-home",
            type: "gallery",
            props: {
              heading: "Nos cultures",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Mangues" },
                { src: "", alt: "Oignons" },
                { src: "", alt: "Tomates" },
                { src: "", alt: "Champs maraîcher" },
                { src: "", alt: "Récolte" },
                { src: "", alt: "Livraison" },
              ],
            },
          },
          {
            id: "agri-whatsapp-home",
            type: "whatsapp",
            props: {
              label: "Commander ou précommander sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander des produits frais. Qu'est-ce qui est disponible aujourd'hui ?",
            },
          },
          {
            id: "agri-testimonials",
            type: "testimonials",
            props: {
              heading: "Ils nous font confiance",
              items: [
                {
                  quote: "Tomates fraîches chaque semaine pour mon restaurant — qualité constante, livraison à temps.",
                  name: "Aliou D.",
                  role: "Restaurateur — Dakar",
                },
                {
                  quote: "Mangues export pour mon activité. Prix compétitif, producteur sérieux.",
                  name: "Fatou S.",
                  role: "Revendeuse — marché central",
                },
              ],
            },
          },
          footer("agri-footer-home"),
        ],
      },
      {
        slug: "produits",
        title: "Produits",
        sections: [
          nav("agri-nav-produits"),
          {
            id: "agri-produits-hero",
            type: "hero",
            props: {
              heading: "Nos produits",
              subheading: "Fruits, légumes, céréales — produits locaux de saison, disponibilité mise à jour chaque semaine.",
              buttonLabel: "Commander",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#1B4A1B",
            },
          },
          {
            id: "agri-produits-fruits",
            type: "features",
            props: {
              heading: "Fruits",
              items: [
                { title: "Mangues Kent & Keitt", body: "Saison : mars–juillet · Conditionnement : sac 20 kg · Prix départ ferme : 3 500 FCFA/sac." },
                { title: "Pastèques", body: "Saison : avril–août · Vente au poids ou à la pièce · Min. 100 kg pour livraison." },
                { title: "Bananes plantain", body: "Disponible toute l'année · Régime ou à la pièce · Livraison hebdomadaire." },
              ],
            },
          },
          {
            id: "agri-produits-legumes",
            type: "features",
            props: {
              heading: "Légumes & céréales",
              items: [
                { title: "Oignons locaux", body: "Saison : novembre–mars · Sac 25 kg · Stockage possible jusqu'à 3 mois." },
                { title: "Tomates", body: "Saison : octobre–mars (maraîchage irrigué toute l'année) · Carton 10 kg." },
                { title: "Mil & sorgho", body: "Récolte octobre · Sac 50 kg · Certifié sans traitement chimique post-récolte." },
                { title: "Niébé (haricots)", body: "Récolte novembre · Sac 25 kg · Qualité consommation ou semence." },
              ],
            },
          },
          {
            id: "agri-produits-gallery",
            type: "gallery",
            props: {
              heading: "Photos des produits",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Mangues Kent" },
                { src: "", alt: "Oignons" },
                { src: "", alt: "Tomates" },
                { src: "", alt: "Pastèques" },
                { src: "", alt: "Mil" },
                { src: "", alt: "Niébé" },
              ],
            },
          },
          {
            id: "agri-produits-wa",
            type: "whatsapp",
            props: {
              label: "Vérifier la disponibilité sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais connaître les disponibilités et les prix de la semaine.",
            },
          },
          footer("agri-footer-produits"),
        ],
      },
      {
        slug: "gros",
        title: "Commande en gros",
        sections: [
          nav("agri-nav-gros"),
          {
            id: "agri-gros-hero",
            type: "hero",
            props: {
              heading: "Commandes en gros",
              subheading: "Revendeurs, restaurateurs, hôtels, cantines — tarifs préférentiels dès 100 kg. Contrat hebdomadaire ou mensuel.",
              buttonLabel: "Demander un devis",
              buttonHref: "#form",
              align: "left",
              background: "#1B4A1B",
            },
          },
          {
            id: "agri-gros-avantages",
            type: "features",
            props: {
              heading: "Avantages commandes groupées",
              items: [
                { title: "Prix départ ferme", body: "Tarifs producteur — pas d'intermédiaire. Économisez 20 à 35 % vs prix marché." },
                { title: "Livraison planifiée", body: "Livraison hebdomadaire ou bi-mensuelle selon accord — quantité et jour fixes." },
                { title: "Précommande garantie", body: "Réservez votre stock à l'avance — priorité sur les produits de saison." },
              ],
            },
          },
          {
            id: "agri-gros-form",
            type: "form",
            props: {
              heading: "Demande de commande en gros",
              subheading: "Remplissez le formulaire — nous vous recontactons sous 24 h avec un devis.",
              buttonLabel: "Envoyer la demande",
              successMessage: "Demande reçue — nous vous contactons sous 24 h.",
              fields: [
                { id: "nom", label: "Nom / Raison sociale", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                {
                  id: "profil",
                  label: "Votre activité",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Revendeur marché", "Restaurateur", "Hôtel / cantine", "Exportateur", "Autre"],
                },
                { id: "produits", label: "Produits souhaités", type: "text", required: true, placeholder: "Mangues, oignons, tomates…", options: [] },
                { id: "quantite", label: "Quantité estimée / semaine", type: "text", required: true, placeholder: "Ex : 500 kg mangues + 200 kg oignons", options: [] },
                {
                  id: "frequence",
                  label: "Fréquence de livraison",
                  type: "select",
                  required: false,
                  placeholder: "",
                  options: ["Hebdomadaire", "Bi-mensuelle", "Mensuelle", "Ponctuelle"],
                },
                {
                  id: "note",
                  label: "Informations complémentaires",
                  type: "textarea",
                  required: false,
                  placeholder: "Calibre souhaité, zone de livraison, contraintes particulières…",
                  options: [],
                },
              ],
            },
          },
          footer("agri-footer-gros"),
        ],
      },
      {
        slug: "livraison",
        title: "Livraison",
        sections: [
          nav("agri-nav-livraison"),
          {
            id: "agri-livraison-hero",
            type: "hero",
            props: {
              heading: "Livraison à domicile",
              subheading: "Commandez le soir, livraison le matin suivant — fraîcheur garantie. Wave, Orange Money ou espèces.",
              buttonLabel: "Commander maintenant",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#1B4A1B",
            },
          },
          {
            id: "agri-livraison-body",
            type: "text",
            props: {
              heading: "Comment ça marche",
              body: "1. Envoyez votre commande sur WhatsApp — précisez produit, quantité, adresse.\n2. Nous confirmez la disponibilité et le prix total.\n3. Paiement par Wave, Orange Money ou espèces à la livraison.\n4. Livraison le lendemain matin entre 6h et 10h dans la zone couverte.\n\nZone de livraison : Dakar et périphérie — précisez votre quartier pour vérification.",
            },
          },
          {
            id: "agri-livraison-wa",
            type: "whatsapp",
            props: {
              label: "Passer commande sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander pour livraison. Voici ma commande :",
            },
          },
          {
            id: "agri-livraison-faq",
            type: "faq",
            props: {
              heading: "FAQ livraison",
              items: [
                {
                  question: "Quel est le minimum de commande pour la livraison ?",
                  answer: "Minimum 5 000 FCFA par commande pour la livraison à domicile. En dessous, retrait à la ferme possible.",
                },
                {
                  question: "Livrez-vous le week-end ?",
                  answer: "Oui — livraisons du lundi au samedi. Commandes reçues avant 20h livrées le lendemain matin.",
                },
                {
                  question: "Comment payer ?",
                  answer: "Wave, Orange Money ou espèces à la livraison. Reçu fourni pour toute commande.",
                },
              ],
            },
          },
          footer("agri-footer-livraison"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("agri-nav-contact"),
          {
            id: "agri-contact-section",
            type: "contact",
            props: {
              heading: "Nous contacter",
              email: "ferme@example.com",
              phone: "+221770000000",
              address: "Ferme — votre localité, région · Ouvert lun–sam 6h–18h",
            },
          },
          footer("agri-footer-contact"),
        ],
      },
    ],
  };
}
