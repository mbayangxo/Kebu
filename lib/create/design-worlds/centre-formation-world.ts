import type { WebsiteDefinition } from "../website-schema";

/**
 * ACADÉMIE FUTUR — Centre de formation professionnelle & soutien scolaire
 * Trusted education: bleu marine + or chaud + blanc
 * Nunito (display) + Inter (body)
 * Cours de soutien, formations certifiantes, Dakar
 */
export function centreFormationWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "ACADÉMIE FUTUR",
    theme: {
      primary: "#1A2F5A",
      accent: "#F5A623",
      background: "#F8F9FC",
      text: "#1A2330",
      surface: "#EEF1F8",
      fontDisplay: "Nunito",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "round",
      aestheticId: "trusted-education-center",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "📚 Inscriptions ouvertes — Session octobre 2025 · Cours du soir disponibles · Places limitées",
              background: "#F5A623",
              color: "#1A2330",
              linkText: "S'inscrire",
              linkUrl: "/formations",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Centre de Formation · Dakar",
              heading: "Votre avenir\nprofessionnel\ncommence ici.",
              subheading:
                "ACADÉMIE FUTUR propose des formations professionnelles certifiantes, du soutien scolaire et des préparations aux concours pour les jeunes Sénégalais qui veulent aller loin.",
              primaryCta: { label: "Voir les formations", href: "/formations" },
              secondaryCta: { label: "Nous contacter", href: "/contact" },
              backgroundImageUrl: "",
              overlay: 0.3,
              textAlign: "left",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              background: "#1A2F5A",
              items: [
                { value: "2 500", suffix: "+", label: "Élèves formés" },
                { value: "88%", label: "Taux de réussite" },
                { value: "15", label: "Formateurs experts" },
                { value: "10", label: "Ans d'expérience" },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "Pourquoi ACADÉMIE FUTUR",
              layout: "grid",
              items: [
                {
                  icon: "🏆",
                  title: "Certifications reconnues",
                  description:
                    "Nos formations débouchent sur des certifications reconnues par les employeurs — CISCO, Microsoft, comptabilité OHADA, langues.",
                },
                {
                  icon: "👨‍🏫",
                  title: "Formateurs professionnels",
                  description:
                    "Tous nos formateurs sont actifs dans leur secteur — pas que des enseignants théoriques, des praticiens qui vous préparent au vrai monde du travail.",
                },
                {
                  icon: "📅",
                  title: "Horaires flexibles",
                  description:
                    "Cours du matin, du soir et week-end. Pour les actifs, les lycéens et les demandeurs d'emploi — sans quitter votre situation.",
                },
                {
                  icon: "💼",
                  title: "Insertion professionnelle",
                  description:
                    "Partenariats avec 40+ entreprises dakaroises. Aide à la rédaction de CV, préparation aux entretiens, mise en relation avec des recruteurs.",
                },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Nos formations",
              subheading: "Certifiantes, courtes ou longues — pour tous les profils.",
              columns: 3,
              items: [
                {
                  name: "Informatique & Bureautique",
                  description:
                    "Word, Excel, PowerPoint, email professionnel. Certification MOS Microsoft. 4 semaines, cours du soir. Certification incluse.",
                  price: 75000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Populaire",
                  filterTags: ["Informatique", "Courte"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
                {
                  name: "Comptabilité OHADA",
                  description:
                    "Formation comptabilité complète — plan comptable OHADA, bilans, TVA, paie. 3 mois. Préparation CCA.",
                  price: 150000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Comptabilité", "Longue"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
                {
                  name: "Anglais professionnel",
                  description:
                    "English for Business — rédaction emails, présentations, réunions. Niveaux débutant à avancé. Certification TOEIC préparée.",
                  price: 90000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Langues", "Longue"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
                {
                  name: "Marketing digital",
                  description:
                    "Réseaux sociaux, publicité Meta, Google Ads, création contenu. Pour freelance et entreprises. 6 semaines.",
                  price: 120000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Demandé",
                  filterTags: ["Digital", "Courte"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
                {
                  name: "Soutien scolaire lycée",
                  description:
                    "Maths, physique-chimie, SVT pour 2e, 1re et Terminale. 2 séances/semaine en petit groupe de 4 élèves max.",
                  price: 40000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Soutien", "Lycée"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
                {
                  name: "Préparation BFEM / BAC",
                  description:
                    "Programme intensif 4 mois — révisions complètes, examens blancs, méthodologie. Taux de réussite de nos élèves : 94%.",
                  price: 60000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Intensif",
                  filterTags: ["Soutien", "Concours"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Notre histoire",
              heading: "10 ans au service\nde la réussite.",
              body: "Fondée en 2014 par Ibrahim Tall, ancien directeur pédagogique d'une grande école dakaroise, ACADÉMIE FUTUR est née d'un constat simple : les jeunes Sénégalais ont la capacité d'exceller — ils manquent souvent d'outils et d'encadrement adaptés.\n\nAujourd'hui, plus de 2 500 anciens élèves travaillent dans des entreprises locales et internationales, sont à leur compte ou ont continué leurs études supérieures.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Notre équipe", href: "/contact" },
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ils ont réussi avec nous",
              items: [
                {
                  quote:
                    "J'ai suivi la formation Excel avancé le soir après mon travail. En 4 semaines, j'ai obtenu ma certification MOS et obtenu une promotion dans mon entreprise. Investissement rentable.",
                  author: "Moussa D.",
                  role: "Assistant comptable, Dakar",
                },
                {
                  quote:
                    "Après mon BAC, j'ai fait la formation marketing digital. 3 mois après, j'ai mes premiers clients en freelance. Je gagne plus qu'avec un emploi de base.",
                  author: "Adja F.",
                  role: "Freelance marketing digital, Dakar",
                },
                {
                  quote:
                    "Mon fils a suivi le soutien scolaire pendant 1 an. Il était en difficulté en maths. Il a eu son BAC avec mention — c'était inespéré. Merci ACADÉMIE FUTUR.",
                  author: "Mme Sarr",
                  role: "Mère d'élève, Pikine",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Renseignements & inscriptions",
              subheading:
                "Dites-nous quelle formation vous intéresse. On vous répond avec les détails et les disponibilités.",
              phoneNumber: "221720000001",
              message:
                "Bonjour ACADÉMIE FUTUR — je voudrais des renseignements sur [formation choisie / soutien scolaire]. Mon profil : [lycéen / adulte actif / demandeur d'emploi]. Disponibilités : [matin / soir / week-end].",
              buttonLabel: "S'inscrire ou se renseigner",
            },
          },
        ],
      },
      {
        slug: "formations",
        title: "Formations",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Toutes nos formations",
              subheading: "Courtes, longues, certifiantes — pour débutants et professionnels.",
              backgroundImageUrl: "",
              overlay: 0.4,
            },
          },
          {
            type: "features",
            props: {
              heading: "Comment s'inscrire",
              layout: "horizontal",
              items: [
                { icon: "💬", title: "1. Contact", description: "Écrivez-nous sur WhatsApp — on vous renseigne sur les formations et disponibilités." },
                { icon: "📋", title: "2. Évaluation", description: "Test de niveau gratuit pour placer chaque élève dans le bon groupe." },
                { icon: "💳", title: "3. Inscription", description: "Paiement par tranche (Wave/Orange Money). Acompte 30% à l'inscription." },
                { icon: "📚", title: "4. Formation", description: "Cours en présentiel avec supports papier et accès WhatsApp au formateur." },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Toutes les formations",
              columns: 3,
              items: [
                {
                  name: "Informatique & Bureautique",
                  description: "Word, Excel, PowerPoint, certification MOS. 4 semaines.",
                  price: 75000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Informatique", "Courte"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
                {
                  name: "Marketing digital",
                  description: "Réseaux sociaux, Meta Ads, Google Ads, contenu. 6 semaines.",
                  price: 120000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Digital", "Courte"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
                {
                  name: "Comptabilité OHADA",
                  description: "Comptabilité complète SYSCOHADA. 3 mois.",
                  price: 150000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Comptabilité", "Longue"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
                {
                  name: "Anglais professionnel",
                  description: "Business English, certification TOEIC. 3 mois.",
                  price: 90000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Langues", "Longue"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
                {
                  name: "Gestion de projet",
                  description: "Méthodes agile, outils numériques, PMP prep. 6 semaines.",
                  price: 130000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Management", "Courte"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
                {
                  name: "Soutien scolaire lycée",
                  description: "Maths, sciences, français — petit groupe 4 élèves. Par mois.",
                  price: 40000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Soutien", "Lycée"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
                {
                  name: "Préparation BAC intensif",
                  description: "4 mois révisions + examens blancs + méthodologie.",
                  price: 60000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "94% réussite",
                  filterTags: ["Concours", "Lycée"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
                {
                  name: "Français professionnel",
                  description: "Rédaction administrative, communication écrite, DELF B2.",
                  price: 80000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Langues", "Longue"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
                {
                  name: "Création d'entreprise",
                  description: "Business plan, formalités légales, financement, pitch. 4 semaines.",
                  price: 100000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Nouveau",
                  filterTags: ["Management", "Courte"],
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000001",
                },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Peut-on payer en plusieurs fois ?",
                  answer:
                    "Oui — paiement en 2 ou 3 fois via Wave ou Orange Money. Acompte 30% à l'inscription, reste en cours de formation.",
                },
                {
                  question: "Les cours se font quand ?",
                  answer:
                    "Matin (8h-12h), soir (18h-20h) et samedi. Les horaires sont fixés à l'inscription selon le groupe.",
                },
                {
                  question: "Peut-on suivre une formation à distance ?",
                  answer:
                    "Certaines formations ont une version hybride (présentiel + WhatsApp). Contactez-nous pour vérifier selon la formation choisie.",
                },
              ],
              contactPanel: {
                heading: "Besoin d'un conseil orientation ?",
                body: "On vous aide à choisir la formation adaptée à votre profil.",
                ctaLabel: "Nous contacter",
                ctaHref: "https://wa.me/221720000001",
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
              heading: "Nous contacter",
              subheading: "Centre ouvert du lundi au samedi, 8h–20h. Accueil sur rendez-vous.",
              address: "ACADÉMIE FUTUR — Rue 10, Liberté 6, Dakar, Sénégal",
              phone: "+221 72 000 00 01",
              email: "info@academiefutur.sn",
              mapEmbedUrl: "",
            },
          },
          {
            type: "whatsapp",
            props: {
              label: "WhatsApp — renseignements",
              phone: "+221720000001",
              message: "Bonjour ACADÉMIE FUTUR — je voudrais des renseignements sur vos formations.",
            },
          },
        ],
      },
    ],
  };
}
