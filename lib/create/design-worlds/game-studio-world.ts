import type { WebsiteDefinition } from "../website-schema";

/**
 * KIWI GAMES — Studio de jeux vidéo africain indépendant
 * Neon gaming dark: noir profond + vert electric + violet neon
 * Bebas Neue (display) + Inter (body)
 * Mobile-first games pour le marché africain
 */
export function gameStudioWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: 1,
    title: "KIWI GAMES",
    theme: {
      primary: "#070B14",
      accent: "#00FF88",
      background: "#070B14",
      text: "#E8F5FF",
      fontHeading: "Bebas Neue",
      fontBody: "Inter",
      borderRadius: "sm",
      spacing: "comfortable",
      aestheticId: "neon-gaming-dark",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "🎮 NOUVEAU — SAVANE RUSH disponible sur Android & iOS. Téléchargement gratuit.",
              background: "#00FF88",
              color: "#070B14",
              linkText: "Télécharger",
              linkUrl: "/jeux",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Studio indépendant · Dakar",
              heading: "DES JEUX\nNÉS EN\nAFRIQUE.",
              subheading:
                "KIWI GAMES crée des expériences de jeu mobile ancrées dans la culture africaine. Jeux d'action, de stratégie et d'aventure pour 500 millions de joueurs du continent.",
              primaryCta: { label: "Nos jeux", href: "/jeux" },
              secondaryCta: { label: "Rejoindre l'équipe", href: "/studio" },
              backgroundImageUrl: "",
              overlay: 0.7,
              textAlign: "left",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "2.4M", suffix: "+", label: "Téléchargements" },
                { value: "8", label: "Jeux publiés" },
                { value: "22", label: "Pays actifs" },
                { value: "4.6", prefix: "★", label: "Note Play Store" },
              ],
              background: "#00FF88",
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "SAVANE RUSH",
                "KORA LEGENDS",
                "TABASKI DASH",
                "SAHEL WARS",
                "DAKAR DRIFT",
                "GRIOTS QUEST",
                "BAOBAB TOWER",
                "WOYO RUNNER",
              ],
              speed: "fast",
              separator: "✦",
            },
          },
          {
            type: "features",
            props: {
              heading: "Nos jeux phares",
              layout: "grid",
              items: [
                {
                  icon: "🦁",
                  title: "SAVANE RUSH",
                  description:
                    "Runner mobile ultra-rapide dans la savane africaine. 800K téléchargements. Disponible Android & iOS.",
                },
                {
                  icon: "⚽",
                  title: "KORA LEGENDS",
                  description:
                    "Jeu de foot africain avec 200+ joueurs et 20 équipes nationales. Mode multijoueur en ligne.",
                },
                {
                  icon: "🏙️",
                  title: "DAKAR DRIFT",
                  description:
                    "Jeu de course dans les rues de Dakar, Abidjan et Lagos. Physique réaliste, personnalisation poussée.",
                },
                {
                  icon: "⚔️",
                  title: "SAHEL WARS",
                  description:
                    "Stratégie en temps réel dans l'Afrique médiévale. Construis ton empire, conquiers le Sahel.",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Captures d'écran",
              layout: "grid",
              images: [
                { url: "", alt: "Savane Rush gameplay" },
                { url: "", alt: "Kora Legends menu" },
                { url: "", alt: "Dakar Drift course" },
                { url: "", alt: "Sahel Wars stratégie" },
                { url: "", alt: "Baobab Tower puzzle" },
                { url: "", alt: "Griots Quest aventure" },
              ],
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "La communauté parle",
              items: [
                {
                  quote:
                    "SAVANE RUSH est addictif ! Je joue 30 minutes par jour depuis 3 mois. Les graphismes sont incroyables pour un jeu mobile.",
                  author: "Kofi A.",
                  role: "Joueur · Accra, Ghana",
                },
                {
                  quote:
                    "KORA LEGENDS est enfin le jeu de foot africain qu'on attendait. Mon équipe préférée y est, les joueurs ressemblent aux vrais !",
                  author: "Moussa K.",
                  role: "Joueur · Dakar, Sénégal",
                },
                {
                  quote:
                    "Dakar Drift m'a fait redécouvrir ma propre ville. Les décors sont fidèles, la bande-son est parfaite.",
                  author: "Aïcha D.",
                  role: "Joueuse · Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Rejoindre la communauté",
              subheading:
                "Bugs, suggestions, partenariats presse ou investissement — on vous répond.",
              phoneNumber: "221750000000",
              message: "Bonjour KIWI GAMES, je souhaite [signaler un bug / proposer un partenariat / rejoindre la bêta de votre prochain jeu].",
              buttonLabel: "Nous écrire",
            },
          },
        ],
      },
      {
        slug: "jeux",
        title: "Nos jeux",
        sections: [
          {
            type: "hero",
            props: {
              heading: "TOUS NOS JEUX",
              subheading: "8 jeux disponibles. Tous gratuits à télécharger sur Android et iOS.",
              backgroundImageUrl: "",
              overlay: 0.65,
            },
          },
          {
            type: "products",
            props: {
              heading: "",
              columns: 3,
              items: [
                {
                  name: "SAVANE RUSH",
                  description:
                    "Runner infini dans la savane. Évite les obstacles, collecte les cauris, bats ton record.",
                  price: 0,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "GRATUIT",
                  ctaLabel: "Télécharger",
                  ctaHref: "https://play.google.com",
                },
                {
                  name: "KORA LEGENDS",
                  description:
                    "Jeu de football africain. Joue avec les meilleures équipes du continent.",
                  price: 0,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "GRATUIT",
                  ctaLabel: "Télécharger",
                  ctaHref: "https://play.google.com",
                },
                {
                  name: "DAKAR DRIFT",
                  description:
                    "Course urbaine dans les vraies rues de Dakar. 12 voitures, 8 circuits.",
                  price: 0,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "GRATUIT",
                  ctaLabel: "Télécharger",
                  ctaHref: "https://play.google.com",
                },
                {
                  name: "SAHEL WARS",
                  description:
                    "Stratégie temps réel. Construis ton empire dans l'Afrique médiévale.",
                  price: 0,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "GRATUIT",
                  ctaLabel: "Télécharger",
                  ctaHref: "https://play.google.com",
                },
                {
                  name: "GRIOTS QUEST",
                  description:
                    "RPG aventure. Joue un griot qui parcourt l'Afrique pour rassembler des légendes perdues.",
                  price: 0,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "NOUVEAU",
                  ctaLabel: "Télécharger",
                  ctaHref: "https://play.google.com",
                },
                {
                  name: "BAOBAB TOWER",
                  description:
                    "Puzzle tower defense. Défends ton village contre les envahisseurs avec des tours de baobab.",
                  price: 0,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "GRATUIT",
                  ctaLabel: "Télécharger",
                  ctaHref: "https://play.google.com",
                },
              ],
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
              eyebrow: "Notre mission",
              heading: "Raconter l'Afrique\nà travers le jeu.",
              body: "Fondé à Dakar en 2019, KIWI GAMES est le premier studio de jeux vidéo du Sénégal à avoir atteint 2 millions de téléchargements. Notre équipe de 18 développeurs, artistes et game designers crée des expériences ancrées dans la culture et les paysages africains.",
              imageUrl: "",
              imageSide: "left",
            },
          },
          {
            type: "features",
            props: {
              heading: "On recrute",
              layout: "grid",
              items: [
                { icon: "💻", title: "Développeur Unity / Unreal", description: "3+ ans d'expérience mobile. Remote ou Dakar." },
                { icon: "🎨", title: "Game Artist 2D/3D", description: "Maîtrise Blender ou Spine2D. Portfolio requis." },
                { icon: "🎵", title: "Compositeur Jeux", description: "Musique africaine + sound design. Projet par projet." },
                { icon: "📱", title: "Product Manager", description: "Expérience free-to-play et analytics mobile." },
              ],
            },
          },
        ],
      },
    ],
  };
}
