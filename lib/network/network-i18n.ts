/**
 * Translations for /network and /network/join — English, French, Wolof.
 *
 * WOLOF NOTICE: the `wo` strings below are a best-effort machine/assistant
 * translation, not reviewed by a fluent native speaker. Do not treat a
 * passing automated test as linguistic acceptance of the Wolof wording.
 * The existing LanguageBar "AI translations are approximate" banner
 * (app/components/language-bar.tsx, HIGH_QUALITY_LANGS) already excludes
 * "wo" and surfaces a correction callout — reused here deliberately rather
 * than inventing a second review mechanism.
 *
 * Enum values stored in the database (sector, stage, looking_for) are never
 * translated — only their displayed label is. Use needLabel/stageLabel/
 * sectorLabel for display; keep the canonical English string everywhere
 * else (API payloads, filters, DB comparisons).
 */
import type { NETWORK_NEEDS, SECTORS, BUSINESS_STAGES } from "./types";

export type NetworkLang = "en" | "fr" | "wo";
export const NETWORK_SUPPORTED_LANGS: NetworkLang[] = ["en", "fr", "wo"];

export function isNetworkLang(lang: string): lang is NetworkLang {
  return lang === "en" || lang === "fr" || lang === "wo";
}

/** Falls back to English for any locale not yet translated for Network (the global LocaleProvider supports 17). */
export function resolveNetworkLang(lang: string): NetworkLang {
  return isNetworkLang(lang) ? lang : "en";
}

export type NetworkKey =
  | "join_title" | "join_intro" | "section_about_you"
  | "label_full_name" | "placeholder_full_name"
  | "label_city_country" | "placeholder_city_country"
  | "label_country_filter" | "placeholder_country_filter"
  | "label_languages_spoken" | "placeholder_languages_spoken"
  | "section_what_building" | "label_sector" | "select_sector"
  | "label_headline" | "placeholder_headline"
  | "label_building" | "placeholder_building"
  | "label_stage" | "select_stage"
  | "section_need_offer" | "label_looking_for" | "label_offering" | "placeholder_offering"
  | "error_signed_out_join" | "error_not_confirmed_generic" | "error_not_confirmed_catch"
  | "link_sign_in_other_tab" | "link_check_network"
  | "button_submit_idle" | "button_submit_loading"
  | "footer_privacy_note" | "success_heading" | "success_body" | "button_view_network"
  | "badge_the_network" | "dir_title" | "dir_intro" | "nav_join_network"
  | "stat_members_shown" | "stat_listed_members" | "stat_countries_shown" | "stat_sectors_shown"
  | "loading_members" | "error_signed_out_browse" | "error_load_failed"
  | "link_sign_in" | "button_retry"
  | "placeholder_search" | "aria_search_members"
  | "filter_all" | "filter_looking_for_prefix"
  | "aria_filter_country" | "option_all_countries"
  | "empty_no_match_filters" | "empty_no_profiles_yet"
  | "card_looking_for_label" | "card_what_they_offer_label"
  | "cta_heading" | "cta_body";

export const NETWORK_STRINGS: Record<NetworkLang, Record<NetworkKey, string>> = {
  en: {
    join_title: "Join the network",
    join_intro: "Tell the community what you're building and what you need. Your profile will be visible to other African founders, diaspora investors, and partners.",
    section_about_you: "About you",
    label_full_name: "Full name",
    placeholder_full_name: "Your name",
    label_city_country: "City, Country",
    placeholder_city_country: "e.g. Dakar, Senegal",
    label_country_filter: "Country (for filtering)",
    placeholder_country_filter: "e.g. Senegal",
    label_languages_spoken: "Languages spoken",
    placeholder_languages_spoken: "e.g. French, Wolof, English",
    section_what_building: "What you're building",
    label_sector: "Sector",
    select_sector: "Select sector",
    label_headline: "One-line headline",
    placeholder_headline: "e.g. Building a pan-African fashion distribution platform",
    label_building: "What you're building (2–4 sentences)",
    placeholder_building: "Describe your business: what it does, who it serves, what stage you're at, what traction you have...",
    label_stage: "Business stage",
    select_stage: "Select stage",
    section_need_offer: "What you need & offer",
    label_looking_for: "What are you looking for? (select all that apply)",
    label_offering: "What can you offer to partners?",
    placeholder_offering: "e.g. Network of 200 farmers, EU organic certification, 10 years logistics experience...",
    error_signed_out_join: "Sign in to save your profile. Your draft is still here.",
    error_not_confirmed_generic: "Your profile was not confirmed saved. Check the network before retrying.",
    error_not_confirmed_catch: "Your profile was not confirmed saved. Your draft is still here; check the network before retrying.",
    link_sign_in_other_tab: "Sign in in another tab",
    link_check_network: "Check the network",
    button_submit_idle: "Join the network →",
    button_submit_loading: "Adding you to the network...",
    footer_privacy_note: "Your profile will be visible to other Kebu members. We never sell your data.",
    success_heading: "You're in the network",
    success_body: "Your profile has been added. Other founders, investors, and partners can now find you. Welcome to the First-Order Collective.",
    button_view_network: "View the network →",
    badge_the_network: "THE NETWORK",
    dir_title: "Who's building across Africa",
    dir_intro: "Connect with founders, diaspora investors, export partners, mentors, and co-founders across the continent. Africa's strongest companies will be built together.",
    nav_join_network: "Join the network",
    stat_members_shown: "Members shown",
    stat_listed_members: "Listed members",
    stat_countries_shown: "Countries shown",
    stat_sectors_shown: "Sectors shown",
    loading_members: "Loading members…",
    error_signed_out_browse: "Sign in to browse member profiles.",
    error_load_failed: "Could not load members. Please retry.",
    link_sign_in: "Sign in",
    button_retry: "Retry loading members",
    placeholder_search: "Search by sector, what they're building, or what they need...",
    aria_search_members: "Search members",
    filter_all: "All",
    filter_looking_for_prefix: "Looking for: ",
    aria_filter_country: "Filter members by country",
    option_all_countries: "All countries",
    empty_no_match_filters: "No members match these filters.",
    empty_no_profiles_yet: "No member profiles have been listed yet. You can add yours.",
    card_looking_for_label: "Looking for",
    card_what_they_offer_label: "What they offer",
    cta_heading: "Add your profile to the network",
    cta_body: "Tell the community what you're building and what you need. Co-founders, investors, customers, and partners can discover your profile here.",
  },
  fr: {
    join_title: "Rejoindre le réseau",
    join_intro: "Dites à la communauté ce que vous construisez et ce dont vous avez besoin. Votre profil sera visible par d'autres fondateurs africains, investisseurs de la diaspora et partenaires.",
    section_about_you: "À propos de vous",
    label_full_name: "Nom complet",
    placeholder_full_name: "Votre nom",
    label_city_country: "Ville, Pays",
    placeholder_city_country: "ex. Dakar, Sénégal",
    label_country_filter: "Pays (pour le filtrage)",
    placeholder_country_filter: "ex. Sénégal",
    label_languages_spoken: "Langues parlées",
    placeholder_languages_spoken: "ex. Français, Wolof, Anglais",
    section_what_building: "Ce que vous construisez",
    label_sector: "Secteur",
    select_sector: "Choisissez un secteur",
    label_headline: "Phrase d'accroche en une ligne",
    placeholder_headline: "ex. Créer une plateforme panafricaine de distribution de mode",
    label_building: "Ce que vous construisez (2 à 4 phrases)",
    placeholder_building: "Décrivez votre entreprise : ce qu'elle fait, à qui elle s'adresse, à quel stade vous êtes, quelle traction vous avez...",
    label_stage: "Stade de l'entreprise",
    select_stage: "Choisissez un stade",
    section_need_offer: "Ce dont vous avez besoin et ce que vous offrez",
    label_looking_for: "Que recherchez-vous ? (sélectionnez tout ce qui s'applique)",
    label_offering: "Que pouvez-vous offrir à des partenaires ?",
    placeholder_offering: "ex. Réseau de 200 agriculteurs, certification biologique européenne, 10 ans d'expérience en logistique...",
    error_signed_out_join: "Connectez-vous pour enregistrer votre profil. Votre brouillon est toujours là.",
    error_not_confirmed_generic: "Votre profil n'a pas été confirmé comme enregistré. Vérifiez le réseau avant de réessayer.",
    error_not_confirmed_catch: "Votre profil n'a pas été confirmé comme enregistré. Votre brouillon est toujours là ; vérifiez le réseau avant de réessayer.",
    link_sign_in_other_tab: "Se connecter dans un autre onglet",
    link_check_network: "Vérifier le réseau",
    button_submit_idle: "Rejoindre le réseau →",
    button_submit_loading: "Ajout au réseau en cours...",
    footer_privacy_note: "Votre profil sera visible par les autres membres de Kebu. Nous ne vendons jamais vos données.",
    success_heading: "Vous faites partie du réseau",
    success_body: "Votre profil a été ajouté. D'autres fondateurs, investisseurs et partenaires peuvent maintenant vous trouver. Bienvenue dans le First-Order Collective.",
    button_view_network: "Voir le réseau →",
    badge_the_network: "LE RÉSEAU",
    dir_title: "Qui construit à travers l'Afrique",
    dir_intro: "Connectez-vous avec des fondateurs, des investisseurs de la diaspora, des partenaires d'exportation, des mentors et des cofondateurs à travers le continent. Les entreprises les plus solides d'Afrique se construiront ensemble.",
    nav_join_network: "Rejoindre le réseau",
    stat_members_shown: "Membres affichés",
    stat_listed_members: "Membres référencés",
    stat_countries_shown: "Pays représentés",
    stat_sectors_shown: "Secteurs représentés",
    loading_members: "Chargement des membres…",
    error_signed_out_browse: "Connectez-vous pour parcourir les profils des membres.",
    error_load_failed: "Impossible de charger les membres. Veuillez réessayer.",
    link_sign_in: "Se connecter",
    button_retry: "Réessayer le chargement des membres",
    placeholder_search: "Rechercher par secteur, ce qu'ils construisent ou ce dont ils ont besoin...",
    aria_search_members: "Rechercher des membres",
    filter_all: "Tous",
    filter_looking_for_prefix: "Recherche : ",
    aria_filter_country: "Filtrer les membres par pays",
    option_all_countries: "Tous les pays",
    empty_no_match_filters: "Aucun membre ne correspond à ces filtres.",
    empty_no_profiles_yet: "Aucun profil de membre n'a encore été référencé. Vous pouvez ajouter le vôtre.",
    card_looking_for_label: "Recherche",
    card_what_they_offer_label: "Ce qu'ils offrent",
    cta_heading: "Ajoutez votre profil au réseau",
    cta_body: "Dites à la communauté ce que vous construisez et ce dont vous avez besoin. Cofondateurs, investisseurs, clients et partenaires peuvent découvrir votre profil ici.",
  },
  // Not reviewed by a fluent native Wolof speaker — see file header.
  wo: {
    join_title: "Bokk ci réseau bi",
    join_intro: "Wax ak bokk yi lu nga di defar ak lu nga soxla. Sa profil dinañu ko gis ci ñi sos entreprise ci Afrik, investisseur yu diaspora ak partenaire yi.",
    section_about_you: "Yaw",
    label_full_name: "Sa tur bu mat",
    placeholder_full_name: "Sa tur",
    label_city_country: "Dëkk, Réew",
    placeholder_city_country: "misal: Dakar, Senegal",
    label_country_filter: "Réew (ngir filtrer)",
    placeholder_country_filter: "misal: Senegal",
    label_languages_spoken: "Làkk yi nga dégg",
    placeholder_languages_spoken: "misal: Français, Wolof, Anglais",
    section_what_building: "Lu nga di defar",
    label_sector: "Sekteur",
    select_sector: "Tann sekteur",
    label_headline: "Benn mbind bu gàtt",
    placeholder_headline: "misal: Def plateforme ci distribution bu mode ci Afrik gëp",
    label_building: "Lu nga di defar (2–4 misal)",
    placeholder_building: "Wax entreprise bi: lu mu def, kan la jëfandikoo, ñaata la yagg, lu nga am traction...",
    label_stage: "Stad bu entreprise bi",
    select_stage: "Tann stad",
    section_need_offer: "Lu nga soxla ak lu nga mën joxe",
    label_looking_for: "Lan nga di seet? (tann lu la araame lépp)",
    label_offering: "Lan nga mën joxe partenaire yi?",
    placeholder_offering: "misal: Réseau bu 200 bàmmeel, sertifika bio ci Europe, 10 at ci logistique...",
    error_signed_out_join: "Dugg ngir sauvegarder sa profil. Sa brouillon mungi fi.",
    error_not_confirmed_generic: "Sa profil confirmeu ko sauvegarder. Seet réseau bi bala nga jéemaat.",
    error_not_confirmed_catch: "Sa profil confirmeu ko sauvegarder. Sa brouillon mungi fi; seet réseau bi bala nga jéemaat.",
    link_sign_in_other_tab: "Dugg ci onglet bu bees",
    link_check_network: "Seet réseau bi",
    button_submit_idle: "Bokk ci réseau bi →",
    button_submit_loading: "Dafay bokk ci réseau bi...",
    footer_privacy_note: "Sa profil dinañu ko gis ci member yu Kebu yi. Du nu jaay sa done yi mukk.",
    success_heading: "Bokk nga ci réseau bi",
    success_body: "Sa profil bokk nga ko. Ñi sos entreprise, investisseur yi ak partenaire yi mën nañu la gis léegi. Dalal ak jàmm ci First-Order Collective.",
    button_view_network: "Gis réseau bi →",
    badge_the_network: "RÉSEAU BI",
    dir_title: "Kan ñoo di defar ci Afrik gëp",
    dir_intro: "Bokk ak ñi sos entreprise, investisseur yu diaspora, partenaire export, mentor ak kooperàteur ci continent bi. Entreprise yu am doole ci Afrik dinañu leen defar ñoom ñoom.",
    nav_join_network: "Bokk ci réseau bi",
    stat_members_shown: "Member yi nga gis",
    stat_listed_members: "Member yi bind",
    stat_countries_shown: "Réew yi nga gis",
    stat_sectors_shown: "Sekteur yi nga gis",
    loading_members: "Dafay yónnee member yi…",
    error_signed_out_browse: "Dugg ngir seet profil yu member yi.",
    error_load_failed: "Mënuma yónnee member yi. Jéemaat.",
    link_sign_in: "Dugg",
    button_retry: "Jéemaat yónnee member yi",
    placeholder_search: "Seet ci sekteur, lu ñu di defar walla lu ñu soxla...",
    aria_search_members: "Seet member yi",
    filter_all: "Lépp",
    filter_looking_for_prefix: "Dafay seet: ",
    aria_filter_country: "Filtrer member yi ci réew",
    option_all_countries: "Réew yépp",
    empty_no_match_filters: "Amul member bu dal ak filtre yii.",
    empty_no_profiles_yet: "Amagul profil bu member bind. Mën nga bind sa bopp.",
    card_looking_for_label: "Dafay seet",
    card_what_they_offer_label: "Lu ñu mën joxe",
    cta_heading: "Bind sa profil ci réseau bi",
    cta_body: "Wax ak bokk yi lu nga di defar ak lu nga soxla. Kooperàteur, investisseur, client ak partenaire yi mën nañu gis sa profil fi.",
  },
};

export function networkT(lang: string, key: NetworkKey): string {
  return NETWORK_STRINGS[resolveNetworkLang(lang)][key] ?? NETWORK_STRINGS.en[key];
}

export function membersMatchCount(lang: string, count: number, hasMore: boolean): string {
  const resolved = resolveNetworkLang(lang);
  const base =
    resolved === "fr" ? `${count} membres correspondent à vos filtres`
    : resolved === "wo" ? `${count} member dal ak say filtre`
    : `${count} members match your filters`;
  const suffix = hasMore
    ? (resolved === "fr" ? " · Affichage des 500 derniers profils"
      : resolved === "wo" ? " · Di won 500 ci profil yu mujj"
      : " · Showing the latest 500 profiles")
    : "";
  return base + suffix;
}

// ── Enum display labels — the stored/compared value is always the canonical
// English string (see lib/network/types.ts). Never swap the value itself.

type Need = (typeof NETWORK_NEEDS)[number];
type Sector = (typeof SECTORS)[number];
type Stage = (typeof BUSINESS_STAGES)[number];

const NEED_LABELS: Record<NetworkLang, Record<Need, string>> = {
  en: {
    "Co-founder": "Co-founder", "Investor": "Investor", "Customers": "Customers", "Supplier": "Supplier",
    "Mentor": "Mentor", "Partner": "Partner", "Team member": "Team member",
    "Diaspora connection": "Diaspora connection", "Export partner": "Export partner",
  },
  fr: {
    "Co-founder": "Cofondateur", "Investor": "Investisseur", "Customers": "Clients", "Supplier": "Fournisseur",
    "Mentor": "Mentor", "Partner": "Partenaire", "Team member": "Membre d'équipe",
    "Diaspora connection": "Lien avec la diaspora", "Export partner": "Partenaire export",
  },
  wo: {
    "Co-founder": "Kooperàteur", "Investor": "Investisseur", "Customers": "Client yi", "Supplier": "Fournisseur",
    "Mentor": "Mentor", "Partner": "Partenaire", "Team member": "Member ci équipe",
    "Diaspora connection": "Lien ak diaspora", "Export partner": "Partenaire export",
  },
};

const STAGE_LABELS: Record<NetworkLang, Record<Stage, string>> = {
  en: { "Idea": "Idea", "Early stage": "Early stage", "Growing": "Growing", "Established": "Established" },
  fr: { "Idea": "Idée", "Early stage": "Stade précoce", "Growing": "En croissance", "Established": "Établie" },
  wo: { "Idea": "Idée", "Early stage": "Tàmbali", "Growing": "Dafay yokku", "Established": "Dalal" },
};

const SECTOR_LABELS: Record<NetworkLang, Record<Sector, string>> = {
  en: {
    "Agriculture": "Agriculture", "Tech / Software": "Tech / Software", "Finance / Fintech": "Finance / Fintech",
    "Health": "Health", "Fashion & beauty": "Fashion & beauty", "Food & catering": "Food & catering",
    "Construction": "Construction", "Creative economy": "Creative economy", "Education": "Education",
    "Energy": "Energy", "Logistics": "Logistics", "Manufacturing": "Manufacturing",
    "Retail & e-commerce": "Retail & e-commerce", "Tourism": "Tourism", "Trade & export": "Trade & export",
  },
  fr: {
    "Agriculture": "Agriculture", "Tech / Software": "Technologie / Logiciel", "Finance / Fintech": "Finance / Fintech",
    "Health": "Santé", "Fashion & beauty": "Mode et beauté", "Food & catering": "Alimentation et restauration",
    "Construction": "Construction", "Creative economy": "Économie créative", "Education": "Éducation",
    "Energy": "Énergie", "Logistics": "Logistique", "Manufacturing": "Industrie manufacturière",
    "Retail & e-commerce": "Commerce de détail et e-commerce", "Tourism": "Tourisme", "Trade & export": "Commerce et export",
  },
  wo: {
    "Agriculture": "Agriculture", "Tech / Software": "Tekknolosi / Logiciel", "Finance / Fintech": "Finance / Fintech",
    "Health": "Wér-gi-yaram", "Fashion & beauty": "Mode ak bëccëg", "Food & catering": "Lekk ak restoran",
    "Construction": "Construction", "Creative economy": "Économie créative", "Education": "Njàng",
    "Energy": "Kàttan", "Logistics": "Logistique", "Manufacturing": "Fabrikaasioŋ",
    "Retail & e-commerce": "Jaay ak e-commerce", "Tourism": "Tourism", "Trade & export": "Jaay ak export",
  },
};

export function needLabel(need: Need, lang: string): string {
  return NEED_LABELS[resolveNetworkLang(lang)][need] ?? need;
}

export function stageLabel(stage: Stage, lang: string): string {
  return STAGE_LABELS[resolveNetworkLang(lang)][stage] ?? stage;
}

export function sectorLabel(sector: Sector, lang: string): string {
  return SECTOR_LABELS[resolveNetworkLang(lang)][sector] ?? sector;
}
