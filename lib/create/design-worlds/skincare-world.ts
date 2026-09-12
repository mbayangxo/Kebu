import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Skincare Brand — West African skincare / beauty brand.
 * Patterns from best-in-class beauty ecommerce:
 * - Unusual product page layouts with "best used for / NOT for" callouts
 * - Cross-sell / "complete the routine" upsell
 * - Customer education: how-to guides, ingredient deep-dives
 * - Consultations leading to product links via WhatsApp
 * - White space + high-contrast CTAs / announcement bar
 * - Reviews with skin type + concern context
 * - Loyalty / VIP program section
 * - Brand ambassador program
 * - BOPIS: commander en ligne, récupérer au showroom (very Africa-relevant)
 */

const NAV = [
  { label: "Produits", href: "/produits" },
  { label: "Routine", href: "/routine" },
  { label: "Ingrédients", href: "/ingredients" },
  { label: "Avis", href: "/avis" },
  { label: "Commander", href: "/commander" },
];

function nav(id: string) {
  return { id, type: "navigation" as const, props: { brand: "LUMIÈRE", links: [...NAV] } };
}
function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© LUMIÈRE Skincare — formules naturelles, peaux africaines. Dakar · livraison nationale · Wave & Orange Money.",
      links: [...NAV],
    },
  };
}

export function skincareWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Skincare",
    theme: {
      primary: "#1A1A18",
      accent: "#8B6F47",
      background: "#FDFAF5",
      text: "#1A1A18",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Inter",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "skincare-natural-earth",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("sk-nav-home"),
          {
            id: "sk-announce",
            type: "announcement-bar",
            props: {
              text: "Nouveau : Sérum Éclat Karité — formule concentrée pour peaux mates et foncées. Découvrir →",
              background: "#1A1A18",
              textColor: "#F5E6D3",
            },
          },
          {
            id: "sk-hero",
            type: "hero",
            props: {
              heading: "Peau saine,\nformules africaines.",
              subheading:
                "Skincare formulé pour les peaux africaines — karité, moringa, baobab, néré. Sans sulfates ni parabènes. Livraison au Sénégal et à l'international.",
              buttonLabel: "Découvrir les produits",
              buttonHref: "/produits",
              align: "left",
              background: "#1A1A18",
            },
          },
          {
            id: "sk-bestsellers",
            type: "products",
            props: {
              heading: "Les best-sellers",
              subheading: "Les produits les plus aimés par notre communauté — avec leur type de peau et préoccupation recommandés.",
              items: [],
            },
          },
          // Education section — how-to / skincare tutorials
          {
            id: "sk-education",
            type: "features",
            props: {
              heading: "La méthode LUMIÈRE",
              items: [
                {
                  title: "Nettoyer sans agresser",
                  body: "Peau africaine = peau qui retient moins l'humidité. On commence par un nettoyant doux, sans savon détergent.",
                },
                {
                  title: "Hydrater en profondeur",
                  body: "Le beurre de karité natif pénètre 6× plus vite que la vaseline. On l'applique sur peau légèrement humide.",
                },
                {
                  title: "Protéger de l'hyperpigmentation",
                  body: "Teint mat → pas besoin de SPF 50+ en intérieur. Mais en extérieur au Sénégal, SPF 30 minimum. Toujours.",
                },
                {
                  title: "Adapter à la saison",
                  body: "Harmattan = air très sec → routine plus riche. Saison des pluies = air humide → routine légère. On vous guide.",
                },
              ],
            },
          },
          // "Best used for / not for" education callout
          {
            id: "sk-for-not-for",
            type: "features",
            props: {
              heading: "Pour qui — et pour qui pas",
              items: [
                { title: "✓ Peaux mates et foncées", body: "Formules testées sur toutes les carnations africaines. Pas d'effet grisâtre, pas de taches blanches." },
                { title: "✓ Peaux mixtes à grasses", body: "Textures légères, non-comédogènes. Finis mats ou satin selon le produit." },
                { title: "✗ Peaux très sèches atopiques", body: "Pour les peaux avec eczéma ou dermatite sévère, consultez un dermatologue avant tout produit actif." },
                { title: "✗ Peaux avec prescriptions actives", body: "Retinol, acide azélaïque en prescription — ne pas combiner sans avis médical. On vous le dira toujours." },
              ],
            },
          },
          // Product finder quiz → WhatsApp consultation
          {
            id: "sk-quiz",
            type: "quiz",
            props: {
              heading: "Trouvez votre routine LUMIÈRE",
              subheading: "3 questions — on vous envoie vos produits personnalisés sur WhatsApp.",
              ctaLabel: "Recevoir ma routine sur WhatsApp",
              whatsappPhone: "+221770000000",
              whatsappIntro: "Bonjour LUMIÈRE ! Voici mes réponses au quiz routine :",
              steps: [
                {
                  id: "skin_type",
                  question: "Quel est votre type de peau ?",
                  options: ["Normale", "Mixte (T-zone grasse)", "Grasse", "Sèche", "Sensible / atopique"],
                  icon: "🌿",
                },
                {
                  id: "concern",
                  question: "Votre préoccupation principale ?",
                  options: ["Hyperpigmentation / taches", "Éclat & teint terne", "Hydratation", "Boutons / acné", "Anti-âge", "Pores dilatés"],
                  icon: "✨",
                },
                {
                  id: "routine",
                  question: "Votre routine actuelle ?",
                  options: ["Je commence de zéro", "Routine basique (1–2 produits)", "Routine complète", "Soins naturels uniquement"],
                  icon: "🕐",
                },
              ],
            },
          },
          // Reviews with skin type context
          {
            id: "sk-reviews",
            type: "testimonials",
            props: {
              heading: "Ce qu'elles en disent",
              topics: ["Hydratation", "Éclat & teint", "Anti-taches", "Texture & toucher", "Application"],
              items: [
                {
                  quote: "Peau mixte, hyperpigmentation post-acné. Après 3 semaines de sérum éclat : taches visiblement estompées. C'est le premier produit qui marche vraiment.",
                  name: "Adja K.",
                  role: "Peau mixte · hyperpigmentation — Dakar",
                  skinType: "Mixte",
                  skinConcern: "Hyperpigmentation",
                  reviewTopics: ["Anti-taches", "Éclat & teint"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Peau grasse, brillance en milieu de journée même en saison froide. La crème hydratante légère : mat toute la journée, zéro bouton. Incroyable.",
                  name: "Marième D.",
                  role: "Peau grasse · brillance — Saint-Louis",
                  skinType: "Grasse",
                  skinConcern: "Brillance / sébum",
                  reviewTopics: ["Hydratation", "Texture & toucher"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Ma fille de 16 ans avait des boutons autour du menton. Routine cleanser + sérum : peau nette en 1 mois. On ne revient pas en arrière.",
                  name: "Fatou S.",
                  role: "Peau ado, mixte — Thiès",
                  skinType: "Mixte",
                  skinConcern: "Acné / boutons",
                  reviewTopics: ["Anti-taches", "Application"],
                  verified: true,
                  rating: 5,
                },
              ],
            },
          },
          // Cross-sell / complete the routine
          {
            id: "sk-routine-upsell",
            type: "features",
            props: {
              heading: "Complétez votre routine",
              items: [
                { title: "Routine matin", body: "Gel nettoyant → Sérum vitamine C → Crème SPF 30. 3 min. Peau lumineuse toute la journée." },
                { title: "Routine soir", body: "Huile démaquillante → Masque argile karité (2×/sem) → Crème nuit régénérante. Réparation pendant le sommeil." },
                { title: "Routine hebdo", body: "Exfoliant doux (1–2×/sem) + Masque illuminant. Peeling sans agression, éclat immédiat." },
                { title: "Routine corps", body: "Beurre karité brut + huile baobab. Peau soyeuse dès la première application." },
              ],
            },
          },
          // Consultation via WhatsApp
          {
            id: "sk-consultation",
            type: "whatsapp",
            props: {
              label: "Consultation gratuite — WhatsApp · On analyse votre peau",
              phone: "+221770000000",
              message: "Bonjour — je voudrais une consultation peau gratuite. Voici mon profil :\n- Mon type de peau :\n- Ma préoccupation principale :\n- Produits que j'utilise déjà :",
            },
          },
          // Loyalty / Ambassador
          {
            id: "sk-loyalty",
            type: "features",
            props: {
              heading: "Programme ambassadrices",
              items: [
                { title: "Devenez ambassadrice", body: "Partagez LUMIÈRE sur vos réseaux — recevez une commission sur chaque commande de votre code. Ouvert à toutes." },
                { title: "VIP — accès anticipé", body: "Dès 3 commandes, vous rejoignez le club VIP : accès aux nouveautés 48h avant, réductions exclusives." },
                { title: "Consultation beauté pro", body: "Ambassadrices : consultation individuelle avec notre formulatrice — routine sur mesure pour vous." },
                { title: "Retours VIP gratuits", body: "VIP : retour ou échange gratuit sous 7 jours. On gère la logistique, sans frais." },
              ],
            },
          },
          footer("sk-footer-home"),
        ],
      },
      {
        slug: "produits",
        title: "Produits",
        sections: [
          nav("sk-nav-produits"),
          {
            id: "sk-prod-hero",
            type: "hero",
            props: {
              heading: "Les produits",
              subheading: "Chaque produit indique son type de peau recommandé et sa préoccupation principale. Commandez, récupérez en boutique ou livraison à domicile.",
              buttonLabel: "Consultation peau — WhatsApp",
              buttonHref: "/commander",
              align: "left",
              background: "#1A1A18",
            },
          },
          {
            id: "sk-prod-grid",
            type: "products",
            props: {
              heading: "Tous les produits",
              subheading: "Filtrez par type de peau ou préoccupation. Envoyez « Je prends » sur WhatsApp ou commandez directement.",
              items: [],
            },
          },
          {
            id: "sk-prod-categories",
            type: "features",
            props: {
              heading: "Par catégorie",
              items: [
                { title: "Nettoyants", body: "Gels, mousses et huiles démaquillantes. Formulés sans sulfates agressifs — pour une peau nette sans tiraillement." },
                { title: "Sérums & actifs", body: "Vitamine C, niacinamide, acide glycolique — dosés pour peaux africaines. Efficaces, sans irritation." },
                { title: "Hydratants", body: "Crèmes, laits et beurres. Textures légères à riches selon la saison et le type de peau." },
                { title: "Masques & exfoliants", body: "Argile, sucre de canne, karité — soins hebdo pour révéler l'éclat naturel." },
                { title: "Corps", body: "Huiles, beurres et laits corps. Soin complet du corps avec les mêmes formules naturelles." },
              ],
            },
          },
          {
            id: "sk-prod-bopis",
            type: "text",
            props: {
              heading: "Commander en ligne — récupérer en boutique",
              body: "Vous commandez maintenant — vous récupérez quand vous voulez dans notre showroom à Dakar. Idéal pour éviter les frais de livraison et voir les textures en vrai.\nEnvoyez votre commande sur WhatsApp, on vous confirme la dispo et vous donne l'heure de retrait.",
            },
          },
          {
            id: "sk-prod-wa",
            type: "whatsapp",
            props: {
              label: "Commander ou retirer en boutique — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander / récupérer en boutique. Voici ma commande :\n- Produit(s) :\n- Livraison ou retrait boutique :\n- Ville / quartier :",
            },
          },
          footer("sk-footer-produits"),
        ],
      },
      {
        slug: "routine",
        title: "Votre routine",
        sections: [
          nav("sk-nav-routine"),
          {
            id: "sk-rt-hero",
            type: "hero",
            props: {
              heading: "Votre routine\nsurlue mesure",
              subheading: "Répondez à 3 questions — on vous recommande les bons produits et l'ordre d'application. Gratuit, par WhatsApp.",
              buttonLabel: "Consultation WhatsApp",
              buttonHref: "#consultation",
              align: "center",
              background: "#1A1A18",
            },
          },
          {
            id: "sk-rt-steps",
            type: "features",
            props: {
              heading: "Les étapes clés",
              items: [
                { title: "1. Nettoyer (matin & soir)", body: "Toujours. Même si vous ne vous maquillez pas. La pollution à Dakar se dépose sur la peau." },
                { title: "2. Traiter (soir)", body: "Actifs (sérum) le soir, quand la peau se régénère. Pas le matin si exposition solaire." },
                { title: "3. Hydrater (matin & soir)", body: "Peau africaine perd l'humidité plus vite sous le soleil. On hydrate, toujours." },
                { title: "4. Protéger (matin)", body: "SPF en extérieur. Toujours. L'hyperpigmentation empire sous le soleil sans protection." },
              ],
            },
          },
          {
            id: "sk-rt-education",
            type: "text",
            props: {
              heading: "Guide des ingrédients actifs",
              body: "Vitamine C (éclat + anti-taches) · Niacinamide (pores + sébum + éclat uniforme) · Acide glycolique (exfoliation douce) · Rétinol (anti-âge, soir uniquement) · Karité (nutrition intense) · Baobab (hydratation durable) · Moringa (antioxydant).\n\nOn vous explique comment les combiner sans irriter — consultez-nous sur WhatsApp.",
            },
          },
          {
            id: "sk-rt-consultation",
            type: "whatsapp",
            props: {
              label: "Consultation routine gratuite — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais une routine personnalisée. Mon profil :\n- Type de peau (sèche / mixte / grasse / normale) :\n- Préoccupation (taches / boutons / brillance / rides / éclat) :\n- Budget mensuel :",
            },
          },
          footer("sk-footer-routine"),
        ],
      },
      {
        slug: "ingredients",
        title: "Ingrédients",
        sections: [
          nav("sk-nav-ingredients"),
          {
            id: "sk-ing-hero",
            type: "hero",
            props: {
              heading: "Nos ingrédients",
              subheading: "On vous dit tout — d'où ça vient, pourquoi on l'utilise, ce que ça fait sur votre peau.",
              buttonLabel: "Voir les produits",
              buttonHref: "/produits",
              align: "center",
              background: "#1A1A18",
            },
          },
          {
            id: "sk-ing-list",
            type: "features",
            props: {
              heading: "La pharmacopée africaine",
              items: [
                { title: "Beurre de karité (Burkina Faso)", body: "Nourrissant, cicatrisant, anti-inflammatoire. Source : coopératives féminines au Burkina. Brut, non-raffiné." },
                { title: "Huile de baobab (Sénégal)", body: "Légère, non-grasse, absorption rapide. Riche en omégas. Source : producteurs locaux Casamance." },
                { title: "Moringa (Sénégal)", body: "Antioxydant puissant. Protège la peau contre les radicaux libres et la pollution urbaine." },
                { title: "Néré (Sénégal / Mali)", body: "Antimicrobien naturel. Utilisé en médecine traditionnelle pour les peaux à problèmes." },
                { title: "Argile blanche (Maroc)", body: "Purifiante, absorbante. Masques et nettoyants. Sèche sans dessécher." },
                { title: "Vitamine C (naturelle)", body: "Acide ascorbique stabilisé. Anti-taches, éclat, anti-âge. Formule 10% — efficace et tolérée." },
              ],
            },
          },
          footer("sk-footer-ingredients"),
        ],
      },
      {
        slug: "avis",
        title: "Avis clients",
        sections: [
          nav("sk-nav-avis"),
          {
            id: "sk-av-hero",
            type: "hero",
            props: {
              heading: "Ce qu'elles disent",
              subheading: "Avis vérifiés — avec type de peau, préoccupation et durée d'utilisation. Parce qu'une peau qui ressemble à la vôtre vaut plus qu'une photo.",
              buttonLabel: "Laisser un avis",
              buttonHref: "/commander",
              align: "center",
              background: "#1A1A18",
            },
          },
          {
            id: "sk-av-reviews",
            type: "testimonials",
            props: {
              heading: "Avis vérifiés",
              topics: ["Hydratation", "Éclat & teint", "Anti-taches", "Texture & toucher", "Application", "Résultat à long terme"],
              items: [
                {
                  quote: "3 mois avec le sérum éclat. Mes taches d'hyperpigmentation post-acné ont clairement diminué. Je prends le grand format maintenant.",
                  name: "Rokhaya B.",
                  role: "Peau mixte · taches post-acné · 3 mois — Dakar",
                  skinType: "Mixte",
                  skinConcern: "Hyperpigmentation",
                  reviewTopics: ["Anti-taches", "Résultat à long terme"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "La crème légère pour peau grasse : mat jusqu'au soir, 0 brillance, 0 bouton. Et elle sent bon sans parfum chimique.",
                  name: "Aminata C.",
                  role: "Peau grasse · brillance · 6 semaines — Thiès",
                  skinType: "Grasse",
                  skinConcern: "Brillance / sébum",
                  reviewTopics: ["Hydratation", "Texture & toucher"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Peau atopique légère. La crème baobab est la seule que je supporte sans tiraillement. Et je vois l'effet hydratant dès le matin.",
                  name: "Seynabou N.",
                  role: "Peau sensible · sécheresse · 2 mois — Saint-Louis",
                  skinType: "Sensible",
                  skinConcern: "Sécheresse / eczéma",
                  reviewTopics: ["Hydratation", "Texture & toucher"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Consultée sur WhatsApp pour ma routine — la conseillère m'a envoyé un programme avec 3 produits. Résultat en 3 semaines : peau plus lisse et uniforme.",
                  name: "Ndèye F.",
                  role: "Peau terne · manque d'éclat — Ziguinchor",
                  skinType: "Normale",
                  skinConcern: "Éclat / teint terne",
                  reviewTopics: ["Éclat & teint", "Application"],
                  verified: true,
                  rating: 5,
                },
              ],
            },
          },
          {
            id: "sk-av-cta",
            type: "whatsapp",
            props: {
              label: "Laisser votre avis — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais laisser un avis sur un produit LUMIÈRE. Voici mon expérience :\n- Produit utilisé :\n- Mon type de peau :\n- Ma préoccupation :\n- Durée d'utilisation :\n- Mon avis :",
            },
          },
          footer("sk-footer-avis"),
        ],
      },
      {
        slug: "commander",
        title: "Commander",
        sections: [
          nav("sk-nav-commander"),
          {
            id: "sk-cmd-hero",
            type: "hero",
            props: {
              heading: "Commander",
              subheading: "Livraison Dakar J+1 · Régions 2–3 jours · International sur devis. Retrait boutique disponible. Wave & Orange Money.",
              buttonLabel: "Commander maintenant",
              buttonHref: "#form",
              align: "left",
              background: "#1A1A18",
            },
          },
          {
            id: "sk-cmd-process",
            type: "features",
            props: {
              heading: "Comment commander",
              items: [
                { title: "En ligne ou WhatsApp", body: "Formulaire ci-dessous ou envoyez votre commande sur WhatsApp — réponse sous 1h." },
                { title: "Retrait ou livraison", body: "Retrait au showroom (Dakar, sur RDV) ou livraison à domicile. Vous choisissez." },
                { title: "Payez Wave ou Orange Money", body: "Paiement à la commande par Wave ou Orange Money. Espèces à la livraison disponible aussi." },
                { title: "Suivi WhatsApp", body: "On vous prévient à chaque étape — préparation, expédition, livraison." },
              ],
            },
          },
          {
            id: "sk-cmd-form",
            type: "form",
            props: {
              heading: "Formulaire de commande",
              subheading: "Remplissez — on vous confirme et vous envoie les instructions de paiement sous 1h.",
              buttonLabel: "Envoyer ma commande",
              successMessage: "Commande reçue — on vous répond sous 1h sur WhatsApp.",
              fields: [
                { id: "nom", label: "Prénom et nom", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "produits", label: "Produit(s) souhaité(s)", type: "textarea", required: true, placeholder: "Sérum éclat × 1, Crème hydratante légère × 2…", options: [] },
                { id: "livraison", label: "Mode de récupération", type: "select", required: true, placeholder: "", options: ["Livraison à domicile — Dakar", "Livraison à domicile — autre ville", "Retrait au showroom (Dakar)", "Livraison internationale"] },
                { id: "adresse", label: "Adresse / ville", type: "text", required: true, placeholder: "Quartier, ville…", options: [] },
                { id: "paiement", label: "Mode de paiement", type: "select", required: false, placeholder: "", options: ["Wave", "Orange Money", "Espèces à la livraison / retrait"] },
                { id: "note", label: "Note (optionnel)", type: "textarea", required: false, placeholder: "Cadeau, message, instructions…", options: [] },
              ],
            },
          },
          {
            id: "sk-cmd-wa",
            type: "whatsapp",
            props: {
              label: "Commander sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — voici ma commande LUMIÈRE :\n- Produit(s) :\n- Livraison ou retrait boutique :\n- Ville :\n- Paiement :",
            },
          },
          {
            id: "sk-cmd-faq",
            type: "faq",
            props: {
              heading: "FAQ commande",
              items: [
                { question: "Puis-je récupérer en boutique ?", answer: "Oui — showroom à Dakar, sur rendez-vous. Envoyez votre commande sur WhatsApp, on vous donne un créneau." },
                { question: "Puis-je retourner un produit ?", answer: "Produit non-ouvert : échange ou remboursement sous 7 jours. VIP : retour gratuit pris en charge." },
                { question: "Les produits sont-ils naturels ?", answer: "Tous nos produits sont formulés à base d'ingrédients naturels africains. Sans sulfates SLS/SLES, sans parabènes, sans parfum de synthèse." },
                { question: "Y a-t-il un programme de fidélité ?", answer: "Oui — à partir de 3 commandes, vous rejoignez le club VIP : accès anticipé + réductions + consultant beauté dédié." },
              ],
            },
          },
          footer("sk-footer-commander"),
        ],
      },
    ],
  };
}
