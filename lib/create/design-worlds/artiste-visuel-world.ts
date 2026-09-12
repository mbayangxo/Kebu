import type { WebsiteDefinition } from "../website-schema";

/**
 * ABLAYE SECK — Artiste plasticien & photographe africain
 * Monochrome editorial: noir absolu + blanc pur + terre de sienne
 * Cormorant Garamond (display) + Inter (body)
 * Portfolio beaux-arts, expositions, tirages originaux
 */
export function artisteVisuelWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: 1,
    title: "Ablaye Seck",
    theme: {
      primary: "#0A0A0A",
      accent: "#8B5E3C",
      background: "#F4F2EE",
      text: "#0A0A0A",
      fontHeading: "Cormorant Garamond",
      fontBody: "Inter",
      borderRadius: "none",
      spacing: "airy",
      aestheticId: "monochrome-fine-art-portfolio",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Artiste plasticien · Photographe · Dakar",
              heading: "L'Afrique\npar le regard\nd'un fils.",
              subheading:
                "Œuvres sur toile, photographies argentiques et installations. Expositions à Dakar, Paris et New York. Tirages originaux disponibles à la vente.",
              primaryCta: { label: "Voir les œuvres", href: "/portfolio" },
              secondaryCta: { label: "Contacter l'artiste", href: "/contact" },
              backgroundImageUrl: "",
              overlay: 0.5,
              textAlign: "center",
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "L'artiste",
              heading: "Ablaye Seck — peintre et photographe sénégalais.",
              body: "Né à Saint-Louis en 1985, Ablaye Seck développe depuis 2008 un corpus centré sur l'identité, la mémoire et les mutations urbaines en Afrique de l'Ouest. Ses œuvres ont été exposées à la Biennale de Dakar, à la Galerie Templon à Paris et au Brooklyn Museum.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "À propos", href: "/artiste" },
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Séries",
              tiles: [
                {
                  label: "Peintures",
                  description: "Huile sur toile, acrylique, techniques mixtes. Formats 60×90 à 200×300 cm.",
                  imageUrl: "",
                  href: "/portfolio",
                },
                {
                  label: "Photographies",
                  description: "Tirages argentiques et numériques. Éditions limitées signées.",
                  imageUrl: "",
                  href: "/portfolio",
                },
                {
                  label: "Installations",
                  description: "Œuvres in situ, sculptures et dispositifs immersifs.",
                  imageUrl: "",
                  href: "/portfolio",
                },
                {
                  label: "Tirages à vendre",
                  description: "Œuvres originales et éditions numérotées disponibles à l'acquisition.",
                  imageUrl: "",
                  href: "/boutique",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Œuvres récentes",
              layout: "masonry",
              images: [
                { url: "", alt: "Série Harmattan — huile sur toile #1" },
                { url: "", alt: "Dakar la nuit — photographie argentique" },
                { url: "", alt: "Portrait Peul — acrylique" },
                { url: "", alt: "Marché Sandaga — photographie" },
                { url: "", alt: "Série Migrations — installation" },
                { url: "", alt: "Femme au pagne — techniques mixtes" },
              ],
              instagramHandle: "@ablayeseck.art",
              followLabel: "Suivre sur Instagram",
            },
          },
          {
            type: "features",
            props: {
              heading: "Expositions & résidences",
              layout: "horizontal",
              items: [
                {
                  icon: "🏛️",
                  title: "Dak'Art Biennale 2024",
                  description:
                    "Exposition 'Mémoires Vives' au Musée Théodore Monod. Sélection officielle.",
                },
                {
                  icon: "🇫🇷",
                  title: "Galerie Templon Paris",
                  description:
                    "Solo show 'Harmattan' — 18 peintures grands formats. Octobre 2023.",
                },
                {
                  icon: "🇺🇸",
                  title: "Brooklyn Museum, New York",
                  description:
                    "Participation à l'exposition collective 'New African Photography'. 2022.",
                },
                {
                  icon: "🌍",
                  title: "Résidence CITÉ des Arts, Paris",
                  description: "Résidence de création 6 mois. Production de la série 'Frontières'. 2021.",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Acquérir une œuvre",
              subheading:
                "Disponibilités, prix et conditions d'acquisition. Je réponds personnellement.",
              phoneNumber: "221770000001",
              message:
                "Bonjour Ablaye, je suis intéressé(e) par [une peinture / une photographie / une édition numérotée] de votre travail. Pouvez-vous me donner plus d'informations ?",
              buttonLabel: "Contacter l'artiste",
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
              subheading:
                "Peintures, photographies et installations. 2008–2024.",
              backgroundImageUrl: "",
              overlay: 0.6,
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Séries",
              tiles: [
                { label: "HARMATTAN", description: "2023 — 18 peintures huile sur toile", imageUrl: "", href: "/portfolio" },
                { label: "FRONTIÈRES", description: "2021 — 12 photographies argentiques", imageUrl: "", href: "/portfolio" },
                { label: "MIGRATIONS", description: "2020 — Série photographique & installation", imageUrl: "", href: "/portfolio" },
                { label: "PORTRAITS", description: "2018–2024 — Peintures et photos de portrait", imageUrl: "", href: "/portfolio" },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "",
              layout: "masonry",
              images: [
                { url: "", alt: "Harmattan 01" },
                { url: "", alt: "Harmattan 02" },
                { url: "", alt: "Frontières 01" },
                { url: "", alt: "Frontières 02" },
                { url: "", alt: "Migrations 01" },
                { url: "", alt: "Portrait 01" },
                { url: "", alt: "Portrait 02" },
                { url: "", alt: "Migrations 02" },
              ],
            },
          },
        ],
      },
      {
        slug: "boutique",
        title: "Boutique",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Tirages disponibles",
              subheading:
                "Éditions limitées numérotées et signées. Livraison internationale.",
              backgroundImageUrl: "",
              overlay: 0.5,
            },
          },
          {
            type: "products",
            props: {
              heading: "Œuvres à l'acquisition",
              subheading:
                "Certificat d'authenticité fourni. Paiement en plusieurs fois sur demande. Expédition internationale disponible.",
              columns: 3,
              items: [
                {
                  name: "Harmattan #3 — Huile sur toile",
                  description:
                    "120×160 cm. Pièce unique. Certificat d'authenticité. Dakar, 2023. Cadre chêne massif inclus.",
                  price: 2500000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Pièce unique",
                  ctaLabel: "Demander infos",
                  ctaHref: "https://wa.me/221770000001",
                },
                {
                  name: "Marché Sandaga — Photographie",
                  description:
                    "Tirage argentique 60×80 cm. Édition de 5. N°2/5 disponible. Encadrement sous verre antireflet.",
                  price: 650000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "2/5 disponible",
                  ctaLabel: "Acquérir",
                  ctaHref: "https://wa.me/221770000001",
                },
                {
                  name: "Portrait Peul — Acrylique",
                  description:
                    "90×120 cm. Pièce unique. Pigments naturels sur toile de lin. Dakar, 2022.",
                  price: 1800000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Pièce unique",
                  ctaLabel: "Demander infos",
                  ctaHref: "https://wa.me/221770000001",
                },
                {
                  name: "Femme au Pagne — Techniques mixtes",
                  description:
                    "80×100 cm. Peinture sur tissu traditionnel. Pièce unique. Saint-Louis, 2021.",
                  price: 1200000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Acquérir",
                  ctaHref: "https://wa.me/221770000001",
                },
                {
                  name: "Série Frontières — 3 photographies",
                  description:
                    "Pack 3 tirages 40×50 cm. Édition de 10. Signés et numérotés. Présentation en coffret.",
                  price: 900000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Coffret",
                  ctaLabel: "Acquérir",
                  ctaHref: "https://wa.me/221770000001",
                },
                {
                  name: "Commande privée",
                  description:
                    "Portrait ou paysage sur commande. Taille et technique selon vos souhaits. Délai 8–12 semaines.",
                  price: 0,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Sur devis",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221770000001",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "artiste",
        title: "L'artiste",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Biographie",
              heading: "Un regard\nancré dans\nla mémoire.",
              body: "Né à Saint-Louis du Sénégal en 1985, Ablaye Seck est diplômé de l'École des Beaux-Arts de Dakar et de l'École nationale supérieure des Arts Décoratifs de Paris. Il développe depuis 2008 une pratique pluridisciplinaire qui mêle peinture, photographie et installation. Son travail interroge les identités africaines contemporaines face à la mondialisation, la mémoire collective et les frontières.",
              imageUrl: "",
              imageSide: "left",
            },
          },
          {
            type: "features",
            props: {
              heading: "Presse & publications",
              layout: "horizontal",
              items: [
                { icon: "📰", title: "Jeune Afrique", description: "\"L'un des artistes africains les plus prometteurs de sa génération\" — Jeune Afrique, 2023." },
                { icon: "📸", title: "Vogue Africa", description: "Portfolio publié dans le numéro inaugural de Vogue Africa, édition 2022." },
                { icon: "🎙️", title: "RFI Musique & Art", description: "Interview sur la scène artistique dakaroise et la Biennale Dak'Art." },
                { icon: "📚", title: "Monographie", description: "\"Ablaye Seck — L'œuvre 2008–2023\" publié aux éditions Gallimard, 2023." },
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
            type: "whatsapp",
            props: {
              heading: "Contacter l'artiste",
              subheading:
                "Acquisition d'œuvres, expositions, commandes privées, presse et partenariats.",
              phoneNumber: "221770000001",
              message: "Bonjour Ablaye, je vous contacte au sujet de [acquisition / exposition / commande / presse].",
              buttonLabel: "Écrire à l'artiste",
            },
          },
          {
            type: "contact",
            props: {
              heading: "Atelier",
              subheading: "Visites sur rendez-vous uniquement. Galerie représentante : Galerie Templon, Paris.",
              address: "Atelier Ablaye Seck — Medina, Dakar, Sénégal",
              phone: "+221 77 000 00 01",
              email: "studio@ablayeseck.com",
              mapEmbedUrl: "",
            },
          },
        ],
      },
    ],
  };
}
