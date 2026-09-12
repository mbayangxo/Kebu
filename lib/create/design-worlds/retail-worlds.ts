import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Electronics Store — phones, accessories, repairs, Wave/OM payments
 * Supermarket / Grocery — daily staples, WhatsApp orders, delivery
 */

function nav(id: string, brand: string, links: { label: string; href: string }[]) {
  return { id, type: "navigation" as const, props: { brand, links } };
}
function footer(id: string, text: string, links: { label: string; href: string }[]) {
  return { id, type: "footer" as const, props: { text, links } };
}

// ─── ELECTRONICS STORE ────────────────────────────────────────────────────────

const ELEC_NAV = [
  { label: "Téléphones", href: "/telephones" },
  { label: "Accessoires", href: "/accessoires" },
  { label: "Réparation", href: "/reparation" },
  { label: "Commander", href: "/commander" },
  { label: "Contact", href: "/contact" },
];

export function electronicsStoreWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Boutique high-tech",
    theme: {
      primary: "#0A0F1E",
      accent: "#0099FF",
      background: "#F4F6FA",
      text: "#0A0F1E",
      fontDisplay: "Space Grotesk",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "electronics-tech-blue",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("el-nav-home", "TECHZONE", ELEC_NAV),
          {
            id: "el-announce",
            type: "announcement-bar",
            props: {
              text: "iPhone 15 & Samsung S24 disponibles — paiement en 3 fois Wave · Réparation express 2h",
              background: "#0099FF",
              textColor: "#FFFFFF",
            },
          },
          {
            id: "el-hero",
            type: "hero",
            props: {
              heading: "Téléphones, accessoires\net réparation.",
              subheading:
                "Smartphone neufs et reconditionnés — iPhone, Samsung, Tecno, Infinix. Réparation express sur place. Paiement Wave, Orange Money ou espèces.",
              buttonLabel: "Voir les téléphones",
              buttonHref: "/telephones",
              align: "left",
              background: "#0A0F1E",
            },
          },
          {
            id: "el-featured",
            type: "products",
            props: {
              heading: "Téléphones du moment",
              subheading: "Neufs et reconditionnés. Prix compétitifs — on peut vérifier ensemble. Paiement en plusieurs fois disponible.",
              items: [],
            },
          },
          {
            id: "el-services",
            type: "features",
            props: {
              heading: "Nos services",
              items: [
                { title: "Vente neuf & reconditionné", body: "iPhone, Samsung Galaxy, Tecno, Infinix, Huawei. Neufs avec garantie constructeur. Reconditionnés Grade A — comme neufs, prix réduit." },
                { title: "Réparation express", body: "Écran cassé, batterie morte, connecteur HS — réparation sur place en 1–2h. Pièces d'origine ou premium. Devis immédiat." },
                { title: "Déverrouillage réseau", body: "Téléphone bloqué opérateur ? On débloque sous 30 min. Tous opérateurs, tous modèles." },
                { title: "Reprise & échange", body: "Votre ancien téléphone a de la valeur. On l'évalue, on reprend, vous payez la différence. Simple." },
                { title: "Accessoires", body: "Coques, chargeurs, écouteurs, câbles, powerbanks — marques originales et compatibles. Stock permanent." },
                { title: "Paiement en plusieurs fois", body: "Achat à partir de 150 000 XOF — paiement en 2 ou 3 fois par Wave. Sans intérêt, sur confirmation." },
              ],
            },
          },
          {
            id: "el-brands",
            type: "features",
            props: {
              heading: "Nos marques",
              items: [
                { title: "Apple iPhone", body: "iPhone 12 à 15 Pro Max. Neufs et reconditionnés Grade A. Garantie 6 mois sur reconditionné." },
                { title: "Samsung Galaxy", body: "Série S et A — du mid-range à la gamme ultra. Stocks réguliers, modèles dernière génération." },
                { title: "Tecno & Infinix", body: "Les marques populaires en Afrique. Bonne autonomie, grand écran, tarif accessible. Idéal premier smartphone." },
                { title: "Accessoires tout type", body: "Airpods, Galaxy Buds, JBL, Anker, Belkin — marques originales à prix concurrentiel." },
              ],
            },
          },
          {
            id: "el-testimonials",
            type: "testimonials",
            props: {
              heading: "Avis clients",
              items: [
                {
                  quote: "Écran fissuré un lundi matin. Réparation faite en 1h30, téléphone comme neuf. Prix raisonnable, technicien sérieux.",
                  name: "Ibrahima N.",
                  role: "Réparation iPhone 13 — Dakar",
                },
                {
                  quote: "Acheté un Samsung S23 reconditionné Grade A — impossible de voir que c'est pas neuf. Garantie 6 mois, pas eu un seul problème.",
                  name: "Mariama K.",
                  role: "Achat reconditionné — Dakar",
                },
              ],
            },
          },
          {
            id: "el-wa-home",
            type: "whatsapp",
            props: {
              label: "Disponibilités & prix — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je cherche :\n- Modèle :\n- Neuf ou reconditionné :\n- Budget :\nAvez-vous en stock ?",
            },
          },
          footer("el-footer-home", "© TECHZONE — téléphones, accessoires, réparation express. Dakar · Wave & Orange Money.", ELEC_NAV),
        ],
      },
      {
        slug: "telephones",
        title: "Téléphones",
        sections: [
          nav("el-nav-tel", "TECHZONE", ELEC_NAV),
          {
            id: "el-tel-hero",
            type: "hero",
            props: {
              heading: "Téléphones",
              subheading: "iPhone, Samsung, Tecno, Infinix — neufs et reconditionnés. Demandez disponibilité et prix sur WhatsApp.",
              buttonLabel: "Commander",
              buttonHref: "/commander",
              align: "left",
              background: "#0A0F1E",
            },
          },
          {
            id: "el-tel-grid",
            type: "products",
            props: {
              heading: "Tous les modèles",
              subheading: "Neufs avec garantie constructeur. Reconditionnés Grade A : garantie 6 mois, état proche du neuf.",
              items: [],
            },
          },
          {
            id: "el-tel-categories",
            type: "features",
            props: {
              heading: "Par gamme de prix",
              items: [
                { title: "Entrée de gamme (< 150 000 XOF)", body: "Tecno Spark, Infinix Hot, Samsung Galaxy A — premier smartphone, WhatsApp, réseaux sociaux, photo correcte." },
                { title: "Milieu de gamme (150–300 000 XOF)", body: "Samsung A54, Infinix Zero, Tecno Camon — caméra excellente, autonomie solide, performance fluide." },
                { title: "Haut de gamme (300 000+ XOF)", body: "iPhone 13–15, Samsung S23/S24 — performances premium. Neufs ou reconditionnés Grade A." },
                { title: "Reconditionnés (–30 à –50%)", body: "Mêmes modèles, état Grade A (quasi-neuf). Garantie 6 mois. Idéal pour avoir un iPhone sans le prix neuf." },
              ],
            },
          },
          {
            id: "el-tel-wa",
            type: "whatsapp",
            props: {
              label: "Vérifier disponibilité et prix — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je cherche le modèle suivant :\n- Modèle :\n- Neuf ou reconditionné :\n- Avez-vous en stock ?",
            },
          },
          footer("el-footer-tel", "© TECHZONE.", ELEC_NAV),
        ],
      },
      {
        slug: "accessoires",
        title: "Accessoires",
        sections: [
          nav("el-nav-acc", "TECHZONE", ELEC_NAV),
          {
            id: "el-acc-hero",
            type: "hero",
            props: {
              heading: "Accessoires",
              subheading: "Coques, chargeurs, écouteurs, powerbanks — marques originales et compatibles. Stock permanent.",
              buttonLabel: "Commander",
              buttonHref: "/commander",
              align: "left",
              background: "#0A0F1E",
            },
          },
          {
            id: "el-acc-grid",
            type: "products",
            props: {
              heading: "Tous les accessoires",
              subheading: "Disponibles en boutique ou livraison J+1 à Dakar.",
              items: [],
            },
          },
          footer("el-footer-acc", "© TECHZONE.", ELEC_NAV),
        ],
      },
      {
        slug: "reparation",
        title: "Réparation",
        sections: [
          nav("el-nav-rep", "TECHZONE", ELEC_NAV),
          {
            id: "el-rep-hero",
            type: "hero",
            props: {
              heading: "Réparation express",
              subheading: "Écran, batterie, connecteur, micro — réparé en 1–2h sur place. Devis immédiat sur WhatsApp.",
              buttonLabel: "Demander un devis",
              buttonHref: "#devis",
              align: "left",
              background: "#0A0F1E",
            },
          },
          {
            id: "el-rep-services",
            type: "features",
            props: {
              heading: "Réparations courantes",
              items: [
                { title: "Remplacement d'écran", body: "Écran fissuré ou cassé. Dalle originale ou premium selon budget. iPhone, Samsung, Tecno. 1–2h sur place." },
                { title: "Remplacement de batterie", body: "Autonomie qui chute ? On remplace en 30 min. Batterie originale ou haute capacité." },
                { title: "Connecteur de charge", body: "Téléphone qui ne charge plus. Nettoyage ou remplacement. 30 min à 1h." },
                { title: "Micro & haut-parleur", body: "Personne ne vous entend ? Haut-parleur grillé ? Réparation en 1h." },
                { title: "Récupération de données", body: "Téléphone ne démarre plus ? On récupère vos contacts, photos, fichiers. Devis selon complexité." },
                { title: "Réinitialisation & virus", body: "Téléphone lent ou infecté — nettoyage, remise à neuf logicielle. 30 min." },
              ],
            },
          },
          {
            id: "el-rep-devis",
            type: "form",
            props: {
              heading: "Demander un devis réparation",
              subheading: "Devis immédiat — apportez votre téléphone ou envoyez une photo du problème.",
              buttonLabel: "Envoyer",
              successMessage: "Demande reçue — on vous envoie le devis sur WhatsApp sous 30 min.",
              fields: [
                { id: "nom", label: "Prénom", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "modele", label: "Modèle de téléphone", type: "text", required: true, placeholder: "iPhone 13, Samsung A54…", options: [] },
                { id: "probleme", label: "Description du problème", type: "select", required: true, placeholder: "", options: ["Écran cassé / fissuré", "Batterie faible / ne charge plus", "Connecteur de charge HS", "Micro / haut-parleur", "Téléphone ne démarre plus", "Autre"] },
                { id: "details", label: "Détails", type: "textarea", required: false, placeholder: "Tombé, mouillé, soudainement, depuis quand…", options: [] },
              ],
            },
          },
          {
            id: "el-rep-wa",
            type: "whatsapp",
            props: {
              label: "Devis réparation — WhatsApp (envoyez une photo)",
              phone: "+221770000000",
              message: "Bonjour — j'ai besoin d'une réparation :\n- Modèle :\n- Problème :\n(Je peux envoyer une photo du problème)",
            },
          },
          footer("el-footer-rep", "© TECHZONE.", ELEC_NAV),
        ],
      },
      {
        slug: "commander",
        title: "Commander",
        sections: [
          nav("el-nav-cmd", "TECHZONE", ELEC_NAV),
          {
            id: "el-cmd-hero",
            type: "hero",
            props: {
              heading: "Commander",
              subheading: "Livraison Dakar J+1. Paiement Wave, Orange Money, espèces. Paiement en 2–3 fois disponible.",
              buttonLabel: "Passer commande",
              buttonHref: "#form",
              align: "left",
              background: "#0A0F1E",
            },
          },
          {
            id: "el-cmd-form",
            type: "form",
            props: {
              heading: "Commande",
              subheading: "Précisez le modèle et on vérifie le stock immédiatement.",
              buttonLabel: "Envoyer ma commande",
              successMessage: "Commande reçue — on vérifie le stock et vous répond sous 30 min.",
              fields: [
                { id: "nom", label: "Prénom et nom", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "produit", label: "Produit souhaité", type: "text", required: true, placeholder: "iPhone 14 128Go, Samsung S24, Coque iPhone 15…", options: [] },
                { id: "neuf", label: "Neuf ou reconditionné", type: "select", required: false, placeholder: "", options: ["Neuf", "Reconditionné Grade A (moins cher)", "Sans préférence"] },
                { id: "paiement", label: "Mode de paiement", type: "select", required: false, placeholder: "", options: ["Wave", "Orange Money", "Espèces à la livraison", "Paiement en 2 fois (Wave)", "Paiement en 3 fois (Wave)"] },
                { id: "adresse", label: "Adresse de livraison", type: "text", required: false, placeholder: "Quartier, ville — ou retrait boutique", options: [] },
              ],
            },
          },
          {
            id: "el-cmd-wa",
            type: "whatsapp",
            props: {
              label: "Commander sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander :\n- Produit :\n- Neuf ou reconditionné :\n- Paiement :",
            },
          },
          footer("el-footer-cmd", "© TECHZONE.", ELEC_NAV),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("el-nav-contact", "TECHZONE", ELEC_NAV),
          {
            id: "el-contact",
            type: "contact",
            props: {
              heading: "Nous trouver",
              email: "techzone@example.com",
              phone: "+221770000000",
              address: "Boutique — Dakar Centre · Lun–sam 9h–19h · Dim 10h–14h",
            },
          },
          {
            id: "el-contact-faq",
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                { question: "Garantie sur les appareils reconditionnés ?", answer: "6 mois de garantie sur tous les reconditionnés Grade A. Panne couverte — remplacement ou remboursement." },
                { question: "Puis-je vendre mon téléphone ?", answer: "Oui — rachat et reprise possible. Apportez votre téléphone ou envoyez photos + modèle sur WhatsApp pour une estimation." },
                { question: "Paiement en plusieurs fois ?", answer: "Dès 150 000 XOF d'achat, paiement en 2 ou 3 fois par Wave. Confirmé à la commande, sans intérêt." },
                { question: "Délai de réparation ?", answer: "La plupart des réparations : 1–2h sur place. Pièces à commander : 24–48h. On vous donne une heure précise à la dépose." },
              ],
            },
          },
          footer("el-footer-contact", "© TECHZONE — téléphones, accessoires, réparation express.", ELEC_NAV),
        ],
      },
    ],
  };
}

// ─── SUPERMARKET / GROCERY STORE ──────────────────────────────────────────────

const SUPER_NAV = [
  { label: "Produits", href: "/produits" },
  { label: "Promotions", href: "/promotions" },
  { label: "Livraison", href: "/livraison" },
  { label: "Commander", href: "/commander" },
];

export function supermarketWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Supermarché",
    theme: {
      primary: "#1A3A2A",
      accent: "#F5A623",
      background: "#F8FAF8",
      text: "#1A3A2A",
      fontDisplay: "Plus Jakarta Sans",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "md",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "supermarket-fresh-green",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("sm-nav-home", "MARCHÉ EXPRESS", SUPER_NAV),
          {
            id: "sm-announce",
            type: "announcement-bar",
            props: {
              text: "Livraison express Dakar en 2h · Commandez avant 18h pour livraison en soirée · Wave & Orange Money",
              background: "#F5A623",
              textColor: "#1A3A2A",
            },
          },
          {
            id: "sm-hero",
            type: "hero",
            props: {
              heading: "Courses livrées\nchez vous en 2h.",
              subheading:
                "Épicerie, fruits & légumes, viandes, produits ménagers — commandez sur WhatsApp et recevez à domicile. Paiement Wave, Orange Money ou espèces.",
              buttonLabel: "Commander maintenant",
              buttonHref: "/commander",
              align: "left",
              background: "#1A3A2A",
            },
          },
          {
            id: "sm-categories",
            type: "features",
            props: {
              heading: "Nos rayons",
              items: [
                { title: "Fruits & légumes", body: "Produits frais arrivés chaque matin. Mangues, tomates, oignons, choux, carottes, bananes — locaux et importés." },
                { title: "Viandes & poissons", body: "Viande bovine, agneau, volaille, poisson frais. Découpé selon votre demande. Commandez la veille pour le lendemain." },
                { title: "Épicerie & condiments", body: "Riz brisé 25kg, huile, farine, lait en poudre, Nescafé, sucre, sel — les essentiels toujours en stock." },
                { title: "Produits ménagers", body: "Detol, OMO, javel, produits vaisselle, essuie-tout — livraison avec vos courses." },
                { title: "Boissons", body: "Eau fraîche, jus, sodas, thé Lipton, lait Dolait — pack famille disponible." },
                { title: "Bébé & enfants", body: "Couches Pampers, lait bébé, petits pots, jus enfants — disponibles à la commande." },
              ],
            },
          },
          {
            id: "sm-promos",
            type: "products",
            props: {
              heading: "Promotions de la semaine",
              subheading: "Offres valables jusqu'au dimanche. Commandez vite — quantités limitées.",
              items: [],
            },
          },
          {
            id: "sm-how",
            type: "features",
            props: {
              heading: "Comment ça marche",
              items: [
                { title: "1. Envoyez votre liste", body: "WhatsApp ou formulaire — envoyez ce dont vous avez besoin. Pas besoin de tout connaître exactement." },
                { title: "2. On confirme & prépare", body: "Réponse sous 15 min avec disponibilités et prix total. On prépare votre commande." },
                { title: "3. Livraison 2h", body: "Livraison en moins de 2h à Dakar. Heure précise confirmée par WhatsApp." },
                { title: "4. Payez à la livraison", body: "Wave, Orange Money ou espèces — à la réception. Pas de paiement en avance obligatoire." },
              ],
            },
          },
          {
            id: "sm-testimonials",
            type: "testimonials",
            props: {
              heading: "Ils nous font confiance",
              items: [
                {
                  quote: "J'envoie ma liste WhatsApp le matin, j'ai tout chez moi avant midi. Plus besoin de se déplacer avec les enfants. Vraiment pratique.",
                  name: "Aïcha D.",
                  role: "Cliente régulière — Dakar",
                },
                {
                  quote: "Le riz et l'huile arrivés frais, bien emballés. Prix pareil qu'au marché et on vous livre. Pourquoi aller ailleurs ?",
                  name: "Moussa F.",
                  role: "Client — Thiès",
                },
              ],
            },
          },
          {
            id: "sm-wa-home",
            type: "whatsapp",
            props: {
              label: "Envoyer ma liste de courses — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — voici ma liste de courses :\n\n(listez vos produits et quantités)\n\nAdresse de livraison :",
            },
          },
          footer("sm-footer-home", "© MARCHÉ EXPRESS — livraison courses en 2h. Dakar · Wave & Orange Money · 7j/7.", SUPER_NAV),
        ],
      },
      {
        slug: "produits",
        title: "Produits",
        sections: [
          nav("sm-nav-produits", "MARCHÉ EXPRESS", SUPER_NAV),
          {
            id: "sm-prod-hero",
            type: "hero",
            props: {
              heading: "Tous nos produits",
              subheading: "Commandez par catégorie ou envoyez votre liste complète sur WhatsApp.",
              buttonLabel: "Commander",
              buttonHref: "/commander",
              align: "left",
              background: "#1A3A2A",
            },
          },
          {
            id: "sm-prod-grid",
            type: "products",
            props: {
              heading: "Produits disponibles",
              subheading: "Stocks mis à jour quotidiennement. Prix affichés par unité ou par kilo selon le produit.",
              items: [],
            },
          },
          {
            id: "sm-prod-wa",
            type: "whatsapp",
            props: {
              label: "Commander — envoyez votre liste sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — voici ma liste de courses :\n\n1.\n2.\n3.\n\nAdresse :\nPaiement :",
            },
          },
          footer("sm-footer-produits", "© MARCHÉ EXPRESS.", SUPER_NAV),
        ],
      },
      {
        slug: "promotions",
        title: "Promotions",
        sections: [
          nav("sm-nav-promos", "MARCHÉ EXPRESS", SUPER_NAV),
          {
            id: "sm-promo-hero",
            type: "hero",
            props: {
              heading: "Promotions",
              subheading: "Offres valables toute la semaine. Quantités limitées — commandez vite.",
              buttonLabel: "Commander",
              buttonHref: "/commander",
              align: "left",
              background: "#1A3A2A",
            },
          },
          {
            id: "sm-promo-grid",
            type: "products",
            props: {
              heading: "Offres de la semaine",
              subheading: "Envoyez « Promo » sur WhatsApp pour la liste complète des offres du jour.",
              items: [],
            },
          },
          {
            id: "sm-promo-wa",
            type: "whatsapp",
            props: {
              label: "Voir les promos du jour — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — quelles sont vos promotions du jour ?",
            },
          },
          footer("sm-footer-promos", "© MARCHÉ EXPRESS.", SUPER_NAV),
        ],
      },
      {
        slug: "livraison",
        title: "Livraison",
        sections: [
          nav("sm-nav-livraison", "MARCHÉ EXPRESS", SUPER_NAV),
          {
            id: "sm-liv-hero",
            type: "hero",
            props: {
              heading: "Livraison",
              subheading: "Courses à domicile en 2h à Dakar. Régions disponibles sous 24h.",
              buttonLabel: "Commander maintenant",
              buttonHref: "/commander",
              align: "center",
              background: "#1A3A2A",
            },
          },
          {
            id: "sm-liv-zones",
            type: "features",
            props: {
              heading: "Zones et délais",
              items: [
                { title: "Dakar (intra-muros)", body: "Plateau, Médina, Fann, Almadies, Mermoz, Grand Dakar, Parcelles. Livraison en 1–2h. 7j/7, 8h–20h." },
                { title: "Banlieue proche", body: "Pikine, Guédiawaye, Rufisque, Bargny. Livraison en 3–4h. Lun–sam." },
                { title: "Thiès & Saint-Louis", body: "Commande avant 15h → livraison lendemain matin. Minimum de commande 25 000 XOF." },
                { title: "Abonnement hebdomadaire", body: "Pack courses fixe chaque semaine. On prépare d'avance, on livre le jour convenu. Réduction 5% sur abonnement mensuel." },
              ],
            },
          },
          {
            id: "sm-liv-tarifs",
            type: "text",
            props: {
              heading: "Tarifs de livraison",
              body: "Dakar intra-muros : 1 000 XOF. Banlieue : 2 000 XOF. Offerte dès 50 000 XOF de commande à Dakar.\nThiès / Saint-Louis : 3 500 XOF, offerte dès 100 000 XOF.",
            },
          },
          {
            id: "sm-liv-wa",
            type: "whatsapp",
            props: {
              label: "Commander — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais passer une commande de courses :\n\nMa liste :\n\nAdresse :\nCréneau de livraison souhaité :",
            },
          },
          footer("sm-footer-livraison", "© MARCHÉ EXPRESS.", SUPER_NAV),
        ],
      },
      {
        slug: "commander",
        title: "Commander",
        sections: [
          nav("sm-nav-commander", "MARCHÉ EXPRESS", SUPER_NAV),
          {
            id: "sm-cmd-hero",
            type: "hero",
            props: {
              heading: "Passer une commande",
              subheading: "Remplissez le formulaire ou envoyez votre liste sur WhatsApp. Réponse sous 15 min.",
              buttonLabel: "Envoyer la commande",
              buttonHref: "#form",
              align: "left",
              background: "#1A3A2A",
            },
          },
          {
            id: "sm-cmd-form",
            type: "form",
            props: {
              heading: "Ma commande",
              subheading: "Listez vos produits — on confirme disponibilités et prix total.",
              buttonLabel: "Envoyer",
              successMessage: "Commande reçue — on vous répond sous 15 min sur WhatsApp.",
              fields: [
                { id: "nom", label: "Prénom et nom", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "liste", label: "Ma liste de courses", type: "textarea", required: true, placeholder: "Riz brisé 5kg, tomates 2kg, huile 2L, oignons 1kg, poulet 1 entier…", options: [] },
                { id: "adresse", label: "Adresse de livraison", type: "text", required: true, placeholder: "Quartier, rue, Dakar…", options: [] },
                { id: "creneau", label: "Créneau souhaité", type: "select", required: false, placeholder: "", options: ["Matin (8h–12h)", "Après-midi (12h–17h)", "Soirée (17h–20h)", "Le plus tôt possible"] },
                { id: "paiement", label: "Paiement", type: "select", required: false, placeholder: "", options: ["Espèces à la livraison", "Wave", "Orange Money"] },
                { id: "note", label: "Instructions (optionnel)", type: "textarea", required: false, placeholder: "Interphone, préférence de marque, éviter substitutions…", options: [] },
              ],
            },
          },
          {
            id: "sm-cmd-wa",
            type: "whatsapp",
            props: {
              label: "Envoyer ma liste sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — voici ma commande :\n\nListe :\n\nAdresse :\nCréneau :\nPaiement :",
            },
          },
          footer("sm-footer-commander", "© MARCHÉ EXPRESS — livraison courses en 2h. Wave & Orange Money.", SUPER_NAV),
        ],
      },
    ],
  };
}
