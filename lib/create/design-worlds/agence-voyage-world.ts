import type { WebsiteDefinition } from "../website-schema";

/**
 * TERANGA VOYAGES — Agence de voyage africaine premium
 * Earthy elegance: acajou chaud + sable doré + ivoire
 * Playfair Display (display) + Lato (body)
 * Spécialiste des circuits en Afrique de l'Ouest, safaris et pèlerinage
 */
export function agenceVoyageWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "TERANGA VOYAGES",
    theme: {
      primary: "#3D2314",
      accent: "#C9933A",
      background: "#FDFAF5",
      text: "#1A1008",
      fontDisplay: "Playfair Display",
      fontBody: "Lato",
      radius: "soft",
      spacing: "comfortable",
      headingScale: "md",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "warm-african-travel",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "🌍 Omra 2025 — Places limitées. Forfaits tout compris depuis Dakar disponibles.",
              background: "#3D2314",
              color: "#F5E6CC",
              linkText: "Voir les offres",
              linkUrl: "/destinations",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Agence de voyage",
              heading: "L'Afrique,\ncelle que\nvous méritez.",
              subheading:
                "Circuits authentiques, safaris mémorables et pèlerinages spirituels. Teranga Voyages vous emmène là où peu d'agences osent aller.",
              primaryCta: { label: "Explorer nos circuits", href: "/destinations" },
              secondaryCta: { label: "Devis gratuit", href: "https://wa.me/221770000000" },
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
                { value: "12", suffix: " ans", label: "D'expérience" },
                { value: "3 200", suffix: "+", label: "Voyageurs accompagnés" },
                { value: "18", label: "Destinations actives" },
                { value: "4.9", prefix: "★", label: "Note moyenne clients" },
              ],
              background: "#C9933A",
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Nos spécialités",
              tiles: [
                {
                  label: "Circuits Afrique",
                  description: "Sénégal, Mali, Côte d'Ivoire, Maroc et plus",
                  imageUrl: "",
                  href: "/destinations",
                },
                {
                  label: "Safaris & Nature",
                  description: "Niokolo-Koba, Nazinga, Pendjari, Amboseli",
                  imageUrl: "",
                  href: "/destinations",
                },
                {
                  label: "Omra & Pèlerinage",
                  description: "Forfaits tout compris La Mecque & Médine",
                  imageUrl: "",
                  href: "/destinations",
                },
                {
                  label: "Voyages d'affaires",
                  description: "Billets, hôtels, visa, transfers organisés",
                  imageUrl: "",
                  href: "/contact",
                },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "Pourquoi choisir Teranga Voyages",
              layout: "grid",
              items: [
                {
                  icon: "🛂",
                  title: "Visa & démarches inclus",
                  description:
                    "Nous gérons les visas, laissez-passer et formalités administratives pour vous.",
                },
                {
                  icon: "🏨",
                  title: "Hôtels sélectionnés",
                  description:
                    "Chaque établissement est visité et validé par notre équipe avant d'être proposé.",
                },
                {
                  icon: "🚌",
                  title: "Transfers sécurisés",
                  description:
                    "Véhicules climatisés et chauffeurs agréés pour tous vos déplacements sur place.",
                },
                {
                  icon: "📞",
                  title: "Assistance 24h/24",
                  description:
                    "Un correspondant joignable à toute heure pendant votre voyage. Jamais seul à l'étranger.",
                },
                {
                  icon: "💳",
                  title: "Paiement en plusieurs fois",
                  description:
                    "Réservez avec 30% d'acompte. Solde en 2 ou 3 versements sans frais via Wave.",
                },
                {
                  icon: "🌿",
                  title: "Tourisme responsable",
                  description:
                    "Partenariat avec des guides locaux et hébergements communautaires partout où c'est possible.",
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
                    "Le circuit Maroc organisé par Teranga était parfait. Hôtels superbes, guide passionné, aucun stress. Je recommande les yeux fermés.",
                  author: "Ibrahima C.",
                  role: "Circuit Maroc 10 jours, 2024",
                },
                {
                  quote:
                    "Mon Omra avec Teranga était une expérience spirituelle inoubliable. Tout était géré, je n'avais qu'à prier.",
                  author: "Mariama D.",
                  role: "Omra Ramadan 2024",
                },
                {
                  quote:
                    "Voyage d'affaires à Abidjan — billets, hôtel et airport transfer réservés en 2 heures. Efficace et professionnel.",
                  author: "Moussa K.",
                  role: "Voyage d'affaires",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Obtenir un devis gratuit",
              subheading:
                "Dites-nous votre destination, vos dates et le nombre de voyageurs. Devis sous 2 heures.",
              phoneNumber: "221770000000",
              message:
                "Bonjour Teranga Voyages, je souhaite un devis pour [destination], du [date départ] au [date retour], pour [nb personnes] personnes. Budget approximatif : [montant] FCFA.",
              buttonLabel: "Demander un devis",
            },
          },
        ],
      },
      {
        slug: "destinations",
        title: "Destinations",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Nos destinations",
              subheading: "18 destinations actives. Circuits sur-mesure disponibles toute l'année.",
              backgroundImageUrl: "",
              overlay: 0.55,
            },
          },
          {
            type: "products",
            props: {
              heading: "Séjours & circuits",
              subheading: "Prix par personne en chambre double. Vols inclus au départ de Dakar sauf mention contraire.",
              columns: 3,
              items: [
                {
                  name: "Circuit Maroc Impérial 10J",
                  description:
                    "Casablanca, Fès, Meknès, Marrakech. Guide francophone, riads sélectionnés, vol Dakar-Casa inclus.",
                  price: 850000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221770000000",
                },
                {
                  name: "Safari Niokolo-Koba 4J",
                  description:
                    "Parc national du Sénégal, observation faune, nuits en lodge éco, transfert depuis Dakar.",
                  price: 280000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221770000000",
                },
                {
                  name: "Omra Tout Compris",
                  description:
                    "Vol Dakar-Jeddah, hébergement 4★ Médine + La Mecque, guide religieux, visa. Dates Ramadan & hors saison.",
                  price: 1200000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Places limitées",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221770000000",
                },
                {
                  name: "Escapade Abidjan 4J",
                  description:
                    "Hôtel 4★ Cocody, visite Plateau & Treichville, restaurant gastronomique. Vol inclus.",
                  price: 420000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221770000000",
                },
                {
                  name: "Dubaï Découverte 7J",
                  description:
                    "Hôtel 4★ Dubai Marina, excursion désert, souks, Burj Khalifa. Vol inclus depuis Dakar.",
                  price: 1050000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221770000000",
                },
                {
                  name: "Circuit Sur-Mesure",
                  description:
                    "Vous choisissez la destination, la durée et le standing. Nous construisons le programme.",
                  price: 0,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Sur devis",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221770000000",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "omra",
        title: "Omra & Hajj",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Pèlerinage",
              heading: "Votre Omra en toute sérénité.",
              body: "Teranga Voyages accompagne les pèlerins sénégalais depuis 2013. Nos forfaits Omra sont complets : vol, hébergement à proximité des lieux saints, guide religieux et assistance sur place. Nous gérons également les demandes de visa pour l'Arabie Saoudite.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Voir les forfaits Omra", href: "/destinations" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Ce qui est inclus dans nos forfaits Omra",
              layout: "grid",
              items: [
                { icon: "✈️", title: "Vol aller-retour", description: "Dakar – Jeddah en classe économique ou affaires." },
                { icon: "🕌", title: "Hébergement", description: "Hôtels 3★ à 5★ à moins de 500m de la Masjid Al-Haram." },
                { icon: "🚌", title: "Transfers", description: "Aéroport, hôtel, Masjid, Médine. Tout est inclus." },
                { icon: "📋", title: "Visa", description: "Traitement du dossier visa Omra pris en charge." },
                { icon: "📿", title: "Guide religieux", description: "Accompagnement spirituel par un érudit francophone." },
                { icon: "🍽️", title: "Repas", description: "Petit-déjeuner et dîner inclus selon les forfaits." },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions Omra",
              items: [
                {
                  question: "Quelles sont les dates disponibles pour l'Omra ?",
                  answer:
                    "Nous proposons des départs toute l'année, avec des groupes spéciaux pendant le Ramadan. Contactez-nous pour connaître les prochaines dates.",
                },
                {
                  question: "Le visa Omra est-il inclus ?",
                  answer:
                    "Oui, nous gérons intégralement le dossier visa. Vous devrez fournir passeport, photos et certificat médical.",
                },
                {
                  question: "Peut-on payer en plusieurs fois ?",
                  answer:
                    "Oui. Acompte 30% à la réservation, puis deux versements jusqu'à 30 jours avant le départ via Wave ou Orange Money.",
                },
              ],
              contactPanel: {
                heading: "Une question spécifique sur votre Omra ?",
                body: "Notre conseiller pèlerinage vous répond en français et en wolof.",
                ctaLabel: "Nous écrire sur WhatsApp",
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
              heading: "Notre agence",
              subheading:
                "Ouvert du lundi au vendredi 8h–18h et le samedi 9h–14h. Devis gratuit et sans engagement.",
              address: "Teranga Voyages — Avenue Léopold Sédar Senghor, Dakar, Sénégal",
              phone: "+221 77 000 00 00",
              email: "info@terangavoyages.sn",
              mapEmbedUrl: "",
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Planifier votre prochain voyage",
              subheading: "Envoyez-nous votre projet, nous vous recontactons rapidement.",
              phoneNumber: "221770000000",
              message: "Bonjour Teranga Voyages, je voudrais planifier un voyage à [destination] pour [nb personnes] personnes en [mois/année].",
              buttonLabel: "Écrire sur WhatsApp",
            },
          },
        ],
      },
    ],
  };
}
