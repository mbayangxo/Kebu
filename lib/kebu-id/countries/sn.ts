import type { CountryBusinessModule } from "./types";

/** Senegal country module — structures may change; moduleVersion tracks rules. */
export const senegalModule: CountryBusinessModule = {
  countryCode: "SN",
  countryName: "Senegal",
  moduleVersion: "sn-structures-2026.1",
  legalStructures: [
    { code: "individual_enterprise", label: "Individual Enterprise", description: "Entreprise individuelle" },
    { code: "gie", label: "GIE", description: "Groupement d'intérêt économique" },
    { code: "suarl", label: "SUARL", description: "Société unipersonnelle à responsabilité limitée" },
    { code: "sarl", label: "SARL", description: "Société à responsabilité limitée" },
    { code: "sa", label: "SA", description: "Société anonyme" },
    { code: "cooperative", label: "Cooperative" },
    { code: "association", label: "Association" },
  ],
  regions: [
    "Dakar",
    "Thiès",
    "Diourbel",
    "Fatick",
    "Kaolack",
    "Kaffrine",
    "Kolda",
    "Louga",
    "Matam",
    "Saint-Louis",
    "Sédhiou",
    "Tambacounda",
    "Ziguinchor",
  ],
};
