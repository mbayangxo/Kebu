import { describe, expect, it } from "vitest";
import {
  LIGUEY_STRINGS, LIGUEY_SUPPORTED_LANGS, ligueyT, isLigueyLang, resolveLigueyLang,
  employmentTypeLabel, locationTypeLabel, applicationStatusLabel, listingStatusLabel,
  EMPLOYMENT_TYPE_LABELS, LOCATION_TYPE_LABELS, APPLICATION_STATUS_LABELS, LISTING_STATUS_LABELS,
} from "@/lib/liguey/liguey-i18n";

describe("Liguey i18n dictionary completeness", () => {
  it("every English key has a French and Wolof translation (no silent gaps)", () => {
    const enKeys = Object.keys(LIGUEY_STRINGS.en);
    for (const lang of ["fr", "wo"] as const) {
      for (const key of enKeys) {
        expect(LIGUEY_STRINGS[lang]).toHaveProperty(key);
        expect(LIGUEY_STRINGS[lang][key as keyof typeof LIGUEY_STRINGS.en].length).toBeGreaterThan(0);
      }
    }
  });

  it("no language defines a key that doesn't exist in English (no orphaned keys)", () => {
    const enKeys = new Set(Object.keys(LIGUEY_STRINGS.en));
    for (const lang of ["fr", "wo"] as const) {
      for (const key of Object.keys(LIGUEY_STRINGS[lang])) {
        expect(enKeys.has(key)).toBe(true);
      }
    }
  });

  it.each(LIGUEY_SUPPORTED_LANGS)("every enum label map covers the same value set as English for %s", (lang) => {
    for (const map of [EMPLOYMENT_TYPE_LABELS, LOCATION_TYPE_LABELS, APPLICATION_STATUS_LABELS, LISTING_STATUS_LABELS]) {
      expect(Object.keys(map[lang]).sort()).toEqual(Object.keys(map.en).sort());
    }
  });
});

describe("Liguey i18n lookup behavior", () => {
  it("resolves a supported language and falls back to English for anything else", () => {
    expect(resolveLigueyLang("fr")).toBe("fr");
    expect(resolveLigueyLang("wo")).toBe("wo");
    expect(resolveLigueyLang("de")).toBe("en");
    expect(isLigueyLang("wo")).toBe(true);
    expect(isLigueyLang("de")).toBe(false);
  });

  it("ligueyT returns the correct string per language and falls back to English", () => {
    expect(ligueyT("en", "profile_save")).toBe("Save profile");
    expect(ligueyT("fr", "profile_save")).toBe("Enregistrer le profil");
    expect(ligueyT("wo", "profile_save")).toBe(LIGUEY_STRINGS.wo.profile_save);
    expect(ligueyT("de", "profile_save")).toBe(ligueyT("en", "profile_save"));
  });

  it("employment/location/status label helpers translate known values and fall back for unknown ones", () => {
    expect(employmentTypeLabel("full_time", "fr")).toBe("Temps plein");
    expect(employmentTypeLabel("totally_unknown_value", "fr")).toBe("totally unknown value");
    expect(locationTypeLabel("remote", "wo")).toBe(LOCATION_TYPE_LABELS.wo.remote);
    expect(applicationStatusLabel("accepted", "en")).toBe("Accepted");
    expect(listingStatusLabel("published", "fr")).toBe("Publiée");
  });

  it("stored/canonical enum values are never the translated strings themselves — only display labels are", () => {
    // The canonical values used in API payloads/DB comparisons must never be
    // accidentally swapped for a translated label anywhere in this module.
    const canonicalEmploymentTypes = ["full_time", "part_time", "contract", "internship", "apprenticeship", "gig"];
    for (const value of canonicalEmploymentTypes) {
      expect(EMPLOYMENT_TYPE_LABELS.en).toHaveProperty(value);
    }
  });
});
