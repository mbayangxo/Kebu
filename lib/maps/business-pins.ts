import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { decodePublicSnapshot } from "@/lib/create/public-site-snapshot";
import { liveSiteUrl } from "@/lib/create/site-urls";
import { createServiceClient } from "@/lib/opportunity/admin";

export type BusinessPin = {
  projectId: string;
  subdomain: string;
  title: string;
  latitude: number;
  longitude: number;
  address: string | null;
  url: string | null;
};

/**
 * First real "business pins" layer (Maps doc Part A §3, phase 3) sourced
 * entirely from data that already exists: the "Find us" map section every
 * site owner can already fill in on their own published site
 * (lib/create/website-schema.ts's `map` section props). There is
 * deliberately no separate `business_locations` table here — the live
 * `deployments` snapshot already IS the single source of truth for a
 * published site's content, so a second table would only add a staleness
 * risk (publish a new "Find us" location, forget to re-sync). Scanning the
 * live snapshot is this app's own precedent for serving published data
 * publicly (see lib/create/public-site-loader.ts).
 */
export function extractPinFromDefinition(
  projectId: string,
  subdomain: string,
  definition: WebsiteDefinition,
): BusinessPin | null {
  for (const page of definition.pages) {
    for (const section of page.sections) {
      if (section.type !== "map") continue;
      const props = section.props as {
        latitude?: number;
        longitude?: number;
        address?: string;
        hidden?: boolean;
      };
      if (props.hidden) continue;
      if (typeof props.latitude !== "number" || typeof props.longitude !== "number") continue;
      return {
        projectId,
        subdomain,
        title: definition.title,
        latitude: props.latitude,
        longitude: props.longitude,
        address: props.address?.trim() || null,
        url: liveSiteUrl(subdomain),
      };
    }
  }
  return null;
}

export type ListBusinessPinsResult =
  | { ok: true; pins: BusinessPin[] }
  | { ok: false; reason: string };

/** Scans the most recently published live sites for a real "Find us" pin. */
export async function listPublishedBusinessPins(limit = 300): Promise<ListBusinessPinsResult> {
  const admin = createServiceClient();
  if (!admin) {
    return { ok: false, reason: "Maps business-pins source is not configured." };
  }

  const { data, error } = await admin
    .from("deployments")
    .select("project_id, subdomain, schema_version, content_hash, snapshot, published_at")
    .eq("status", "live")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { ok: false, reason: error.message?.includes("does not exist") ? "Site hosting tables missing." : "Could not load published sites." };
  }

  const pins: BusinessPin[] = [];
  const seenProjects = new Set<string>();

  for (const row of data ?? []) {
    if (!row.project_id || seenProjects.has(row.project_id)) continue;
    const decoded = decodePublicSnapshot(row);
    if (!decoded) continue;
    const pin = extractPinFromDefinition(row.project_id, row.subdomain, decoded.definition);
    if (pin) {
      pins.push(pin);
      seenProjects.add(row.project_id);
    }
  }

  return { ok: true, pins };
}
