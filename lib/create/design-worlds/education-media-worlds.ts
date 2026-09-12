import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * School / Education Site — programs, enrollment, WhatsApp parent contact
 * Media Company — news, shows, content, advertising
 */

function nav(id: string, brand: string, links: { label: string; href: string }[]) {
  return { id, type: "navigation" as const, props: { brand, links } };
}
function footer(id: string, text: string, links: { label: string; href: string }[]) {
  return { id, type: "footer" as const, props: { text, links } };
}

// ─── SCHOOL / EDUCATION SITE ──────────────────────────────────────────────────

const SCHOOL_NAV = [
  { label: "Programmes", href: "/programmes" },
  { label: "Admission", href: "/admission" },
  { label: "Vie scolaire", href: "/vie-scolaire" },
  { label: "Actualités", href: "/actualites" },
  { label: "Contact", href: "/contact" },
];

export function schoolWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "École",
    theme: {
      primary: "#0D2B5C",
      accent: "#E8A020",
      background: "#F7F9FC",
      text: "#0D2B5C",
      fontDisplay: "Playfair Display",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "school-academic-blue-gold",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("sc-nav-home", "EXCELLENCE", SCHOOL_NAV),
          {
            id: "sc-announce",
            type: "announcement-bar",
            props: {
              text: "Inscriptions 2025–2026 ouvertes — places limitées. Contactez-nous sur WhatsApp.",
              background: "#E8A020",
              textColor: "#FFFFFF",
            },
          },
          {
            id: "sc-hero",
            type: "hero",
            props: {
              heading: "Former les leaders\nde demain.",
              subheading:
                "École primaire, collège et lycée — pédagogie bilingue (français / anglais), enseignants qualifiés, résultats aux examens reconnus. Dakar.",
              buttonLabel: "Demander une admission",
              buttonHref: "/admission",
              align: "left",
              background: "#0D2B5C",
            },
          },
          {
            id: "sc-stats",
            type: "features",
            props: {
              heading: "L'école en chiffres",
              items: [
                { title: "98% de taux de réussite", body: "BFEM et BAC — nos élèves réussissent leurs examens nationaux à 98%. Suivi personnalisé dès la 3ème." },
                { title: "1 200 élèves", body: "De la maternelle au terminale. Groupes de 25 élèves maximum pour un suivi individuel efficace." },
                { title: "85 enseignants qualifiés", body: "Tous titulaires d'un diplôme d'enseignement. Formation continue chaque année." },
                { title: "Bilingue français / anglais", body: "Cours d'anglais dès la maternelle. Brevet international en option au lycée." },
              ],
            },
          },
          {
            id: "sc-programmes-home",
            type: "features",
            props: {
              heading: "Nos niveaux",
              items: [
                { title: "Maternelle (2–5 ans)", body: "Éveil, langage, comptines bilingues, préparation à la lecture. Classes de 15 enfants maximum." },
                { title: "Primaire (CI – CM2)", body: "Programme officiel + renforcement mathématiques, sciences et anglais. Devoirs encadrés." },
                { title: "Collège (6ème – 3ème)", body: "Préparation au BFEM. Options sciences et lettres. Orientation professionnelle en 3ème." },
                { title: "Lycée (2nde – Terminale)", body: "Séries L, S, STEG. Préparation intensive BAC + soutien scolaire inclus." },
              ],
            },
          },
          {
            id: "sc-testimonials",
            type: "testimonials",
            props: {
              heading: "Parents & élèves témoignent",
              items: [
                {
                  quote: "Mon fils est entré au lycée excellence en 4ème avec des difficultés en maths. Il a eu 16 au BAC S. L'encadrement est exceptionnel.",
                  name: "Mme Diallo",
                  role: "Parent d'élève — Dakar",
                },
                {
                  quote: "Les professeurs répondent aux parents sur WhatsApp. Les notes sont envoyées chaque vendredi. Je me sens impliqué dans le parcours de ma fille.",
                  name: "M. Ndiaye",
                  role: "Parent d'élève — Thiès",
                },
              ],
            },
          },
          {
            id: "sc-communication",
            type: "features",
            props: {
              heading: "Communication parents-école",
              items: [
                { title: "Groupe WhatsApp par classe", body: "Chaque classe a son groupe parent. Notes, devoirs, événements — tout en temps réel." },
                { title: "Bulletins trimestriels", body: "Relevés de notes envoyés par WhatsApp et disponibles sur rendez-vous." },
                { title: "Réunion parents-professeurs", body: "3 réunions par an. Possibilité de RDV individuel avec chaque enseignant." },
                { title: "Suivi médical", body: "Infirmière à plein temps. Parents prévenus immédiatement en cas de problème de santé." },
              ],
            },
          },
          {
            id: "sc-wa-home",
            type: "whatsapp",
            props: {
              label: "Demander une visite de l'école — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais en savoir plus sur l'école Excellence pour mon enfant :\n- Niveau visé :\n- Prénom de l'enfant :\n- Vos disponibilités pour une visite :",
            },
          },
          footer("sc-footer-home", "© École Excellence — Dakar. Bilingue, pédagogie de qualité, résultats reconnus.", SCHOOL_NAV),
        ],
      },
      {
        slug: "programmes",
        title: "Programmes",
        sections: [
          nav("sc-nav-prog", "EXCELLENCE", SCHOOL_NAV),
          {
            id: "sc-prog-hero",
            type: "hero",
            props: {
              heading: "Nos programmes",
              subheading: "Programme national sénégalais + renforcement bilingue et numérique. Du préscolaire au BAC.",
              buttonLabel: "S'inscrire",
              buttonHref: "/admission",
              align: "left",
              background: "#0D2B5C",
            },
          },
          {
            id: "sc-prog-detail",
            type: "features",
            props: {
              heading: "Ce que chaque niveau propose",
              items: [
                { title: "Maternelle — éveil & développement", body: "Motricité fine, éveil musical, préprimaire bilingue, jeux éducatifs structurés. Transition douce vers le primaire." },
                { title: "Primaire — fondations solides", body: "Mathématiques renforcées, lecture fluide, sciences expérimentales, informatique dès le CE2. Résultats CFEE excellents." },
                { title: "Collège — construction de la méthode", body: "Apprentissage de la méthode de travail, orientation progressive, ateliers de révision BFEM dès la 4ème." },
                { title: "Lycée — vers les grandes études", body: "Coaching BAC, orientation supérieure (universités locales et internationales), préparation concours grandes écoles." },
                { title: "Soutien scolaire inclus", body: "Devoirs surveillés jusqu'à 17h30 inclus dans les frais de scolarité. Professeurs disponibles pour questions individuelles." },
                { title: "Activités parascolaires", body: "Football, basket, arts plastiques, théâtre, chorale. Développement de l'enfant au-delà des matières académiques." },
              ],
            },
          },
          {
            id: "sc-prog-wa",
            type: "whatsapp",
            props: {
              label: "Questions sur les programmes — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — j'ai une question sur les programmes de l'école Excellence :",
            },
          },
          footer("sc-footer-prog", "© École Excellence.", SCHOOL_NAV),
        ],
      },
      {
        slug: "admission",
        title: "Admission",
        sections: [
          nav("sc-nav-adm", "EXCELLENCE", SCHOOL_NAV),
          {
            id: "sc-adm-hero",
            type: "hero",
            props: {
              heading: "Demande d'admission",
              subheading: "Inscriptions 2025–2026 ouvertes. Places limitées. Remplissez le formulaire — réponse sous 48h.",
              buttonLabel: "Formulaire d'admission",
              buttonHref: "#form",
              align: "left",
              background: "#0D2B5C",
            },
          },
          {
            id: "sc-adm-process",
            type: "features",
            props: {
              heading: "Processus d'admission",
              items: [
                { title: "1. Formulaire en ligne", body: "Remplissez le formulaire ci-dessous. Précisez le niveau souhaité, le prénom de l'enfant et votre numéro WhatsApp." },
                { title: "2. Entretien avec la direction", body: "Un membre de la direction vous contacte sous 48h pour fixer un rendez-vous de visite et d'évaluation." },
                { title: "3. Test de niveau", body: "Évaluation adaptée à l'âge. Pas pour éliminer — pour placer l'enfant dans la classe la plus adaptée." },
                { title: "4. Inscription et scolarité", body: "Dossier validé → paiement des frais d'inscription (Wave, OM ou virement). Rentrée confirmée." },
              ],
            },
          },
          {
            id: "sc-adm-form",
            type: "form",
            props: {
              heading: "Formulaire de préinscription",
              subheading: "Places limitées — premier arrivé, premier servi.",
              buttonLabel: "Envoyer la demande",
              successMessage: "Demande reçue — la direction vous contacte sous 48h.",
              fields: [
                { id: "parent_nom", label: "Prénom et nom (parent / tuteur)", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "email", label: "Email (optionnel)", type: "email", required: false, placeholder: "", options: [] },
                { id: "enfant_nom", label: "Prénom de l'enfant", type: "text", required: true, placeholder: "", options: [] },
                { id: "niveau", label: "Niveau souhaité", type: "select", required: true, placeholder: "", options: ["Maternelle (petite/moyenne/grande section)", "CI (CP)", "CE1 / CE2", "CM1 / CM2", "6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"] },
                { id: "annee_naissance", label: "Année de naissance de l'enfant", type: "text", required: true, placeholder: "Ex : 2015", options: [] },
                { id: "ecole_actuelle", label: "École actuelle (si applicable)", type: "text", required: false, placeholder: "", options: [] },
                { id: "note", label: "Message (optionnel)", type: "textarea", required: false, placeholder: "Questions, besoins particuliers…", options: [] },
              ],
            },
          },
          {
            id: "sc-adm-wa",
            type: "whatsapp",
            props: {
              label: "Demander une inscription sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais inscrire mon enfant à l'école Excellence :\n- Prénom de l'enfant :\n- Niveau visé :\n- Mes disponibilités pour un RDV :",
            },
          },
          {
            id: "sc-adm-frais",
            type: "text",
            props: {
              heading: "Frais de scolarité",
              body: "Les frais varient selon le niveau. Ils incluent : cours, devoirs surveillés, activités parascolaires, matériel pédagogique.\nPaiement possible par tranche (trimestres) par Wave, Orange Money ou virement. Aucun frais caché.\nContactez-nous pour le détail des frais selon le niveau.",
            },
          },
          footer("sc-footer-adm", "© École Excellence.", SCHOOL_NAV),
        ],
      },
      {
        slug: "vie-scolaire",
        title: "Vie scolaire",
        sections: [
          nav("sc-nav-vie", "EXCELLENCE", SCHOOL_NAV),
          {
            id: "sc-vie-hero",
            type: "hero",
            props: {
              heading: "Vie scolaire",
              subheading: "Au-delà des cours — sport, culture, arts, voyages pédagogiques, cérémonies. Une école où les enfants s'épanouissent.",
              buttonLabel: "Nous rejoindre",
              buttonHref: "/admission",
              align: "center",
              background: "#0D2B5C",
            },
          },
          {
            id: "sc-vie-activities",
            type: "features",
            props: {
              heading: "Activités & clubs",
              items: [
                { title: "Sport", body: "Football, basket, athlétisme, arts martiaux. Compétitions inter-écoles. Terrain de sport rénové 2024." },
                { title: "Arts & culture", body: "Théâtre, chorale, danse, arts plastiques. Spectacle de fin d'année ouvert aux parents." },
                { title: "Informatique & robotique", body: "Salle informatique, initiation au code dès le CM1, club robotique pour lycéens." },
                { title: "Voyages pédagogiques", body: "Sorties scolaires mensuelles. Voyage de fin d'année (sécurité et budget confirmés avec les parents)." },
              ],
            },
          },
          {
            id: "sc-vie-gallery",
            type: "gallery",
            props: {
              heading: "La vie à l'école",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Cérémonie de remise des diplômes" },
                { src: "", alt: "Cours de science" },
                { src: "", alt: "Match inter-écoles" },
                { src: "", alt: "Atelier arts plastiques" },
                { src: "", alt: "Journée portes ouvertes" },
                { src: "", alt: "Club robotique" },
              ],
            },
          },
          footer("sc-footer-vie", "© École Excellence.", SCHOOL_NAV),
        ],
      },
      {
        slug: "actualites",
        title: "Actualités",
        sections: [
          nav("sc-nav-actu", "EXCELLENCE", SCHOOL_NAV),
          {
            id: "sc-actu-hero",
            type: "hero",
            props: {
              heading: "Actualités",
              subheading: "Résultats aux examens, événements, annonces importantes — tout sur la vie de l'école.",
              buttonLabel: "Nous contacter",
              buttonHref: "/contact",
              align: "center",
              background: "#0D2B5C",
            },
          },
          {
            id: "sc-actu-wa",
            type: "whatsapp",
            props: {
              label: "Rejoindre le groupe WhatsApp parents — informations en temps réel",
              phone: "+221770000000",
              message: "Bonjour — je suis parent à l'école Excellence et je voudrais rejoindre le groupe WhatsApp d'information.",
            },
          },
          footer("sc-footer-actu", "© École Excellence.", SCHOOL_NAV),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("sc-nav-contact", "EXCELLENCE", SCHOOL_NAV),
          {
            id: "sc-contact",
            type: "contact",
            props: {
              heading: "Nous contacter",
              email: "direction@excellence-school.sn",
              phone: "+221770000000",
              address: "École Excellence — Dakar · Lun–ven 7h30–18h · Sam 8h–13h",
            },
          },
          {
            id: "sc-contact-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                { question: "L'école suit-elle le programme officiel sénégalais ?", answer: "Oui — programme MENS à tous les niveaux, avec renforcement bilingue et numérique en complément." },
                { question: "Y a-t-il une cantine ?", answer: "Oui — repas chaud servi du lundi au vendredi. Menu hebdomadaire envoyé aux parents sur WhatsApp chaque vendredi." },
                { question: "Proposez-vous des bourses ?", answer: "Bourses partielles disponibles pour les familles en difficulté sur présentation de justificatifs. Renseignez-vous à la direction." },
                { question: "Les frais incluent-ils les uniformes ?", answer: "Uniforme non inclus. Disponible en commande groupée à la rentrée via l'école." },
              ],
            },
          },
          footer("sc-footer-contact", "© École Excellence — Dakar.", SCHOOL_NAV),
        ],
      },
    ],
  };
}

// ─── MEDIA COMPANY ────────────────────────────────────────────────────────────

const MEDIA_NAV = [
  { label: "Actualités", href: "/actualites" },
  { label: "Émissions", href: "/emissions" },
  { label: "Publicité", href: "/publicite" },
  { label: "Podcast", href: "/podcast" },
  { label: "Contact", href: "/contact" },
];

export function mediaCompanyWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Média",
    theme: {
      primary: "#0C0C0C",
      accent: "#E03030",
      background: "#F5F5F3",
      text: "#0C0C0C",
      fontDisplay: "Space Grotesk",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "media-news-bold",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("md-nav-home", "URBAN MEDIA", MEDIA_NAV),
          {
            id: "md-announce",
            type: "announcement-bar",
            props: {
              text: "🔴 EN DIRECT — Actualité Sénégal & Afrique de l'Ouest · 24h/24 sur WhatsApp · Abonnez-vous",
              background: "#E03030",
              textColor: "#FFFFFF",
            },
          },
          {
            id: "md-hero",
            type: "hero",
            props: {
              heading: "L'info africaine,\npar des Africains.",
              subheading:
                "Actualité Sénégal, Afrique de l'Ouest, diaspora. Podcast, émissions web, fact-checking. La voix des entrepreneures, des créateurs et des décideurs africains.",
              buttonLabel: "Dernières actualités",
              buttonHref: "/actualites",
              align: "left",
              background: "#0C0C0C",
            },
          },
          {
            id: "md-featured",
            type: "features",
            props: {
              heading: "Ce qu'on fait",
              items: [
                { title: "Actualités quotidiennes", body: "Économie, politique, culture, sport — l'essentiel de l'Afrique en 5 minutes. Éditions matin et soir, 7j/7." },
                { title: "Émissions web", body: "Talk-shows, débats, reportages — diffusés en direct sur YouTube et Facebook, rediffusés sur le site." },
                { title: "Podcast", body: "Entrepreneurs africains, créateurs, activistes — leurs histoires en 30 minutes. Disponible partout." },
                { title: "Brand content", body: "Contenu sponsorisé, publi-reportages, campagnes digitales — pour les marques qui veulent toucher l'Afrique." },
              ],
            },
          },
          {
            id: "md-emissions-home",
            type: "features",
            props: {
              heading: "Émissions phares",
              items: [
                { title: "Business Africa", body: "Portraits d'entrepreneurs de toute l'Afrique. Mercredi 20h, live YouTube. Rediffusion vendredi." },
                { title: "Décryptage", body: "Analyse politique et économique. Vendredi 19h30. Avec des experts locaux et internationaux." },
                { title: "Mode & Identité", body: "La mode africaine contemporaine — créateurs, tendances, business du style. Samedi 18h." },
                { title: "Fact-check hebdo", body: "On vérifie les infos qui circulent sur WhatsApp. Publié chaque lundi. Partage libre." },
              ],
            },
          },
          {
            id: "md-newsletter",
            type: "whatsapp",
            props: {
              label: "Recevoir l'info quotidienne — rejoignez sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais m'abonner à l'actualité quotidienne d'Urban Media sur WhatsApp.",
            },
          },
          {
            id: "md-audience",
            type: "features",
            props: {
              heading: "Notre audience",
              items: [
                { title: "250 000+ abonnés", body: "Toutes plateformes confondues — YouTube, Facebook, Instagram, WhatsApp. Croissance mensuelle : +8%." },
                { title: "Afrique & diaspora", body: "Sénégal, Côte d'Ivoire, Mali, Cameroun, France, Belgique, Canada. Audience active, engagée, achetante." },
                { title: "25–44 ans, urbain éduqué", body: "Profil : professionnel urbain, entrepreneur, étudiant. Fort pouvoir d'achat. Prescripteur d'opinion." },
                { title: "Fact-checked, vérifiable", body: "Politique éditoriale stricte. Nos sources sont vérifiées. Les corrections sont publiées quand nécessaire." },
              ],
            },
          },
          footer("md-footer-home", "© Urban Media — actualité africaine, podcast, émissions web. Dakar.", MEDIA_NAV),
        ],
      },
      {
        slug: "actualites",
        title: "Actualités",
        sections: [
          nav("md-nav-actu", "URBAN MEDIA", MEDIA_NAV),
          {
            id: "md-actu-hero",
            type: "hero",
            props: {
              heading: "Actualités",
              subheading: "L'info Sénégal & Afrique de l'Ouest — vérifiée, sourcée, sans filtre.",
              buttonLabel: "Recevoir sur WhatsApp",
              buttonHref: "/contact",
              align: "left",
              background: "#0C0C0C",
            },
          },
          {
            id: "md-actu-wa",
            type: "whatsapp",
            props: {
              label: "Abonnez-vous — actualité quotidienne sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais recevoir les actualités Urban Media sur WhatsApp.",
            },
          },
          footer("md-footer-actu", "© Urban Media.", MEDIA_NAV),
        ],
      },
      {
        slug: "emissions",
        title: "Émissions",
        sections: [
          nav("md-nav-emis", "URBAN MEDIA", MEDIA_NAV),
          {
            id: "md-emis-hero",
            type: "hero",
            props: {
              heading: "Nos émissions",
              subheading: "Talk-shows, débats, reportages — en direct et en replay. Diffusés sur YouTube, Facebook et ici.",
              buttonLabel: "S'abonner YouTube",
              buttonHref: "/contact",
              align: "left",
              background: "#0C0C0C",
            },
          },
          {
            id: "md-emis-list",
            type: "features",
            props: {
              heading: "Programme",
              items: [
                { title: "Business Africa — Mer 20h", body: "Portraits d'entrepreneurs de toute l'Afrique. Invités confirmés chaque semaine. Rediffusion vendredi à 20h." },
                { title: "Décryptage — Ven 19h30", body: "Analyse politique et économique avec des experts. Format 45 min, questions du public acceptées en live." },
                { title: "Mode & Identité — Sam 18h", body: "Créateurs de mode africains, tendances, business du style. Interviews + défilés courts en studio." },
                { title: "Fact-check hebdo — Lun", body: "On vérifie les infos virales de la semaine. Court, sourcé, partage libre." },
              ],
            },
          },
          {
            id: "md-emis-wa",
            type: "whatsapp",
            props: {
              label: "Proposer un sujet ou être invité — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais proposer un sujet ou être invité dans une émission Urban Media :\n- Émission :\n- Sujet :\n- Mon profil :",
            },
          },
          footer("md-footer-emis", "© Urban Media.", MEDIA_NAV),
        ],
      },
      {
        slug: "publicite",
        title: "Publicité & partenariats",
        sections: [
          nav("md-nav-pub", "URBAN MEDIA", MEDIA_NAV),
          {
            id: "md-pub-hero",
            type: "hero",
            props: {
              heading: "Votre marque,\nnotre audience.",
              subheading: "Publicité display, brand content, sponsoring d'émission, publi-reportage — formats à partir de 150 000 XOF.",
              buttonLabel: "Demander un devis",
              buttonHref: "#form",
              align: "left",
              background: "#0C0C0C",
            },
          },
          {
            id: "md-pub-audience",
            type: "features",
            props: {
              heading: "Pourquoi Urban Media",
              items: [
                { title: "250 000+ audience active", body: "Profil 25–44 ans, urbain, revenu moyen à élevé. Forte intentionnalité d'achat." },
                { title: "Contexte de confiance", body: "Les lecteurs / spectateurs font confiance au média — votre marque bénéficie de cette crédibilité." },
                { title: "Formats sur mesure", body: "Du simple banner au contenu éditorial complet. On adapte au message et au budget." },
                { title: "Reporting transparent", body: "Rapport de campagne : impressions, clics, vues, engagement. Chaque semaine pendant la campagne." },
              ],
            },
          },
          {
            id: "md-pub-formats",
            type: "features",
            props: {
              heading: "Formats disponibles",
              items: [
                { title: "Sponsoring d'émission", body: "Votre marque associée à Business Africa, Décryptage ou Mode & Identité. 4 semaines minimum. Mention live + replay." },
                { title: "Publi-reportage", body: "Article rédigé par notre équipe sur votre marque / produit / initiative. Diffusé sur site et réseaux." },
                { title: "Post sponsorisé réseaux", body: "Publication native sur nos comptes Instagram / Facebook / TikTok. Audience organique + boost." },
                { title: "Newsletter WhatsApp", body: "Message sponsorisé dans notre newsletter quotidienne WhatsApp. 50 000+ destinataires actifs." },
              ],
            },
          },
          {
            id: "md-pub-form",
            type: "form",
            props: {
              heading: "Demander un devis",
              subheading: "Brief envoyé → devis sous 24h.",
              buttonLabel: "Envoyer le brief",
              successMessage: "Brief reçu — on vous envoie un devis sous 24h.",
              fields: [
                { id: "marque", label: "Marque / société", type: "text", required: true, placeholder: "", options: [] },
                { id: "contact", label: "Nom et poste", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "objectif", label: "Objectif de campagne", type: "select", required: true, placeholder: "", options: ["Notoriété de marque", "Lancement produit", "Trafic / leads", "Ventes directes", "Recrutement"] },
                { id: "format", label: "Format souhaité", type: "select", required: false, placeholder: "", options: ["Sponsoring émission", "Publi-reportage", "Post réseaux sociaux", "Newsletter WhatsApp", "Combiné — proposez-moi"] },
                { id: "budget", label: "Budget indicatif", type: "select", required: false, placeholder: "", options: ["150 000–500 000 XOF", "500 000–2M XOF", "2M–5M XOF", "> 5M XOF"] },
                { id: "duree", label: "Durée / dates", type: "text", required: false, placeholder: "Ex : 4 semaines, mars–avril 2025", options: [] },
                { id: "brief", label: "Brief (optionnel)", type: "textarea", required: false, placeholder: "Produit, message clé, audience cible…", options: [] },
              ],
            },
          },
          footer("md-footer-pub", "© Urban Media.", MEDIA_NAV),
        ],
      },
      {
        slug: "podcast",
        title: "Podcast",
        sections: [
          nav("md-nav-pod", "URBAN MEDIA", MEDIA_NAV),
          {
            id: "md-pod-hero",
            type: "hero",
            props: {
              heading: "Le podcast",
              subheading: "Entrepreneurs africains, créateurs, activistes — leurs histoires vraies. 30 minutes, une fois par semaine.",
              buttonLabel: "S'abonner",
              buttonHref: "/contact",
              align: "left",
              background: "#0C0C0C",
            },
          },
          {
            id: "md-pod-episodes",
            type: "features",
            props: {
              heading: "Épisodes récents",
              items: [
                { title: "Ep. 47 — De Dakar à Paris Fashion Week", body: "Comment Adja Tall a lancé sa marque depuis Dakar et défilé à Paris en 2 ans. 28 min." },
                { title: "Ep. 46 — Financer son business sans banque", body: "Les alternatives africaines au crédit bancaire — tontine, Wave, Joko, crowdfunding. 32 min." },
                { title: "Ep. 45 — TikTok, l'arme des petites marques sénégalaises", body: "Comment 3 entrepreneurs ont dépassé 100K abonnés et multiplié leurs ventes par 10. 25 min." },
                { title: "Ep. 44 — L'agriculture de demain", body: "Fermes verticales, drones, blockchain — les jeunes qui réinventent l'agriculture africaine. 35 min." },
              ],
            },
          },
          {
            id: "md-pod-platforms",
            type: "text",
            props: {
              heading: "Disponible partout",
              body: "Spotify · Apple Podcasts · Boomplay · SoundCloud · YouTube Music · Deezer\nEnvoyez « Podcast » sur WhatsApp pour recevoir les nouveaux épisodes directement.",
            },
          },
          {
            id: "md-pod-wa",
            type: "whatsapp",
            props: {
              label: "S'abonner au podcast — notifications WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais être prévenu des nouveaux épisodes du podcast Urban Media.",
            },
          },
          footer("md-footer-pod", "© Urban Media.", MEDIA_NAV),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("md-nav-contact", "URBAN MEDIA", MEDIA_NAV),
          {
            id: "md-contact",
            type: "contact",
            props: {
              heading: "Contact",
              email: "contact@urbanmedia.sn",
              phone: "+221770000000",
              address: "Rédaction — Dakar. WhatsApp & email en priorité.",
            },
          },
          {
            id: "md-contact-wa",
            type: "whatsapp",
            props: {
              label: "Nous écrire sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je contacte Urban Media pour :",
            },
          },
          footer("md-footer-contact", "© Urban Media — actualité africaine, podcast, émissions web.", MEDIA_NAV),
        ],
      },
    ],
  };
}
