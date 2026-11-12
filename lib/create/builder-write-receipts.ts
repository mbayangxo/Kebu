import { siteChromeSchema } from "./site-chrome";

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

/** HTTP 200 alone cannot confirm which draft row was saved. */
export function builderSectionReceipt(body: unknown, sectionId: string): (Record<string, unknown> & { id: string; props: Record<string, unknown> }) | null {
  if (!record(body) || !record(body.section) || body.section.id !== sectionId || !record(body.section.props)) return null;
  return body.section as Record<string, unknown> & { id: string; props: Record<string, unknown> };
}

export function builderSettingsReceipt(body: unknown, projectId: string): boolean {
  return record(body) && record(body.project) && body.project.id === projectId;
}

export function builderChromeReceipt(body: unknown, part: "header" | "footer") {
  if (!record(body)) return null;
  const parsed = siteChromeSchema.safeParse(body.siteChrome);
  return parsed.success ? parsed.data[part]?.props ?? null : null;
}

export function builderPublishReceipt(body: unknown, subdomain: string): string | null {
  if (!record(body) || !record(body.deployment)) return null;
  const receipt = body.deployment;
  return receipt.status === "live" && receipt.subdomain === subdomain && receipt.public_path === `/sites/${subdomain}` ? receipt.public_path : null;
}

/** Never clear pending/history state until a fresh draft was actually loaded. */
export async function confirmBuilderDraftRefresh(reload: () => Promise<boolean>, markSaved: () => void): Promise<boolean> {
  if (!await reload()) return false;
  markSaved();
  return true;
}
