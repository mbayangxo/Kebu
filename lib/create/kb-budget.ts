import type { DataMode } from "./data-mode";
import type { SiteAssetKind } from "./site-asset-upload";
import { SITE_ASSET_SPECS } from "./site-asset-upload";

/** Major actions we measure — constitution: ask “How many KB did this require?” */
export const KB_ACTIONS = [
  "open_site",
  "open_builder",
  "open_shop",
  "open_account",
  "save_section",
  "save_profile",
  "place_order",
  "event_register",
  "upload_image",
] as const;

export type KbAction = (typeof KB_ACTIONS)[number];

export type KbBudget = {
  action: KbAction;
  /** Soft target for Data Saver / Offline (KB). */
  dataSaverKb: number;
  /** Soft target for Normal (KB). */
  normalKb: number;
  /** Hard fail above this for Data Saver uploads (KB). */
  hardMaxKb?: number;
};

/** Budgets for Phase One actions we instrument across Builder · Shop · Account. */
export const KB_BUDGETS: Record<KbAction, KbBudget> = {
  open_site: { action: "open_site", dataSaverKb: 350, normalKb: 900 },
  open_builder: { action: "open_builder", dataSaverKb: 500, normalKb: 1400 },
  open_shop: { action: "open_shop", dataSaverKb: 280, normalKb: 800 },
  open_account: { action: "open_account", dataSaverKb: 200, normalKb: 600 },
  save_section: { action: "save_section", dataSaverKb: 12, normalKb: 40 },
  save_profile: { action: "save_profile", dataSaverKb: 4, normalKb: 12 },
  place_order: { action: "place_order", dataSaverKb: 6, normalKb: 16 },
  event_register: { action: "event_register", dataSaverKb: 6, normalKb: 16 },
  upload_image: { action: "upload_image", dataSaverKb: 400, normalKb: 2000, hardMaxKb: 5120 },
};

export function budgetKbFor(action: KbAction, mode: DataMode): number {
  const b = KB_BUDGETS[action];
  if (mode === "normal") return b.normalKb;
  return b.dataSaverKb;
}

export function bytesToKb(bytes: number): number {
  return Math.max(0, Math.round((bytes / 1024) * 10) / 10);
}

export function formatKb(kb: number): string {
  if (kb < 1) return `${Math.round(kb * 1024)} B`;
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb % 1 === 0 ? kb : kb.toFixed(1)} KB`;
}

export type KbEvaluation = {
  action: KbAction;
  mode: DataMode;
  usedKb: number;
  budgetKb: number;
  withinBudget: boolean;
  overByKb: number;
  summary: string;
};

export function evaluateKb(opts: {
  action: KbAction;
  mode: DataMode;
  usedBytes: number;
}): KbEvaluation {
  const usedKb = bytesToKb(opts.usedBytes);
  const budgetKb = budgetKbFor(opts.action, opts.mode);
  const withinBudget = usedKb <= budgetKb;
  const overByKb = withinBudget ? 0 : Math.round((usedKb - budgetKb) * 10) / 10;
  const summary = withinBudget
    ? `${labelAction(opts.action)} used ${formatKb(usedKb)} (budget ${formatKb(budgetKb)}).`
    : `${labelAction(opts.action)} used ${formatKb(usedKb)} — over Data budget by ${formatKb(overByKb)} (target ${formatKb(budgetKb)}).`;
  return {
    action: opts.action,
    mode: opts.mode,
    usedKb,
    budgetKb,
    withinBudget,
    overByKb,
    summary,
  };
}

export function labelAction(action: KbAction): string {
  switch (action) {
    case "open_site":
      return "Open site";
    case "open_builder":
      return "Open builder";
    case "open_shop":
      return "Open shop";
    case "open_account":
      return "Open account";
    case "save_section":
      return "Save section";
    case "save_profile":
      return "Save profile";
    case "place_order":
      return "Place order";
    case "event_register":
      return "Event RSVP / ticket";
    case "upload_image":
      return "Upload image";
  }
}

/** Transfer size from a fetch Response (Content-Length or body length). */
export async function measureResponseBytes(res: Response, clonedBody?: ArrayBuffer | null): Promise<number> {
  const header = res.headers.get("content-length");
  if (header && /^\d+$/.test(header)) return Number(header);
  if (clonedBody) return clonedBody.byteLength;
  try {
    const buf = await res.clone().arrayBuffer();
    return buf.byteLength;
  } catch {
    return 0;
  }
}

/** Attach transfer metadata for clients / logs. */
export function kebuTransferHeaders(usedBytes: number, action: KbAction, mode: DataMode): Record<string, string> {
  const ev = evaluateKb({ action, mode, usedBytes });
  return {
    "X-Kebu-Action": action,
    "X-Kebu-Data-Mode": mode,
    "X-Kebu-Transfer-Kb": String(ev.usedKb),
    "X-Kebu-Budget-Kb": String(ev.budgetKb),
    "X-Kebu-Within-Budget": ev.withinBudget ? "1" : "0",
  };
}

/** Max upload bytes by asset kind + data mode (scale path: tighter on mobile Data Saver). */
export function maxUploadBytesForMode(kind: SiteAssetKind, mode: DataMode): number {
  const base = SITE_ASSET_SPECS[kind].maxBytes;
  if (mode === "normal") return base;
  if (kind === "audio" || kind === "video") {
    return mode === "ultra" || mode === "offline" ? Math.min(base, 8_000_000) : Math.min(base, 15_000_000);
  }
  // Images
  if (mode === "ultra" || mode === "offline") return Math.min(base, 350_000);
  return Math.min(base, 800_000); // data_saver ~800 KB
}

export function parseDataModeHeader(req: Request): DataMode {
  const h = req.headers.get("x-kebu-data-mode") ?? req.headers.get("x-data-mode");
  if (h === "normal" || h === "data_saver" || h === "ultra" || h === "offline") return h;
  const saveData = req.headers.get("save-data")?.toLowerCase() === "on";
  return saveData ? "data_saver" : "data_saver";
}
