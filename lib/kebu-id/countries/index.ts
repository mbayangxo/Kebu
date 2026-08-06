import { senegalModule } from "./sn";
import type { CountryBusinessModule } from "./types";

const MODULES: Record<string, CountryBusinessModule> = {
  SN: senegalModule,
};

export function getCountryModule(countryCode: string): CountryBusinessModule | null {
  const cc = countryCode.trim().toUpperCase();
  return MODULES[cc] ?? null;
}

export function listSupportedCountryModules(): CountryBusinessModule[] {
  return Object.values(MODULES);
}

export function isValidLegalStructure(countryCode: string, structureCode: string): boolean {
  const mod = getCountryModule(countryCode);
  if (!mod) return false;
  return mod.legalStructures.some((s) => s.code === structureCode);
}

export function isValidRegion(countryCode: string, region: string): boolean {
  const mod = getCountryModule(countryCode);
  if (!mod) return false;
  return mod.regions.includes(region);
}
