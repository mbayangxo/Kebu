import type { CountryBusinessModule } from "./types";
import { senegalLegalStructures } from "./sn-legal-structures";

/** Senegal country module — structures may change; moduleVersion tracks rules. */
export const senegalModule: CountryBusinessModule = {
  countryCode: "SN",
  countryName: "Senegal",
  moduleVersion: "sn-structures-2026.3",
  legalStructures: senegalLegalStructures,
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
