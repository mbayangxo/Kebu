/**
 * Africa low-data modes — constitution: Normal · Data Saver · Ultra · Offline.
 * Default: Data Saver on phones / Save-Data; Normal on wide desktops.
 */

export const DATA_MODES = ["normal", "data_saver", "ultra", "offline"] as const;
export type DataMode = (typeof DATA_MODES)[number];

export const DATA_MODE_STORAGE_KEY = "kebu_data_mode";
export const DATA_MODE_COOKIE = "kebu_data_mode";

export function isDataMode(raw: unknown): raw is DataMode {
  return typeof raw === "string" && (DATA_MODES as readonly string[]).includes(raw);
}

export function parseDataMode(raw: unknown, fallback: DataMode = "data_saver"): DataMode {
  return isDataMode(raw) ? raw : fallback;
}

export function labelDataMode(mode: DataMode): string {
  switch (mode) {
    case "normal":
      return "Normal";
    case "data_saver":
      return "Data Saver";
    case "ultra":
      return "Ultra";
    case "offline":
      return "Offline";
  }
}

export function describeDataMode(mode: DataMode): string {
  switch (mode) {
    case "normal":
      return "Full media and fonts when your connection can handle it.";
    case "data_saver":
      return "Smaller images, lazy media, no autoplay — best default on mobile.";
    case "ultra":
      return "Text-first. Hide heavy video and decorative motion.";
    case "offline":
      return "Use cached pages and queue actions until you are back online.";
  }
}

/** Prefer Data Saver everywhere — Africa low-bandwidth default, including desktop first visit. */
export function defaultDataModeFromHints(_opts?: {
  saveData?: boolean;
  widthPx?: number | null;
  connectionSaveData?: boolean;
}): DataMode {
  return "data_saver";
}

export function readStoredDataMode(): DataMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DATA_MODE_STORAGE_KEY);
    return isDataMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredDataMode(mode: DataMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DATA_MODE_STORAGE_KEY, mode);
    document.cookie = `${DATA_MODE_COOKIE}=${mode};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    /* ignore quota */
  }
}

export function resolveClientDataMode(): DataMode {
  const stored = readStoredDataMode();
  if (stored) return stored;
  return defaultDataModeFromHints();
}

export function dataModeSiteClass(mode: DataMode): string {
  switch (mode) {
    case "normal":
      return "kebu-mode-normal";
    case "data_saver":
      return "kebu-mode-data-saver";
    case "ultra":
      return "kebu-mode-ultra";
    case "offline":
      return "kebu-mode-offline kebu-mode-data-saver";
  }
}

export function shouldAutoplayMedia(mode: DataMode): boolean {
  return mode === "normal";
}

export function shouldLoadHeavyVideo(mode: DataMode): boolean {
  return mode === "normal" || mode === "data_saver";
}

export function preferSystemFonts(mode: DataMode): boolean {
  return mode === "ultra" || mode === "offline";
}
