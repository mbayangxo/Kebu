import type { WebsiteDefinition } from "../website-schema";

/**
 * RHYTHM AGENCY — Agence booking artistes & management
 * Dark music: noir total + violet électrique + blanc
 * Syne (display) + DM Sans (body)
 * Booking DJ, artistes, groupes, Dakar
 */
export function bookingArtisteWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "RHYTHM AGENCY",
    theme: {
      primary: "#7B2FBE",
      accent: "#A855F7",
      background: "#080810",
      text: "#F0F0FF",
      surface: "#12122A",
      fontDisplay: "Syne",
      fontBody: "DM Sans",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "tight",
      radius: "sharp",
      aestheticId: "dark-electric-music-agency",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Agence Booking & Management · Dakar",
              heading: "LA MUSIQUE\nAFRICAINE\nSUR TOUTES\nLES SCÈNES.",
              subheading:
                "RHYTHM AGENCY booste les carrières et remplit les salles. Booking, management et production pour DJ, artistes et groupes de musique africaine — Dakar à l'international.",
              primaryCta: { label: "Nos artistes", href: "/artistes" },
              secondaryCta: { label: "Demander un booking", href: "/booking" },
              backgroundImageUrl: "",
              overlay: 0.65,
              textAlign: "center",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              background: "#7B2FBE",
              items: [
                { value: "80", suffix: "+", label: "Artistes sous contrat" },
                { value: "500", suffix: "+", label: "Événements bookés" },
                { value: "12", label: "Pays" },
                { value: "8", label: "Ans d'expérience" },
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
                  icon: "🎤",
                  title: "Booking artistes",
                  description:
                    "Placement d'artistes pour événements corporate, festivals, soirées privées, concerts. Négociation, contrats, logistique.",
                },
                {
                  icon: "📈",
                  title: "Management",
                  description:
                    "Développement de carrière, stratégie digitale, image, négociation labels et partenariats pour artistes en croissance.",
                },
                {
                  icon: "🎬",
                  title: "Production",
                  description:
                    "Clip vidéo, sessions studio, EP et albums — nous connectons les artistes aux meilleurs producteurs d'Afrique de l'Ouest.",
                },
                {
                  icon: "🌍",
                  title: "Tournées internationales",
                  description:
                    "Booking et logistique pour tournées Africa / diaspora Europe. Paris, Bruxelles, New York, Montréal — nous connaissons les marchés.",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Nos artistes en scène",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "DJ Fatou — Accra Music Festival" },
                { src: "", alt: "Groupe Baobab Sons — concert Dakar" },
                { src: "", alt: "Kofi MC — festival hip-hop Abidjan" },
                { src: "", alt: "Yaye Singer — événement corporate Dakar" },
                { src: "", alt: "Tropic Sound — tournée Paris diaspora" },
                { src: "", alt: "Backstage festival RHYTHM" },
              ],
              instagramHandle: "@rhythmagency.dk",
              followLabel: "Suivre nos artistes",
            },
          },
          {
            type: "products",
            props: {
              heading: "Nos formules booking",
              subheading: "Pour organisateurs d'événements — prix indicatifs selon artiste.",
              columns: 3,
              items: [
                {
                  name: "DJ Set — 3h",
                  description:
                    "DJ professionnel pour soirée, mariage, événement corporate. Setup et éclairage non inclus. Rayon Dakar et banlieue.",
                  priceLabel: "Dès 250 000 FCFA",
                  imageUrl: "",
                  filterTags: ["DJ", "Soirée"],
                  whatsappMessage:
                    "Bonjour RHYTHM AGENCY — je cherche un DJ pour mon événement. Date : [date]. Lieu : [lieu]. Type d'événement : [soirée / mariage / corporate]. Budget indicatif : [budget].",
                },
                {
                  name: "Artiste Live — 45 min set",
                  description:
                    "Performance live artiste solo ou groupe. Technique son artiste incluse. Négociation tarif selon artiste choisi.",
                  priceLabel: "Sur devis",
                  imageUrl: "",
                  badge: "Populaire",
                  filterTags: ["Live", "Concert"],
                  whatsappMessage:
                    "Bonjour RHYTHM AGENCY — je veux booker un artiste live pour mon événement. Date : [date]. Lieu : [lieu]. Artiste souhaité (si précis) : [artiste]. Budget :",
                },
                {
                  name: "Festival / Grand événement",
                  description:
                    "Plusieurs artistes, programmation complète, scène et production. Service clé en main pour festivals et événements 500+ personnes.",
                  priceLabel: "Sur devis",
                  imageUrl: "",
                  filterTags: ["Festival"],
                  whatsappMessage:
                    "Bonjour RHYTHM AGENCY — je prépare un festival / grand événement. Date : [date]. Capacité estimée : [nombre]. Budget production :",
                },
                {
                  name: "Soirée Corporate",
                  description:
                    "Ambiance musicale sur mesure pour vos événements entreprise — DJ, live, animation. Discrétion et professionnalisme.",
                  priceLabel: "Dès 400 000 FCFA",
                  imageUrl: "",
                  filterTags: ["Corporate", "DJ"],
                  whatsappMessage:
                    "Bonjour RHYTHM AGENCY — je cherche une animation musicale pour un événement corporate. Date : [date]. Nombre d'invités : [nombre]. Ambiance souhaitée :",
                },
              ],
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ce qu'on dit de nous",
              items: [
                {
                  quote:
                    "RHYTHM AGENCY a booké 3 de nos soirées annuelles. Artistes ponctuels, contrats clairs, pas de mauvaises surprises. C'est la définition du professionnalisme.",
                  author: "Oumar N.",
                  role: "Organisateur événementiel, Dakar",
                },
                {
                  quote:
                    "Depuis que je suis avec RHYTHM AGENCY, ma carrière a décollé. En 18 mois, je suis passée de 3 dates à plus de 40 par an. Leur réseau est imbattable.",
                  author: "Fatou C.",
                  role: "DJ & productrice, Dakar",
                },
                {
                  quote:
                    "La tournée diaspora Paris-Bruxelles-Lyon qu'ils ont organisée était parfaitement rodée. 12 dates en 3 semaines, aucun problème logistique.",
                  author: "Groupe Baobab Sons",
                  role: "Artistes musique, Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Booking & demandes",
              subheading:
                "Organisateurs — décrivez votre événement. Artistes — parlez-nous de votre projet.",
              phoneNumber: "221710000000",
              message:
                "Bonjour RHYTHM AGENCY — [je cherche un artiste pour mon événement / je suis artiste et cherche une agence]. Détails :",
              buttonLabel: "Contacter l'agence",
            },
          },
        ],
      },
      {
        slug: "artistes",
        title: "Artistes",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Nos artistes",
              subheading: "DJ, live, groupes — un roster diversifié pour tous vos événements.",
              backgroundImageUrl: "",
              overlay: 0.6,
            },
          },
          {
            type: "features",
            props: {
              heading: "Genres représentés",
              layout: "grid",
              items: [
                { icon: "🎵", title: "Afrobeats", description: "Les sons d'Afrique de l'Ouest — de Dakar à Lagos. DJ et live acts." },
                { icon: "🎶", title: "Hip-hop africain", description: "Rap Dakarois, rap ivoire, rap camerounais. MC et groupes." },
                { icon: "🎸", title: "Jazz & Blues", description: "Jazz africain contemporain, fusion traditionnelle / moderne." },
                { icon: "🥁", title: "Musique traditionnelle", description: "Griottes, sabar, kora — pour événements culturels et institutionnels." },
                { icon: "🎤", title: "R&B & Soul", description: "Voix féminines et masculines, reprises et créations originales." },
                { icon: "🎹", title: "Electronic", description: "Afro-house, afro-electronic, DJ sets fusion culturelle." },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Vous cherchez un artiste précis ?",
              subheading: "Dites-nous le genre musical, la date et le budget — on trouve le profil idéal.",
              phoneNumber: "221710000000",
              message: "Bonjour RHYTHM AGENCY — je cherche un artiste pour mon événement. Genre musical : [afrobeats / hip-hop / jazz / autre]. Date : [date]. Budget indicatif :",
              buttonLabel: "Trouver l'artiste idéal",
            },
          },
        ],
      },
      {
        slug: "booking",
        title: "Booking",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Vous êtes organisateur",
              heading: "Un événement\ninoubliable\nse planifie.",
              body: "Que vous organisiez un mariage, un festival ou une soirée corporate — RHYTHM AGENCY met à votre service 8 ans de réseau musical en Afrique de l'Ouest. Contrats clairs, artistes ponctuels, pas de mauvaises surprises.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Demander un booking", href: "https://wa.me/221710000000" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Le processus",
              layout: "horizontal",
              items: [
                { icon: "📝", title: "Brief", description: "Décrivez votre événement — date, lieu, type, budget." },
                { icon: "🎨", title: "Proposition", description: "On vous propose 2-3 profils adaptés sous 24h." },
                { icon: "✍️", title: "Contrat", description: "Contrat standard signé entre vous et l'artiste. Acompte 30%." },
                { icon: "🎤", title: "Performance", description: "L'artiste est là à l'heure, prêt à performer." },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                {
                  question: "Quel délai minimum pour booker un artiste ?",
                  answer:
                    "En général 2 semaines minimum pour les événements standards, 1 mois pour les grands événements. En urgence (sous 72h), contactez-nous — parfois possible selon disponibilité.",
                },
                {
                  question: "Le prix affiché est-il définitif ?",
                  answer:
                    "Les prix sont indicatifs — chaque artiste a son propre tarif selon sa notoriété et le type d'événement. Nous vous donnons un devis précis après brief.",
                },
                {
                  question: "Que se passe-t-il si l'artiste annule ?",
                  answer:
                    "Notre contrat standard prévoit un remplaçant de niveau équivalent ou le remboursement intégral de l'acompte. Nos artistes ne cancellent pas.",
                },
              ],
              contactPanel: {
                heading: "Prêt à booker ?",
                body: "On répond sous 2h sur WhatsApp.",
                ctaLabel: "Demander un devis",
                ctaHref: "https://wa.me/221710000000",
              },
            },
          },
        ],
      },
    ],
  };
}
