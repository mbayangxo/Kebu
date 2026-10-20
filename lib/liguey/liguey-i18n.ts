/**
 * Translations for Kebu Liguey (K066) — English, French, Wolof.
 *
 * WOLOF NOTICE: the `wo` strings below are a best-effort machine/assistant
 * translation, not reviewed by a fluent native speaker. Do not treat a
 * passing automated test as linguistic acceptance of the Wolof wording.
 * The existing LanguageBar "AI translations are approximate" banner
 * (app/components/language-bar.tsx, HIGH_QUALITY_LANGS) already excludes
 * "wo" and surfaces a correction callout — reused here deliberately,
 * exactly as lib/network/network-i18n.ts does, rather than inventing a
 * second review mechanism.
 *
 * Stored/canonical values (employment_type, location_type, listing/
 * application status) are never translated — only their displayed label
 * is, via employmentTypeLabel/locationTypeLabel/listingStatusLabel/
 * applicationStatusLabel. Keep the canonical English string everywhere
 * else (API payloads, filters, DB comparisons).
 */

export type LigueyLang = "en" | "fr" | "wo";
export const LIGUEY_SUPPORTED_LANGS: LigueyLang[] = ["en", "fr", "wo"];

export function isLigueyLang(lang: string): lang is LigueyLang {
  return lang === "en" || lang === "fr" || lang === "wo";
}

/** Falls back to English for any locale not yet translated for Liguey (the global LocaleProvider supports 17). */
export function resolveLigueyLang(lang: string): LigueyLang {
  return isLigueyLang(lang) ? lang : "en";
}

export type LigueyKey =
  | "brand" | "home_title" | "home_intro"
  | "home_profile_start" | "home_profile_edit" | "home_profile_hint_start" | "home_profile_hint_started"
  | "home_profile_cta_start" | "home_profile_cta_edit"
  | "home_discover_title" | "home_discover_hint" | "home_discover_cta"
  | "home_applications_title" | "home_applications_hint_some" | "home_applications_hint_none" | "home_applications_cta"
  | "home_managed_title" | "home_managed_cta"
  | "home_today_title" | "home_today_body"

  | "profile_title" | "profile_subtitle_unverified" | "profile_subtitle_verified"
  | "profile_label_headline" | "profile_placeholder_headline"
  | "profile_label_about" | "profile_placeholder_about"
  | "profile_label_skills" | "profile_placeholder_skills"
  | "profile_label_languages" | "profile_placeholder_languages"
  | "profile_label_location" | "profile_placeholder_location"
  | "profile_label_country" | "profile_label_availability"
  | "profile_availability_not_set" | "profile_availability_open" | "profile_availability_limited" | "profile_availability_unavailable"
  | "profile_check_remote" | "profile_check_discoverable"
  | "profile_experience_label" | "profile_experience_add" | "profile_experience_hint"
  | "profile_experience_placeholder_title" | "profile_experience_informal" | "profile_experience_formal"
  | "profile_experience_placeholder_description" | "profile_experience_empty" | "profile_experience_remove"
  | "profile_save" | "profile_saving" | "profile_saved" | "profile_loading"
  | "profile_evidence_title" | "profile_evidence_hint" | "profile_evidence_empty"
  | "profile_evidence_choose" | "profile_evidence_label_placeholder" | "profile_evidence_link" | "profile_evidence_remove"
  | "profile_evidence_none_available" | "profile_evidence_all_linked"

  | "discover_title" | "discover_intro" | "discover_loading" | "discover_empty"

  | "public_loading" | "public_not_found" | "public_not_found_hint"
  | "public_requirements_label" | "public_applied" | "public_sign_in_prompt" | "public_sign_in_cta"
  | "public_cover_note_placeholder" | "public_apply" | "public_applying"

  | "applications_title" | "applications_empty" | "applications_withdraw"

  | "employer_title" | "employer_new_listing" | "employer_field_title" | "employer_field_location"
  | "employer_field_description" | "employer_field_requirements" | "employer_create" | "employer_creating"
  | "employer_publish" | "employer_close" | "employer_archive" | "employer_view_applicants" | "employer_hide_applicants"
  | "employer_no_applicants" | "employer_no_cover_note" | "employer_mark_reviewed" | "employer_accept" | "employer_decline"
  | "employer_no_listings" | "employer_profile_skills" | "employer_profile_languages" | "employer_no_profile" | "employer_profile_evidence"
  | "employer_public_link_label";

export const LIGUEY_STRINGS: Record<LigueyLang, Record<LigueyKey, string>> = {
  en: {
    brand: "Kebu Liguey",
    home_title: "Work and recruitment",
    home_intro: "Build the profile people and employers see — including life experience, not only a formal employment record.",
    home_profile_start: "Start your worker profile",
    home_profile_edit: "Your worker profile",
    home_profile_hint_start: "Skills, languages, experience and portfolio evidence.",
    home_profile_hint_started: "Profile started — add more detail.",
    home_profile_cta_start: "Get started",
    home_profile_cta_edit: "Edit profile",
    home_discover_title: "Open work",
    home_discover_hint: "Browse real listings published by Kebu businesses.",
    home_discover_cta: "Discover",
    home_applications_title: "Your applications",
    home_applications_hint_some: "Track status and withdraw if needed.",
    home_applications_hint_none: "You haven't applied to anything yet.",
    home_applications_cta: "View",
    home_managed_title: "Businesses you manage",
    home_managed_cta: "Manage listings",
    home_today_title: "What's here today",
    home_today_body: "Liguey's worker profile, employer listing management, applicant review, and real public work discovery are live. The SAFA connected journey, deeper Network/Rooms integration, and additional language coverage are not built yet.",

    profile_title: "Your worker profile",
    profile_subtitle_unverified: "Self-reported — nothing here is verified yet.",
    profile_subtitle_verified: "Verified",
    profile_label_headline: "Headline",
    profile_placeholder_headline: "e.g. Wolof-French translator and community organizer",
    profile_label_about: "About you",
    profile_placeholder_about: "Tell employers about your background — formal or informal — in your own words.",
    profile_label_skills: "Skills",
    profile_placeholder_skills: "Comma-separated, e.g. translation, bookkeeping",
    profile_label_languages: "Languages",
    profile_placeholder_languages: "Comma-separated, e.g. Wolof, French",
    profile_label_location: "Location",
    profile_placeholder_location: "City, region",
    profile_label_country: "Country code",
    profile_label_availability: "Availability",
    profile_availability_not_set: "Not set",
    profile_availability_open: "Open to work",
    profile_availability_limited: "Limited availability",
    profile_availability_unavailable: "Unavailable",
    profile_check_remote: "Open to remote work",
    profile_check_discoverable: "Discoverable by employers",
    profile_experience_label: "Experience",
    profile_experience_add: "+ Add",
    profile_experience_hint: "Formal jobs and informal/life experience are both welcome here.",
    profile_experience_placeholder_title: "What did you do?",
    profile_experience_informal: "Informal / life experience",
    profile_experience_formal: "Formal employment",
    profile_experience_placeholder_description: "Describe it in your own words",
    profile_experience_empty: "No experience added yet.",
    profile_experience_remove: "Remove experience entry",
    profile_save: "Save profile",
    profile_saving: "Saving…",
    profile_saved: "Saved",
    profile_loading: "Loading your profile…",
    profile_evidence_title: "Portfolio evidence",
    profile_evidence_hint: "Link items from your Library to show your work.",
    profile_evidence_empty: "No portfolio evidence linked yet.",
    profile_evidence_choose: "Choose a Library item…",
    profile_evidence_label_placeholder: "Label (optional)",
    profile_evidence_link: "Link",
    profile_evidence_remove: "Remove",
    profile_evidence_none_available: "You don't have any Library documents, sheets or links yet to use as evidence.",
    profile_evidence_all_linked: "All of your eligible Library items are already linked.",

    discover_title: "Open work",
    discover_intro: "Real listings published by Kebu businesses — nothing here is invented.",
    discover_loading: "Loading…",
    discover_empty: "No open listings right now. Check back soon.",

    public_loading: "Loading…",
    public_not_found: "Listing not found.",
    public_not_found_hint: "It may have been closed or never existed.",
    public_requirements_label: "Requirements",
    public_applied: "Application submitted. Track it from your Liguey profile.",
    public_sign_in_prompt: "Sign in to apply to this listing.",
    public_sign_in_cta: "Sign in",
    public_cover_note_placeholder: "Tell them why you're a fit — formal or informal experience welcome.",
    public_apply: "Apply",
    public_applying: "Submitting…",

    applications_title: "Your applications",
    applications_empty: "You haven't applied to anything yet.",
    applications_withdraw: "Withdraw",

    employer_title: "Listings and applicants",
    employer_new_listing: "New listing",
    employer_field_title: "Title",
    employer_field_location: "Location (city, region)",
    employer_field_description: "Description",
    employer_field_requirements: "Requirements",
    employer_create: "Create draft listing",
    employer_creating: "Creating…",
    employer_publish: "Publish",
    employer_close: "Close",
    employer_archive: "Archive",
    employer_view_applicants: "View applicants",
    employer_hide_applicants: "Hide applicants",
    employer_no_applicants: "No applications yet.",
    employer_no_cover_note: "No cover note",
    employer_mark_reviewed: "Mark reviewed",
    employer_accept: "Accept",
    employer_decline: "Decline",
    employer_no_listings: "No listings yet.",
    employer_profile_skills: "Skills",
    employer_profile_languages: "Languages",
    employer_no_profile: "This applicant hasn't filled out a worker profile yet.",
    employer_profile_evidence: "Portfolio",
    employer_public_link_label: "Public link",
  },
  fr: {
    brand: "Kebu Liguey",
    home_title: "Travail et recrutement",
    home_intro: "Construisez le profil que les gens et les employeurs voient — y compris l'expérience de vie, pas seulement un parcours professionnel formel.",
    home_profile_start: "Commencez votre profil de travailleur",
    home_profile_edit: "Votre profil de travailleur",
    home_profile_hint_start: "Compétences, langues, expérience et preuves de portfolio.",
    home_profile_hint_started: "Profil commencé — ajoutez plus de détails.",
    home_profile_cta_start: "Commencer",
    home_profile_cta_edit: "Modifier le profil",
    home_discover_title: "Offres ouvertes",
    home_discover_hint: "Parcourez les offres réelles publiées par les entreprises Kebu.",
    home_discover_cta: "Découvrir",
    home_applications_title: "Vos candidatures",
    home_applications_hint_some: "Suivez le statut et retirez-vous si besoin.",
    home_applications_hint_none: "Vous n'avez encore postulé à rien.",
    home_applications_cta: "Voir",
    home_managed_title: "Entreprises que vous gérez",
    home_managed_cta: "Gérer les offres",
    home_today_title: "Ce qui est disponible aujourd'hui",
    home_today_body: "Le profil de travailleur Liguey, la gestion des offres employeur, l'examen des candidatures et la découverte publique réelle du travail sont actifs. Le parcours connecté SAFA, l'intégration plus profonde avec Network/Rooms et une couverture linguistique supplémentaire ne sont pas encore construits.",

    profile_title: "Votre profil de travailleur",
    profile_subtitle_unverified: "Auto-déclaré — rien n'est encore vérifié ici.",
    profile_subtitle_verified: "Vérifié",
    profile_label_headline: "Titre",
    profile_placeholder_headline: "ex. Traductrice wolof-français et organisatrice communautaire",
    profile_label_about: "À propos de vous",
    profile_placeholder_about: "Parlez aux employeurs de votre parcours — formel ou informel — avec vos propres mots.",
    profile_label_skills: "Compétences",
    profile_placeholder_skills: "Séparées par des virgules, ex. traduction, comptabilité",
    profile_label_languages: "Langues",
    profile_placeholder_languages: "Séparées par des virgules, ex. Wolof, Français",
    profile_label_location: "Localisation",
    profile_placeholder_location: "Ville, région",
    profile_label_country: "Code pays",
    profile_label_availability: "Disponibilité",
    profile_availability_not_set: "Non défini",
    profile_availability_open: "Disponible pour travailler",
    profile_availability_limited: "Disponibilité limitée",
    profile_availability_unavailable: "Indisponible",
    profile_check_remote: "Ouvert au travail à distance",
    profile_check_discoverable: "Visible par les employeurs",
    profile_experience_label: "Expérience",
    profile_experience_add: "+ Ajouter",
    profile_experience_hint: "Les emplois formels et l'expérience informelle/de vie sont tous les deux les bienvenus ici.",
    profile_experience_placeholder_title: "Qu'avez-vous fait ?",
    profile_experience_informal: "Informel / expérience de vie",
    profile_experience_formal: "Emploi formel",
    profile_experience_placeholder_description: "Décrivez-le avec vos propres mots",
    profile_experience_empty: "Aucune expérience ajoutée pour le moment.",
    profile_experience_remove: "Supprimer cette expérience",
    profile_save: "Enregistrer le profil",
    profile_saving: "Enregistrement…",
    profile_saved: "Enregistré",
    profile_loading: "Chargement de votre profil…",
    profile_evidence_title: "Preuves de portfolio",
    profile_evidence_hint: "Associez des éléments de votre Bibliothèque pour montrer votre travail.",
    profile_evidence_empty: "Aucune preuve de portfolio associée pour le moment.",
    profile_evidence_choose: "Choisissez un élément de la Bibliothèque…",
    profile_evidence_label_placeholder: "Étiquette (optionnel)",
    profile_evidence_link: "Associer",
    profile_evidence_remove: "Retirer",
    profile_evidence_none_available: "Vous n'avez encore aucun document, feuille ou lien dans votre Bibliothèque à utiliser comme preuve.",
    profile_evidence_all_linked: "Tous vos éléments de Bibliothèque éligibles sont déjà associés.",

    discover_title: "Offres ouvertes",
    discover_intro: "Des offres réelles publiées par des entreprises Kebu — rien n'est inventé ici.",
    discover_loading: "Chargement…",
    discover_empty: "Aucune offre ouverte pour le moment. Revenez bientôt.",

    public_loading: "Chargement…",
    public_not_found: "Offre introuvable.",
    public_not_found_hint: "Elle a peut-être été clôturée ou n'a jamais existé.",
    public_requirements_label: "Exigences",
    public_applied: "Candidature envoyée. Suivez-la depuis votre profil Liguey.",
    public_sign_in_prompt: "Connectez-vous pour postuler à cette offre.",
    public_sign_in_cta: "Se connecter",
    public_cover_note_placeholder: "Expliquez pourquoi vous êtes fait pour ce poste — expérience formelle ou informelle bienvenue.",
    public_apply: "Postuler",
    public_applying: "Envoi…",

    applications_title: "Vos candidatures",
    applications_empty: "Vous n'avez encore postulé à rien.",
    applications_withdraw: "Retirer",

    employer_title: "Offres et candidats",
    employer_new_listing: "Nouvelle offre",
    employer_field_title: "Titre",
    employer_field_location: "Lieu (ville, région)",
    employer_field_description: "Description",
    employer_field_requirements: "Exigences",
    employer_create: "Créer un brouillon d'offre",
    employer_creating: "Création…",
    employer_publish: "Publier",
    employer_close: "Clôturer",
    employer_archive: "Archiver",
    employer_view_applicants: "Voir les candidats",
    employer_hide_applicants: "Masquer les candidats",
    employer_no_applicants: "Aucune candidature pour le moment.",
    employer_no_cover_note: "Aucune lettre de motivation",
    employer_mark_reviewed: "Marquer comme examinée",
    employer_accept: "Accepter",
    employer_decline: "Refuser",
    employer_no_listings: "Aucune offre pour le moment.",
    employer_profile_skills: "Compétences",
    employer_profile_languages: "Langues",
    employer_no_profile: "Ce candidat n'a pas encore rempli de profil de travailleur.",
    employer_profile_evidence: "Portfolio",
    employer_public_link_label: "Lien public",
  },
  wo: {
    brand: "Kebu Liguey",
    home_title: "Liggéey ak takk",
    home_intro: "Defar profil bi ñépp ak boroom liggéey yi di gis — ci lan ñu bokk fii dañu bokk dund gi, du rekk liggéey yu ñu bind.",
    home_profile_start: "Tambali sa profil liggéeykat",
    home_profile_edit: "Sa profil liggéeykat",
    home_profile_hint_start: "Xam-xam, làkk, dund ak firnde liggéey yi nga def.",
    home_profile_hint_started: "Profil bi tambali na — yokk ay detay.",
    home_profile_cta_start: "Tambali",
    home_profile_cta_edit: "Soppi profil",
    home_discover_title: "Liggéey yu ubbi",
    home_discover_hint: "Xool liggéey yu dëgg yu ñu publier ci business Kebu yi.",
    home_discover_cta: "Seet",
    home_applications_title: "Sa ay demande yi",
    home_applications_hint_some: "Xool fa mu toll ak nangu ko si soxla.",
    home_applications_hint_none: "Demandeul-tay demande.",
    home_applications_cta: "Xool",
    home_managed_title: "Business yi nga di xokk",
    home_managed_cta: "Xokk liggéey yi",
    home_today_title: "Lan am tay",
    home_today_body: "Profil liggéeykat bu Liguey, xokk liggéey bu boroom liggéey, seetlu demande yi, ak seet liggéey yu dëgg ci ëttu ñépp dañu ub ci. Démarche SAFA bi, bokk gi ak Network/Rooms, ak làkk yu bare dañu tollu ba tay.",

    profile_title: "Sa profil liggéeykat",
    profile_subtitle_unverified: "Sa bopp a ko bind — lenn fi seetlu bi ñu tabax.",
    profile_subtitle_verified: "Seetlu na",
    profile_label_headline: "Turu liggéey",
    profile_placeholder_headline: "Misaal: Tuxlaatkat wolof-farañse te jëflante ci koom-koom",
    profile_label_about: "Ci yow",
    profile_placeholder_about: "Wax boroom liggéey yi sa dund — yu bind walla yu bind — ci say baat.",
    profile_label_skills: "Xam-xam",
    profile_placeholder_skills: "Bind ko ak virgule, misaal: tuxlaat, gëstu alal",
    profile_label_languages: "Làkk yi",
    profile_placeholder_languages: "Bind ko ak virgule, misaal: Wolof, Farañse",
    profile_label_location: "Fa nga dëkk",
    profile_placeholder_location: "Dëkk, diiwaan",
    profile_label_country: "Kod réew",
    profile_label_availability: "Ndam bu nekk",
    profile_availability_not_set: "Defaru ko",
    profile_availability_open: "Ubbi na ngir liggéey",
    profile_availability_limited: "Ndam bu tuuti",
    profile_availability_unavailable: "Nekkul",
    profile_check_remote: "Ubbi na ci liggéey yu sori",
    profile_check_discoverable: "Boroom liggéey yi mën nañu la gis",
    profile_experience_label: "Dund",
    profile_experience_add: "+ Yokk",
    profile_experience_hint: "Liggéey yu bind ak dund yu bind ñoom ñaar ñu nangu nañu fii.",
    profile_experience_placeholder_title: "Lan nga def?",
    profile_experience_informal: "Du bind / dund",
    profile_experience_formal: "Liggéey bu bind",
    profile_experience_placeholder_description: "Wax ko ci say baat",
    profile_experience_empty: "Amul dund bu yokk tay.",
    profile_experience_remove: "Jële dund bii",
    profile_save: "Denc profil",
    profile_saving: "Dencu…",
    profile_saved: "Denc na",
    profile_loading: "Di yebbi sa profil…",
    profile_evidence_title: "Firnde liggéey",
    profile_evidence_hint: "Jox firnde yu bokk ci sa Library ngir won sa liggéey.",
    profile_evidence_empty: "Amul firnde bu jokku tay.",
    profile_evidence_choose: "Tànn benn bind ci Library…",
    profile_evidence_label_placeholder: "Tur (du war)",
    profile_evidence_link: "Jokku",
    profile_evidence_remove: "Jële",
    profile_evidence_none_available: "Amoo benn bind, feuille walla lien ci sa Library ngir jëfandikoo mu nekk firnde.",
    profile_evidence_all_linked: "Say bind yépp yu mën a jëfandikoo defa nañu jokku.",

    discover_title: "Liggéey yu ubbi",
    discover_intro: "Liggéey yu dëgg yu ñu publier ci business Kebu yi — lenn fi bindul.",
    discover_loading: "Di yebbi…",
    discover_empty: "Amul liggéey bu ubbi tay. Delloosi.",

    public_loading: "Di yebbi…",
    public_not_found: "Liggéey bi gisu ko.",
    public_not_found_hint: "Mën na nekk tëj walla amagul woon.",
    public_requirements_label: "Li war",
    public_applied: "Demande bi yónnee na. Xool ko ci sa profil Liguey.",
    public_sign_in_prompt: "Dugg ngir dugal demande ci liggéey bii.",
    public_sign_in_cta: "Dugg",
    public_cover_note_placeholder: "Wax lu tax nga mën liggéey bii — dund bu bind walla bu bind, ñépp nangu nañu ko.",
    public_apply: "Dugal demande",
    public_applying: "Di yónnee…",

    applications_title: "Sa ay demande yi",
    applications_empty: "Demandeul-tay demande.",
    applications_withdraw: "Nangu",

    employer_title: "Liggéey yi ak demande yi",
    employer_new_listing: "Liggéey bu bees",
    employer_field_title: "Tur",
    employer_field_location: "Fa mu nekk (dëkk, diiwaan)",
    employer_field_description: "Leeral",
    employer_field_requirements: "Li war",
    employer_create: "Sos liggéey bu bind",
    employer_creating: "Di sos…",
    employer_publish: "Publier",
    employer_close: "Tëj",
    employer_archive: "Denc",
    employer_view_applicants: "Xool demande yi",
    employer_hide_applicants: "Nëbb demande yi",
    employer_no_applicants: "Amul demande tay.",
    employer_no_cover_note: "Amul nootu bind",
    employer_mark_reviewed: "Bind ne seetlu nañu ko",
    employer_accept: "Nangu",
    employer_decline: "Bañ",
    employer_no_listings: "Amul liggéey tay.",
    employer_profile_skills: "Xam-xam",
    employer_profile_languages: "Làkk yi",
    employer_no_profile: "Demandeel bii binnutul profil liggéeykat.",
    employer_profile_evidence: "Firnde",
    employer_public_link_label: "Lien public",
  },
};

export function ligueyT(lang: string, key: LigueyKey): string {
  return LIGUEY_STRINGS[resolveLigueyLang(lang)][key] ?? LIGUEY_STRINGS.en[key];
}

export const EMPLOYMENT_TYPE_LABELS: Record<LigueyLang, Record<string, string>> = {
  en: { full_time: "Full-time", part_time: "Part-time", contract: "Contract", internship: "Internship", apprenticeship: "Apprenticeship", gig: "Gig" },
  fr: { full_time: "Temps plein", part_time: "Temps partiel", contract: "Contrat", internship: "Stage", apprenticeship: "Apprentissage", gig: "Mission" },
  wo: { full_time: "Jamono bu mat", part_time: "Jamono bu tuuti", contract: "Kontaraa", internship: "Jàng-liggéey", apprenticeship: "Jàng-takk", gig: "Liggéey bu gaaw" },
};
export function employmentTypeLabel(value: string, lang: string): string {
  return EMPLOYMENT_TYPE_LABELS[resolveLigueyLang(lang)][value] ?? value.replaceAll("_", " ");
}

export const LOCATION_TYPE_LABELS: Record<LigueyLang, Record<string, string>> = {
  en: { onsite: "On-site", remote: "Remote", hybrid: "Hybrid" },
  fr: { onsite: "Sur site", remote: "À distance", hybrid: "Hybride" },
  wo: { onsite: "Ci biir", remote: "Bu sori", hybrid: "Xaalis" },
};
export function locationTypeLabel(value: string, lang: string): string {
  return LOCATION_TYPE_LABELS[resolveLigueyLang(lang)][value] ?? value;
}

export const APPLICATION_STATUS_LABELS: Record<LigueyLang, Record<string, string>> = {
  en: { submitted: "Submitted", reviewed: "Reviewed", accepted: "Accepted", declined: "Declined", withdrawn: "Withdrawn" },
  fr: { submitted: "Envoyée", reviewed: "Examinée", accepted: "Acceptée", declined: "Refusée", withdrawn: "Retirée" },
  wo: { submitted: "Yónnee na", reviewed: "Seetlu nañu ko", accepted: "Nangu nañu ko", declined: "Bañ nañu ko", withdrawn: "Nangu na" },
};
export function applicationStatusLabel(value: string, lang: string): string {
  return APPLICATION_STATUS_LABELS[resolveLigueyLang(lang)][value] ?? value.replaceAll("_", " ");
}

export const LISTING_STATUS_LABELS: Record<LigueyLang, Record<string, string>> = {
  en: { draft: "Draft", published: "Published", closed: "Closed", archived: "Archived" },
  fr: { draft: "Brouillon", published: "Publiée", closed: "Clôturée", archived: "Archivée" },
  wo: { draft: "Bind", published: "Publier", closed: "Tëj", archived: "Denc" },
};
export function listingStatusLabel(value: string, lang: string): string {
  return LISTING_STATUS_LABELS[resolveLigueyLang(lang)][value] ?? value.replaceAll("_", " ");
}
