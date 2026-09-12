import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Food Brand — packaged food, sauces, snacks, processed goods
 * Juice / Beverage Brand — cold-pressed juices, plant-based drinks
 */

function nav(id: string, brand: string, links: { label: string; href: string }[]) {
  return { id, type: "navigation" as const, props: { brand, links } };
}
function footer(id: string, text: string, links: { label: string; href: string }[]) {
  return { id, type: "footer" as const, props: { text, links } };
}

// ─── FOOD BRAND ────────────────────────────────────────────────────────────────

const FOOD_NAV = [
  { label: "Produits", href: "/produits" },
  { label: "Recettes", href: "/recettes" },
  { label: "Stockistes", href: "/stockistes" },
  { label: "Commander", href: "/commander" },
  { label: "Contact", href: "/contact" },
];

export function foodBrandWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Marque Alimentaire",
    theme: {
      primary: "#1C1C0E",
      accent: "#D4541A",
      background: "#FDFBF5",
      text: "#1C1C0E",
      fontDisplay: "Playfair Display",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "food-brand-terracotta",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("fb-nav-home", "TERROIR", FOOD_NAV),
          {
            id: "fb-announce",
            type: "announcement-bar",
            props: {
              text: "Nouveau : Sauce Yassa pimentée en format 500g — disponible partout. Commandez en ligne.",
              background: "#D4541A",
              textColor: "#FFFFFF",
            },
          },
          {
            id: "fb-hero",
            type: "hero",
            props: {
              heading: "Saveurs d'Afrique,\ndans votre cuisine.",
              subheading:
                "Sauces, épices et condiments africains — ingrédients locaux, production Dakar. Trouvez-nous dans vos supermarchés ou commandez en direct.",
              buttonLabel: "Nos produits",
              buttonHref: "/produits",
              align: "left",
              background: "#1C1C0E",
            },
          },
          {
            id: "fb-bestsellers",
            type: "products",
            props: {
              heading: "Les plus vendus",
              subheading: "Disponibles en ligne ou chez nos revendeurs. Commandez directement pour la livraison à domicile.",
              items: [],
            },
          },
          {
            id: "fb-story",
            type: "features",
            props: {
              heading: "Notre histoire",
              items: [
                { title: "Recettes de famille", body: "Nos formules s'appuient sur des recettes transmises de génération en génération — adaptées pour une production à grande échelle sans perdre l'authenticité." },
                { title: "Ingrédients locaux", body: "100% des ingrédients approvisionnés au Sénégal et en Afrique de l'Ouest. On soutient les agriculteurs locaux — piment, tomate, oignon, gombo, ail." },
                { title: "Sans conservateurs artificiels", body: "Pas de MSG, pas de colorants. La conserve naturelle par stérilisation — comme le faisaient nos grands-mères." },
                { title: "Conditionnement durable", body: "Bocaux en verre réutilisables. On vous propose un programme de retour de bocaux avec réduction sur la prochaine commande." },
              ],
            },
          },
          {
            id: "fb-recettes-home",
            type: "features",
            props: {
              heading: "Cuisinez avec TERROIR",
              items: [
                { title: "Thiéboudienne express", body: "Riz au poisson en 45 min avec notre sauce tomate yassa. Recette complète sur WhatsApp — envoyez « Thiéboudienne »." },
                { title: "Poulet yassa", body: "Notre sauce yassa citronné donne le résultat parfait en 30 min. La recette de Casamance dans votre cuisine." },
                { title: "Mafé sénégalais", body: "Sauce arachide prête à l'emploi — ajoutez votre viande, vos légumes. Prêt en 20 min." },
              ],
            },
          },
          {
            id: "fb-stockistes-cta",
            type: "text",
            props: {
              heading: "Où nous trouver",
              body: "Supermarchés Casino, Auchan, Score et épiceries de quartier à Dakar, Thiès, Saint-Louis et Ziguinchor.\nVous ne trouvez pas TERROIR près de chez vous ? Commandez en direct — livraison J+1 à Dakar, 2–3 jours en régions.",
            },
          },
          {
            id: "fb-wa-home",
            type: "whatsapp",
            props: {
              label: "Commander ou demander une recette — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander des produits TERROIR ou obtenir une recette :",
            },
          },
          footer("fb-footer-home", "© TERROIR — saveurs africaines, production Dakar. Sans conservateurs artificiels.", FOOD_NAV),
        ],
      },
      {
        slug: "produits",
        title: "Produits",
        sections: [
          nav("fb-nav-produits", "TERROIR", FOOD_NAV),
          {
            id: "fb-prod-hero",
            type: "hero",
            props: {
              heading: "Nos produits",
              subheading: "Sauces, épices, condiments — tout pour cuisiner africain partout dans le monde.",
              buttonLabel: "Commander",
              buttonHref: "/commander",
              align: "left",
              background: "#1C1C0E",
            },
          },
          {
            id: "fb-prod-grid",
            type: "products",
            props: {
              heading: "Toute la gamme",
              subheading: "Commandez en ligne ou trouvez-nous dans votre supermarché.",
              items: [],
            },
          },
          {
            id: "fb-prod-categories",
            type: "features",
            props: {
              heading: "Par gamme",
              items: [
                { title: "Sauces prêtes à l'emploi", body: "Yassa, mafé, thiéboudienne, mboum — prêtes en 20 min. Portions familiales et formats professionnels." },
                { title: "Épices & mélanges", body: "Thiossane (mélange thiéboudienne), yété (poivre sénégalais), kinkelibah séché — les essentiels de la cuisine sénégalaise." },
                { title: "Piments & condiments", body: "Piment dibi, sauce piment habanero, rougail — du doux au très relevé. Production artisanale." },
                { title: "Desserts & boissons sèches", body: "Poudre de bissap, baobab, gingembre — à mélanger à l'eau froide ou chaude." },
              ],
            },
          },
          {
            id: "fb-prod-wa",
            type: "whatsapp",
            props: {
              label: "Commander — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander des produits TERROIR :\n- Produit(s) :\n- Quantité :\n- Livraison ou retrait :\n- Ville :",
            },
          },
          footer("fb-footer-produits", "© TERROIR.", FOOD_NAV),
        ],
      },
      {
        slug: "recettes",
        title: "Recettes",
        sections: [
          nav("fb-nav-recettes", "TERROIR", FOOD_NAV),
          {
            id: "fb-rec-hero",
            type: "hero",
            props: {
              heading: "Recettes",
              subheading: "Les grandes recettes sénégalaises et africaines — simplifiées avec nos produits. Résultat garanti, temps divisé par deux.",
              buttonLabel: "Demander une recette",
              buttonHref: "#wa",
              align: "center",
              background: "#1C1C0E",
            },
          },
          {
            id: "fb-rec-list",
            type: "features",
            props: {
              heading: "Recettes phares",
              items: [
                { title: "Thiéboudienne (riz au poisson)", body: "Notre sauce tomate yassa + riz brisé + poisson. 45 min. Recette complète sur WhatsApp." },
                { title: "Poulet yassa", body: "Sauce yassa citronné + poulet grillé + oignons caramélisés. 30 min. Simple, parfait." },
                { title: "Mafé (sauce arachide)", body: "Sauce mafé TERROIR + viande de votre choix + légumes. 20 min. Aussi bon que chez maman." },
                { title: "Bissap glacé", body: "Poudre de bissap + eau froide + sucre + gingembre. 5 min. La boisson nationale en version express." },
                { title: "Thiakry (dessert)", body: "Recette de mil fermenté sucré. Envoyez « Thiakry » sur WhatsApp pour la recette complète." },
                { title: "Dibi maison", body: "Épices dibi TERROIR + côtelettes d'agneau + grillade. Le dibi sénégalais sans quitter votre cuisine." },
              ],
            },
          },
          {
            id: "fb-rec-wa",
            type: "whatsapp",
            props: {
              label: "Demander une recette sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais la recette de :",
            },
          },
          footer("fb-footer-recettes", "© TERROIR.", FOOD_NAV),
        ],
      },
      {
        slug: "stockistes",
        title: "Où nous trouver",
        sections: [
          nav("fb-nav-stockistes", "TERROIR", FOOD_NAV),
          {
            id: "fb-stock-hero",
            type: "hero",
            props: {
              heading: "Où nous trouver",
              subheading: "Supermarchés, épiceries et boutiques au Sénégal. Pas trouvé près de vous ? Commandez en direct.",
              buttonLabel: "Commander en ligne",
              buttonHref: "/commander",
              align: "center",
              background: "#1C1C0E",
            },
          },
          {
            id: "fb-stock-list",
            type: "features",
            props: {
              heading: "Nos revendeurs",
              items: [
                { title: "Dakar — supermarchés", body: "Casino Plateau, Auchan Liberté, Score Almadies, Bon Marché Plateau. Rayons épicerie africaine." },
                { title: "Dakar — épiceries", body: "Plus de 50 épiceries de quartier référencées. Demandez la liste complète sur WhatsApp." },
                { title: "Thiès & Saint-Louis", body: "Supermarchés locaux et épiceries partenaires. Livraison hebdomadaire chaque lundi." },
                { title: "Ziguinchor & Casamance", body: "Distribution en cours de déploiement. Commandez en direct pour la Casamance." },
                { title: "International", body: "France (Île-de-France), Belgique (Bruxelles), Canada (Montréal) — épiceries africaines partenaires. Liste sur WhatsApp." },
              ],
            },
          },
          {
            id: "fb-stock-b2b",
            type: "text",
            props: {
              heading: "Vous êtes revendeur ?",
              body: "Rejoignez notre réseau de distribution. Tarifs grossiste, livraison régulière, merchandising fourni.\nContactez notre équipe commerciale sur WhatsApp pour les conditions.",
            },
          },
          {
            id: "fb-stock-wa",
            type: "whatsapp",
            props: {
              label: "Devenir revendeur — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je suis intéressé par la revente de produits TERROIR dans ma boutique / supermarché.",
            },
          },
          footer("fb-footer-stockistes", "© TERROIR.", FOOD_NAV),
        ],
      },
      {
        slug: "commander",
        title: "Commander",
        sections: [
          nav("fb-nav-commander", "TERROIR", FOOD_NAV),
          {
            id: "fb-cmd-hero",
            type: "hero",
            props: {
              heading: "Commander en direct",
              subheading: "Livraison Dakar J+1 · Régions 2–3 jours · International 7–14 jours. Paiement Wave, Orange Money ou espèces.",
              buttonLabel: "Passer commande",
              buttonHref: "#form",
              align: "left",
              background: "#1C1C0E",
            },
          },
          {
            id: "fb-cmd-form",
            type: "form",
            props: {
              heading: "Votre commande",
              subheading: "Commandes particuliers et grossistes bienvenues.",
              buttonLabel: "Envoyer la commande",
              successMessage: "Commande reçue — on vous confirme sous 2h avec les instructions de paiement.",
              fields: [
                { id: "nom", label: "Nom", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "produits", label: "Produits et quantités", type: "textarea", required: true, placeholder: "Sauce yassa 500g × 3, Épices thiossane 200g × 1…", options: [] },
                { id: "adresse", label: "Adresse de livraison", type: "text", required: true, placeholder: "Quartier, ville…", options: [] },
                { id: "type", label: "Type de commande", type: "select", required: false, placeholder: "", options: ["Particulier", "Grossiste / revendeur", "Restaurant / traiteur"] },
                { id: "paiement", label: "Paiement", type: "select", required: false, placeholder: "", options: ["Wave", "Orange Money", "Espèces à la livraison"] },
              ],
            },
          },
          {
            id: "fb-cmd-wa",
            type: "whatsapp",
            props: {
              label: "Commander sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander des produits TERROIR :\n- Produit(s) :\n- Quantité :\n- Adresse :\n- Paiement :",
            },
          },
          footer("fb-footer-commander", "© TERROIR — saveurs africaines, production Dakar.", FOOD_NAV),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("fb-nav-contact", "TERROIR", FOOD_NAV),
          {
            id: "fb-contact",
            type: "contact",
            props: {
              heading: "Nous contacter",
              email: "bonjour@terroir-sn.com",
              phone: "+221770000000",
              address: "Unité de production — Dakar · commande en ligne ou par WhatsApp",
            },
          },
          footer("fb-footer-contact", "© TERROIR.", FOOD_NAV),
        ],
      },
    ],
  };
}

// ─── JUICE / BEVERAGE BRAND ────────────────────────────────────────────────────

const JUICE_NAV = [
  { label: "Nos jus", href: "/jus" },
  { label: "Ingrédients", href: "/ingredients" },
  { label: "Points de vente", href: "/points-de-vente" },
  { label: "Commander", href: "/commander" },
];

export function juiceBrandWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Marque de jus",
    theme: {
      primary: "#0D2B1A",
      accent: "#5BBF4A",
      background: "#F5FAF3",
      text: "#0D2B1A",
      fontDisplay: "Plus Jakarta Sans",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "juice-fresh-green",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("jb-nav-home", "VERT", JUICE_NAV),
          {
            id: "jb-announce",
            type: "announcement-bar",
            props: {
              text: "Livraison fraîche tous les matins à Dakar — commandez avant 20h pour le lendemain.",
              background: "#0D2B1A",
              textColor: "#5BBF4A",
            },
          },
          {
            id: "jb-hero",
            type: "hero",
            props: {
              heading: "100% fruits africains.\n0% compromis.",
              subheading:
                "Jus cold-pressed, bissap, gingembre, baobab, tamarin — fruits locaux, pressés le matin, livrés frais. Dakar et grandes villes.",
              buttonLabel: "Voir nos jus",
              buttonHref: "/jus",
              align: "left",
              background: "#0D2B1A",
            },
          },
          {
            id: "jb-range",
            type: "products",
            props: {
              heading: "La gamme",
              subheading: "Pressés le matin, livrés dans la journée. Shelf-life 3–5 jours au frigo.",
              items: [],
            },
          },
          {
            id: "jb-why",
            type: "features",
            props: {
              heading: "Pourquoi VERT ?",
              items: [
                { title: "Cold-pressed", body: "Pas de chaleur dans l'extraction — on préserve 100% des vitamines, enzymes et minéraux des fruits." },
                { title: "Zéro sucre ajouté", body: "Le sucre naturel des fruits suffit. Pas de sirop, pas d'arôme artificiel, pas d'eau rajoutée." },
                { title: "Fruits locaux", body: "Bissap de Casamance, gingembre de Thiès, mangue de Saint-Louis, tamarin du Sénégal. Frais, de saison." },
                { title: "Livraison le matin", body: "Pressé à 5h. Livré avant 10h. Vous buvez frais, pas un jus qui a traîné en entrepôt." },
              ],
            },
          },
          {
            id: "jb-bestsellers",
            type: "features",
            props: {
              heading: "Les incontournables",
              items: [
                { title: "Bissap Gingembre", body: "Hibiscus cold-pressed + gingembre frais. Antioxydants puissants. Le plus vendu. Format 500ml et 1L." },
                { title: "Tamarin Citron", body: "Tamarin sénégalais + citron vert. Acidulé, rafraîchissant, riche en vitamine C." },
                { title: "Boost Baobab", body: "Poudre de baobab + mangue + citron. Vitamine C × 6 vs orange. Le shot de vitalité africain." },
                { title: "Green Moringa", body: "Moringa + pomme + gingembre + citron. Détox vert adapté aux peaux africaines." },
              ],
            },
          },
          {
            id: "jb-subscription",
            type: "text",
            props: {
              heading: "Abonnement hebdomadaire",
              body: "Recevez votre pack jus chaque semaine — mêmes jus ou variés selon votre choix. Paiement Wave ou Orange Money en début de semaine. Livraison lundi, mercredi, vendredi. Réduction 10% sur l'abonnement mensuel.\n\nEnvoyez « Abonnement » sur WhatsApp pour démarrer.",
            },
          },
          {
            id: "jb-wa-home",
            type: "whatsapp",
            props: {
              label: "Commander ou s'abonner — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander des jus VERT :\n- Jus :\n- Quantité :\n- Livraison ou abonnement ?\n- Adresse :",
            },
          },
          footer("jb-footer-home", "© VERT — cold-pressed, fruits africains, livraison matin. 0% sucre ajouté.", JUICE_NAV),
        ],
      },
      {
        slug: "jus",
        title: "Nos jus",
        sections: [
          nav("jb-nav-jus", "VERT", JUICE_NAV),
          {
            id: "jb-jus-hero",
            type: "hero",
            props: {
              heading: "La gamme complète",
              subheading: "Pressés le matin. Tous les jours de la semaine. Du simple au complexe — trouvez votre favori.",
              buttonLabel: "Commander",
              buttonHref: "/commander",
              align: "left",
              background: "#0D2B1A",
            },
          },
          {
            id: "jb-jus-grid",
            type: "products",
            props: {
              heading: "Tous les jus",
              subheading: "Format 250ml, 500ml et 1L. Packs familiaux disponibles. Envoyez votre sélection sur WhatsApp.",
              items: [],
            },
          },
          {
            id: "jb-jus-categories",
            type: "features",
            props: {
              heading: "Par bénéfice",
              items: [
                { title: "Énergie & vitalité", body: "Gingembre, baobab, moringa. Pour bien commencer la journée sans café." },
                { title: "Détox & légèreté", body: "Concombre, citron, menthe, aloe. Pour se sentir léger après les grandes occasions." },
                { title: "Immunité", body: "Bissap, tamarin, vitamine C naturelle. Défenses naturelles renforcées." },
                { title: "Hydratation fraîche", body: "Pastèque, ananas, coco. Pour les journées chaudes de Dakar." },
              ],
            },
          },
          {
            id: "jb-jus-wa",
            type: "whatsapp",
            props: {
              label: "Passer commande — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander des jus VERT :\n- Jus choisi(s) :\n- Format (250ml / 500ml / 1L) :\n- Quantité :\n- Adresse :",
            },
          },
          footer("jb-footer-jus", "© VERT.", JUICE_NAV),
        ],
      },
      {
        slug: "ingredients",
        title: "Nos ingrédients",
        sections: [
          nav("jb-nav-ingredients", "VERT", JUICE_NAV),
          {
            id: "jb-ing-hero",
            type: "hero",
            props: {
              heading: "D'où viennent\nnos fruits",
              subheading: "On travaille directement avec des producteurs locaux. Pas d'intermédiaire, fraîcheur garantie, agriculture soutenue.",
              buttonLabel: "Voir nos jus",
              buttonHref: "/jus",
              align: "center",
              background: "#0D2B1A",
            },
          },
          {
            id: "jb-ing-list",
            type: "features",
            props: {
              heading: "Nos sources",
              items: [
                { title: "Bissap — Casamance", body: "Hibiscus séché de Ziguinchor. Récolte octobre–novembre. Partenariat direct avec les femmes transformatrices de Casamance." },
                { title: "Gingembre — Thiès", body: "Rhizomes frais de Thiès. Livraison 2× par semaine. Goût plus intense que le gingembre importé." },
                { title: "Mangue — Sine Saloum", body: "Kent et Julie de Kaolack. Saison avril–juillet. On stocke en surgélation pour hors-saison." },
                { title: "Tamarin — Fatick", body: "Tamarin sauvage du Sénégal. Plus acidulé que l'industriel. Cueillette artisanale." },
                { title: "Baobab — Louga", body: "Poudre de pulpe de baobab séchée à froid. 6× plus de vitamine C que l'orange." },
                { title: "Pastèque — Potou", body: "Pastèques du lac de Guiers — chair rouge, sucrée. Saison mars–mai." },
              ],
            },
          },
          footer("jb-footer-ingredients", "© VERT.", JUICE_NAV),
        ],
      },
      {
        slug: "points-de-vente",
        title: "Points de vente",
        sections: [
          nav("jb-nav-points", "VERT", JUICE_NAV),
          {
            id: "jb-pdv-hero",
            type: "hero",
            props: {
              heading: "Où nous trouver",
              subheading: "Gyms, restaurants, épiceries bio et hôtels à Dakar. Ou commandez en direct — livraison avant 10h.",
              buttonLabel: "Commander en direct",
              buttonHref: "/commander",
              align: "center",
              background: "#0D2B1A",
            },
          },
          {
            id: "jb-pdv-list",
            type: "features",
            props: {
              heading: "Nos points de vente",
              items: [
                { title: "Gyms & studios", body: "FitZone Almadies, CrossFit Dakar, Yoga Mermoz, 7Force Gym — frigos VERT disponibles avant et après votre séance." },
                { title: "Restaurants & cafés", body: "Brunch spots, restaurants végétariens et hôtels partenaires à Dakar. Demandez VERT à la carte." },
                { title: "Épiceries & supermarchés", body: "Épiceries bio et rayons frais sélectionnés. Liste complète sur WhatsApp." },
                { title: "Bureau & coworking", body: "Vous voulez VERT dans votre bureau ? On installe un frigo et on livre chaque semaine. Tarif entreprise." },
              ],
            },
          },
          {
            id: "jb-pdv-b2b",
            type: "whatsapp",
            props: {
              label: "Référencer VERT dans mon établissement — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais référencer les jus VERT dans mon établissement / bureau. Voici les détails :\n- Type d'établissement :\n- Volume estimé / semaine :\n- Adresse :",
            },
          },
          footer("jb-footer-points", "© VERT.", JUICE_NAV),
        ],
      },
      {
        slug: "commander",
        title: "Commander",
        sections: [
          nav("jb-nav-commander", "VERT", JUICE_NAV),
          {
            id: "jb-cmd-hero",
            type: "hero",
            props: {
              heading: "Commander",
              subheading: "Commandez avant 20h — livraison fraîche le lendemain matin. Abonnement hebdomadaire disponible.",
              buttonLabel: "Commander maintenant",
              buttonHref: "#form",
              align: "left",
              background: "#0D2B1A",
            },
          },
          {
            id: "jb-cmd-form",
            type: "form",
            props: {
              heading: "Votre commande",
              subheading: "Livraison matin ou abonnement — à vous de choisir.",
              buttonLabel: "Envoyer ma commande",
              successMessage: "Commande reçue — on confirme et livre demain matin.",
              fields: [
                { id: "nom", label: "Prénom et nom", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "jus", label: "Jus et format", type: "textarea", required: true, placeholder: "Bissap Gingembre 500ml × 2, Boost Baobab 250ml × 1…", options: [] },
                { id: "type", label: "Commande ponctuelle ou abonnement", type: "select", required: true, placeholder: "", options: ["Commande ponctuelle", "Abonnement hebdo (3 livraisons / sem)", "Abonnement mensuel (offre entreprise)"] },
                { id: "adresse", label: "Adresse de livraison", type: "text", required: true, placeholder: "Quartier, rue, Dakar…", options: [] },
                { id: "heure", label: "Créneau de livraison", type: "select", required: false, placeholder: "", options: ["7h–9h", "9h–11h", "11h–13h"] },
                { id: "paiement", label: "Paiement", type: "select", required: false, placeholder: "", options: ["Wave", "Orange Money", "Espèces à la livraison"] },
              ],
            },
          },
          {
            id: "jb-cmd-wa",
            type: "whatsapp",
            props: {
              label: "Commander sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander des jus VERT :\n- Jus et format :\n- Quantité :\n- Adresse :\n- Créneau de livraison :",
            },
          },
          footer("jb-footer-commander", "© VERT — cold-pressed, 0% sucre ajouté, livraison matin.", JUICE_NAV),
        ],
      },
    ],
  };
}
