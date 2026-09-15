import type { WebsiteDefinition } from "../website-schema";

/**
 * FIORE BEAUTÉ — luxury multi-service beauty studio.
 * Champagne ivory + dusty rose + truffle palette.
 * Cormorant Garamond (display) + DM Sans (body).
 * Multi-page: Accueil · Soins · Galerie · Histoire · Rendez-vous
 * WhatsApp booking, Wave/Orange Money, Dakar-first.
 */

const BRAND = "FIORE";
const WA_PHONE = "221700000001";
const WA_HREF = `https://wa.me/${WA_PHONE}`;

const NAV_LINKS = [
  { label: "Soins", href: "/soins" },
  { label: "Galerie", href: "/galerie" },
  { label: "Notre histoire", href: "/histoire" },
  { label: "Rendez-vous", href: "/rendez-vous" },
];

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: BRAND, links: [...NAV_LINKS] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© FIORE BEAUTÉ — Studio de beauté haut de gamme, Dakar · Mermoz. Sur rendez-vous uniquement.",
      links: [
        { label: "Soins", href: "/soins" },
        { label: "Galerie", href: "/galerie" },
        { label: "Histoire", href: "/histoire" },
        { label: "Rendez-vous", href: "/rendez-vous" },
      ],
    },
  };
}

export function fioreBeautyWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "FIORE BEAUTÉ",
    theme: {
      primary: "#2C1A1A",
      accent: "#C8A87A",
      background: "#FBF7F2",
      text: "#2C1A1A",
      surface: "#F5EDE4",
      fontDisplay: "Cormorant Garamond",
      fontBody: "DM Sans",
      spacing: "airy",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "soft",
      aestheticId: "luxury-beauty-studio-ivory",
      currency: "XOF",
    },
    pages: [
      /* ── ACCUEIL ─────────────────────────────────────────────────────────── */
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("fiore-nav-home"),
          {
            id: "fiore-announce",
            type: "announcement-bar",
            props: {
              text: "✦ Nouveau : Ritual Glow au Karité & Rose — Réservez votre séance",
              href: "/rendez-vous",
              background: "#2C1A1A",
              color: "#F5EDE4",
            },
          },
          {
            id: "fiore-hero",
            type: "editorial-hero",
            props: {
              heading: "L'art du soin, pensé pour vous.",
              subheading:
                "Soins visage, corps et mains réalisés à la main par nos expertes. Produits naturels sélectionnés. Un rituel de beauté sur mesure, dans un espace serein.",
              buttonLabel: "Prendre rendez-vous",
              buttonHref: "/rendez-vous",
              imageUrl: "",
              imageAlt: "Studio FIORE BEAUTÉ Dakar",
              overlayOpacity: 0.18,
              align: "left",
              heightVh: 80,
            },
          },
          {
            id: "fiore-intro-text",
            type: "text",
            props: {
              heading: "Bienvenue chez FIORE",
              body: "Fondé à Dakar en 2019, FIORE BEAUTÉ est un studio de soins haut de gamme — un espace calme, intime, où chaque détail compte. Nos praticiennes sont formées aux techniques européennes et adaptent chaque soin aux peaux africaines. Bienvenue.",
            },
          },
          {
            id: "fiore-services-overview",
            type: "features",
            props: {
              heading: "Nos signatures",
              subheading: "Chaque soin est réalisé en rendez-vous privé.",
              items: [
                {
                  icon: "✦",
                  title: "Soins visage",
                  body: "Nettoyage profond, hydratation intensive, exfoliation douce. Adapté à tous les types de peaux, y compris peaux mates et noires. À partir de 18 000 FCFA.",
                  href: "/soins",
                },
                {
                  icon: "◈",
                  title: "Soin corps complet",
                  body: "Gommage au sel de mer, enveloppement au karité, massage modelant. 90 minutes de détente profonde. À partir de 32 000 FCFA.",
                  href: "/soins",
                },
                {
                  icon: "❋",
                  title: "Manucure & Pédicure",
                  body: "Pose gel, semi-permanent ou vernis ordinaire. Nail art sur demande. Ambiance douce, résultat impeccable. À partir de 8 500 FCFA.",
                  href: "/soins",
                },
              ],
            },
          },
          {
            id: "fiore-gallery-strip",
            type: "gallery",
            props: {
              heading: "L'atmosphère FIORE",
              layout: "masonry",
              items: [
                { src: "", alt: "Studio FIORE Dakar — table de soins" },
                { src: "", alt: "Produits naturels karité & rose" },
                { src: "", alt: "Soin visage en cours" },
                { src: "", alt: "Résultat manucure gel" },
                { src: "", alt: "Espace détente FIORE" },
                { src: "", alt: "Rituel corps enveloppement" },
              ],
            },
          },
          {
            id: "fiore-testimonials",
            type: "testimonials",
            props: {
              heading: "Ce que disent nos clientes",
              items: [
                {
                  quote:
                    "Un soin visage incroyable. Ma peau n'a jamais été aussi lumineuse. L'espace est magnifique, les praticiennes sont attentionnées.",
                  name: "Fatou D.",
                  role: "Cliente depuis 2021",
                },
                {
                  quote:
                    "J'ai fait mon soin corps pour mon mariage ici. J'étais tellement bien. Je recommande à toutes les mariées dakaroises.",
                  name: "Mariama S.",
                  role: "Cliente depuis 2022",
                },
                {
                  quote:
                    "Mes ongles ont l'air parfaits depuis 3 semaines — le gel dure vraiment. Et l'ambiance est tellement reposante.",
                  name: "Awa B.",
                  role: "Cliente fidèle",
                },
              ],
            },
          },
          {
            id: "fiore-cta",
            type: "split",
            props: {
              heading: "Prête pour votre rituel ?",
              body: "Prenez rendez-vous par WhatsApp ou via notre formulaire. Réponse en moins de 2 heures. Lundi–Samedi, 9h–19h.",
              imageUrl: "",
              imageAlt: "Espace FIORE BEAUTÉ",
              imagePosition: "right",
              buttonLabel: "Réserver par WhatsApp",
              buttonHref: WA_HREF,
              background: "#F5EDE4",
            },
          },
          footer("fiore-footer-home"),
        ],
      },

      /* ── SOINS ───────────────────────────────────────────────────────────── */
      {
        slug: "soins",
        title: "Soins",
        sections: [
          nav("fiore-nav-soins"),
          {
            id: "fiore-soins-hero",
            type: "hero",
            props: {
              heading: "Chaque soin, un rituel.",
              subheading:
                "Des soins certifiés, adaptés aux peaux africaines. Durées et tarifs indicatifs — votre praticienne ajuste selon vos besoins.",
              buttonLabel: "Prendre rendez-vous",
              buttonHref: "/rendez-vous",
              align: "center",
            },
          },
          {
            id: "fiore-soins-visage",
            type: "products",
            props: {
              heading: "Soins visage",
              layout: "list",
              items: [
                {
                  name: "Soin Éclat Karité",
                  description:
                    "Nettoyage double, exfoliation enzymatique, masque hydratant au beurre de karité, crème de jour SPF. 60 min.",
                  priceLabel: "22 000 FCFA",
                  badge: "Best-seller",
                  whatsappMessage:
                    "Bonjour, je voudrais réserver le Soin Éclat Karité chez FIORE BEAUTÉ.",
                },
                {
                  name: "Soin Pureté",
                  description:
                    "Dédié aux peaux grasses et acnéiques. Nettoyage profond, extraction douce, soin matifiant. 60 min.",
                  priceLabel: "20 000 FCFA",
                  whatsappMessage:
                    "Bonjour, je voudrais réserver le Soin Pureté chez FIORE BEAUTÉ.",
                },
                {
                  name: "Soin Anti-Taches",
                  description:
                    "Protocole ciblé hyperpigmentation : exfoliation acides, sérum vitamine C, masque illuminateur. 75 min.",
                  priceLabel: "28 000 FCFA",
                  badge: "Nouveau",
                  whatsappMessage:
                    "Bonjour, je voudrais réserver le Soin Anti-Taches chez FIORE BEAUTÉ.",
                },
                {
                  name: "Ritual Glow Prestige",
                  description:
                    "Notre soin signature en 5 étapes : nettoyage, gommage, masque argile, sérum actif, massage crânien. 90 min.",
                  priceLabel: "38 000 FCFA",
                  badge: "Signature",
                  whatsappMessage:
                    "Bonjour, je voudrais réserver le Ritual Glow Prestige chez FIORE BEAUTÉ.",
                },
                {
                  name: "Consultation peau + protocole",
                  description:
                    "Diagnostic de peau par notre experte, plan de soins personnalisé et recommandations produits. 45 min.",
                  priceLabel: "12 000 FCFA",
                  whatsappMessage:
                    "Bonjour, je voudrais réserver une consultation peau chez FIORE BEAUTÉ.",
                },
              ],
            },
          },
          {
            id: "fiore-soins-corps",
            type: "products",
            props: {
              heading: "Soins corps",
              layout: "list",
              items: [
                {
                  name: "Gommage sel & karité",
                  description:
                    "Gommage au sel de mer rose, beurre de karité pur, huile de coco. Peau soyeuse, hydratation longue durée. 50 min.",
                  priceLabel: "22 000 FCFA",
                  whatsappMessage:
                    "Bonjour, je voudrais réserver le Gommage sel & karité chez FIORE BEAUTÉ.",
                },
                {
                  name: "Enveloppement argileux",
                  description:
                    "Argile blanche, huiles essentielles, enveloppement chaud, massage finalisant. Détox et fermeté. 70 min.",
                  priceLabel: "28 000 FCFA",
                  whatsappMessage:
                    "Bonjour, je voudrais réserver l'Enveloppement argileux chez FIORE BEAUTÉ.",
                },
                {
                  name: "Soin corps complet",
                  description:
                    "Gommage + enveloppement + massage modelant. Le rituel ultime. 90 min.",
                  priceLabel: "40 000 FCFA",
                  badge: "Premium",
                  whatsappMessage:
                    "Bonjour, je voudrais réserver le Soin corps complet chez FIORE BEAUTÉ.",
                },
                {
                  name: "Massage relaxant",
                  description:
                    "Massage suédois aux huiles chaudes, centré sur le dos, les épaules et les jambes. 60 min.",
                  priceLabel: "25 000 FCFA",
                  whatsappMessage:
                    "Bonjour, je voudrais réserver le Massage relaxant chez FIORE BEAUTÉ.",
                },
              ],
            },
          },
          {
            id: "fiore-soins-mains",
            type: "products",
            props: {
              heading: "Mains & pieds",
              layout: "list",
              items: [
                {
                  name: "Manucure classique",
                  description: "Lime, cuticules, massage mains, vernis au choix. 30 min.",
                  priceLabel: "8 500 FCFA",
                  whatsappMessage:
                    "Bonjour, je voudrais réserver une Manucure classique chez FIORE BEAUTÉ.",
                },
                {
                  name: "Manucure semi-permanent",
                  description: "Vernis semi-permanent tenue 2–3 semaines. 45 min.",
                  priceLabel: "12 000 FCFA",
                  whatsappMessage:
                    "Bonjour, je voudrais réserver une Manucure semi-permanent chez FIORE BEAUTÉ.",
                },
                {
                  name: "Pose gel",
                  description: "Extension gel builder, lime et finition. Tenue 3–4 semaines. 60 min.",
                  priceLabel: "18 000 FCFA",
                  whatsappMessage:
                    "Bonjour, je voudrais réserver une Pose gel chez FIORE BEAUTÉ.",
                },
                {
                  name: "Pédicure complète",
                  description: "Soin pieds, bain, lime, gommage, cuticules, massage, vernis. 50 min.",
                  priceLabel: "14 000 FCFA",
                  whatsappMessage:
                    "Bonjour, je voudrais réserver une Pédicure complète chez FIORE BEAUTÉ.",
                },
                {
                  name: "Nail art",
                  description:
                    "Sur base semi ou gel. Motifs simples à complexes. Supplément sur devis.",
                  priceLabel: "Dès 3 000 FCFA",
                  badge: "Sur demande",
                  whatsappMessage:
                    "Bonjour, je voudrais me renseigner sur le nail art chez FIORE BEAUTÉ.",
                },
              ],
            },
          },
          {
            id: "fiore-soins-note",
            type: "text",
            props: {
              heading: "Informations pratiques",
              body: "Paiement : Wave, Orange Money, carte bancaire. Annulation gratuite jusqu'à 24h avant. Sur rendez-vous uniquement — pas de passage sans réservation.",
            },
          },
          {
            id: "fiore-soins-wa",
            type: "whatsapp",
            props: {
              label: "Réserver par WhatsApp",
              phone: WA_PHONE,
              message: "Bonjour, je voudrais réserver un soin chez FIORE BEAUTÉ. Quelles sont vos disponibilités ?",
            },
          },
          footer("fiore-footer-soins"),
        ],
      },

      /* ── GALERIE ─────────────────────────────────────────────────────────── */
      {
        slug: "galerie",
        title: "Galerie",
        sections: [
          nav("fiore-nav-galerie"),
          {
            id: "fiore-galerie-hero",
            type: "hero",
            props: {
              heading: "Le soin en images.",
              subheading:
                "Résultats, ambiance et détails de notre studio. Chaque photo raconte un moment de soin.",
              buttonLabel: "Prendre rendez-vous",
              buttonHref: "/rendez-vous",
              align: "center",
            },
          },
          {
            id: "fiore-galerie-grid",
            type: "gallery",
            props: {
              heading: "Notre travail",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Soin visage Éclat Karité — résultat" },
                { src: "", alt: "Studio de soins FIORE" },
                { src: "", alt: "Manucure gel nude" },
                { src: "", alt: "Massage corps huiles chaudes" },
                { src: "", alt: "Produits naturels utilisés" },
                { src: "", alt: "Pédicure complète résultat" },
                { src: "", alt: "Espace détente FIORE Dakar" },
                { src: "", alt: "Soin anti-taches — résultat" },
                { src: "", alt: "Nail art floral" },
                { src: "", alt: "Enveloppement argileux" },
                { src: "", alt: "Gommage sel & karité" },
                { src: "", alt: "Table de soins — studio intime" },
              ],
              instagramHandle: "fiorebeaute_dakar",
              followLabel: "Suivez FIORE sur Instagram",
            },
          },
          footer("fiore-footer-galerie"),
        ],
      },

      /* ── HISTOIRE ────────────────────────────────────────────────────────── */
      {
        slug: "histoire",
        title: "Notre histoire",
        sections: [
          nav("fiore-nav-histoire"),
          {
            id: "fiore-about-hero",
            type: "hero",
            props: {
              heading: "Née d'un amour du soin bien fait.",
              subheading:
                "FIORE BEAUTÉ, c'est l'idée que chaque femme mérite un moment rien qu'à elle — un espace calme, des mains expertes, des produits qui respectent sa peau.",
              buttonLabel: "Découvrir nos soins",
              buttonHref: "/soins",
              align: "center",
            },
          },
          {
            id: "fiore-story",
            type: "split",
            props: {
              heading: "Pourquoi FIORE ?",
              body: "Seynabou a fondé FIORE après 8 ans de formation en esthétique à Paris et à Dakar. Revenue au Sénégal en 2019, elle voulait créer quelque chose qui manquait : un studio haut de gamme, intime, pensé pour les femmes dakaroises.\n\nFIORE — le mot italien pour \"fleur\" — symbolise l'épanouissement, la beauté qui grandit avec soin. Aujourd'hui, l'équipe FIORE comprend trois praticiennes formées aux techniques européennes et africaines. Chaque soin est personnalisé. Chaque rendez-vous est un moment à part entière.",
              imageUrl: "",
              imageAlt: "Seynabou — fondatrice de FIORE BEAUTÉ, Dakar",
              imagePosition: "right",
            },
          },
          {
            id: "fiore-values",
            type: "features",
            props: {
              heading: "Nos engagements",
              items: [
                {
                  icon: "✦",
                  title: "Produits naturels",
                  body: "Karité, moringa, huile de baobab — des actifs africains purs, choisis avec soin.",
                },
                {
                  icon: "◈",
                  title: "Soins adaptés",
                  body: "Nos protocoles sont formulés et testés sur toutes les carnations, des peaux claires aux peaux les plus foncées.",
                },
                {
                  icon: "❋",
                  title: "Expérience privée",
                  body: "Pas de studio ouvert : chaque rendez-vous est individuel. Votre heure vous appartient.",
                },
              ],
            },
          },
          {
            id: "fiore-team",
            type: "features",
            props: {
              heading: "L'équipe",
              items: [
                {
                  title: "Seynabou Diallo",
                  body: "Fondatrice & praticienne senior. Diplômée en esthétique cosmétique, spécialiste soins visage & peaux africaines. 12 ans d'expérience.",
                  imageUrl: "",
                },
                {
                  title: "Aminata Fall",
                  body: "Praticienne — Soins corps. Masseuse certifiée, spécialiste enveloppements et gommages. Ancienne du groupe Terrou-Bi.",
                  imageUrl: "",
                },
                {
                  title: "Rokhaya Ndiaye",
                  body: "Nail artist & praticienne mains. Nail art, pose gel et semi-permanent. Formée à Dakar et Abidjan.",
                  imageUrl: "",
                },
              ],
            },
          },
          {
            id: "fiore-stats",
            type: "stats",
            props: {
              items: [
                { value: "2019", label: "Année de fondation" },
                { value: "3", label: "Praticiennes expertes" },
                { value: "500", label: "Clientes fidèles", suffix: "+" },
                { value: "2h", label: "Délai de réponse max" },
              ],
            },
          },
          footer("fiore-footer-histoire"),
        ],
      },

      /* ── RENDEZ-VOUS ─────────────────────────────────────────────────────── */
      {
        slug: "rendez-vous",
        title: "Rendez-vous",
        sections: [
          nav("fiore-nav-rdv"),
          {
            id: "fiore-rdv-hero",
            type: "hero",
            props: {
              heading: "Votre rituel vous attend.",
              subheading:
                "Réservez par WhatsApp pour une réponse rapide, ou remplissez le formulaire ci-dessous. Réponse garantie en moins de 2 heures.",
              buttonLabel: "Réserver par WhatsApp",
              buttonHref: WA_HREF,
              align: "center",
            },
          },
          {
            id: "fiore-rdv-whatsapp",
            type: "whatsapp",
            props: {
              label: "Réserver par WhatsApp — réponse en moins de 2h",
              phone: WA_PHONE,
              message: "Bonjour, je voudrais réserver un soin chez FIORE BEAUTÉ. Quelles sont vos disponibilités ?",
            },
          },
          {
            id: "fiore-contact-form",
            type: "form",
            props: {
              heading: "Ou remplissez le formulaire",
              subheading: "Nous vous confirmons votre rendez-vous par WhatsApp dans les 2 heures.",
              buttonLabel: "Envoyer la demande",
              successMessage:
                "Merci ! Nous vous confirmons votre rendez-vous par WhatsApp dans les 2 heures.",
              notifyEmail: "contact@fiorebeaute.sn",
              fields: [
                { id: "name", label: "Prénom & Nom", type: "text", required: true, placeholder: "Votre nom complet", options: [] },
                { id: "phone", label: "Téléphone (WhatsApp)", type: "phone", required: true, placeholder: "+221 70 000 00 00", options: [] },
                {
                  id: "service",
                  label: "Soin souhaité",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: [
                    "Soin Éclat Karité",
                    "Soin Pureté",
                    "Soin Anti-Taches",
                    "Ritual Glow Prestige",
                    "Soin corps complet",
                    "Massage relaxant",
                    "Manucure / Pédicure",
                    "Pose gel",
                    "Autre",
                  ],
                },
                {
                  id: "date",
                  label: "Date souhaitée",
                  type: "text",
                  required: false,
                  placeholder: "Ex: Samedi 15 juin, matin",
                  options: [],
                },
                { id: "message", label: "Informations complémentaires", type: "textarea", required: false, placeholder: "", options: [] },
              ],
            },
          },
          {
            id: "fiore-contact-info",
            type: "contact",
            props: {
              heading: "Nous trouver",
              address: "Rue 12, Mermoz · Dakar, Sénégal · Studio privé, sur rendez-vous uniquement",
              phone: "+221 70 000 00 01",
              email: "contact@fiorebeaute.sn",
            },
          },
          {
            id: "fiore-map",
            type: "map",
            props: {
              heading: "Localisation",
              address: "Mermoz, Dakar, Sénégal",
              latitude: 14.7167,
              longitude: -17.4677,
              zoom: 15,
            },
          },
          {
            id: "fiore-hours",
            type: "text",
            props: {
              heading: "Horaires",
              body: "Lundi – Vendredi : 09h00 – 19h00\nSamedi : 09h00 – 17h00\nDimanche : Fermé\n\nStudio privé — sur rendez-vous uniquement. Sonnez à l'interphone FIORE.",
            },
          },
          footer("fiore-footer-rdv"),
        ],
      },
    ],
  };
}
