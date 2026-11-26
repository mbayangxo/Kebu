import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { builderOperationsEnabled } from "./kcd-render-flag";
import { rowsToDocument, type ProjectRows } from "./kcd-adapter";
import { createKcdPublishedSnapshot } from "./kcd-published-snapshot";
import { liveSiteUrl } from "./site-urls";
import { type ProjectProductRow } from "./project-products";
import { buildIndex, keyBetween, type NodeId } from "@/lib/creative-core";
import { uuidV5 } from "./kcd-adapter/ids";

export type KcdPublishSource = ProjectRows & { products: ProjectProductRow[] };
export function kcdPublishDocument(source: KcdPublishSource) {
  const document = rowsToDocument(source).document;
  if (!source.products.length) return document;
  const items = source.products.map(product => ({ name: product.name, description: product.description ?? "", priceLabel: product.price_label ?? "", imageUrl: product.image_url ?? "", whatsappMessage: product.whatsapp_order_message ?? "" }));
  for (const page of document.pages) {
    if (!(page.slug === "home" || page.slug === "shop" || page.slug.includes("shop"))) continue;
    const roots = buildIndex(document).children(page.id, null);
    const existing = roots.find(node => node.type === "legacy-section:products");
    if (existing) document.nodes[existing.id] = { ...existing, props: { ...existing.props, heading: existing.props.heading || (page.slug === "shop" ? "Shop" : "Products"), items } };
    else if (page.slug === "home" || page.slug === "shop") {
      const id = uuidV5(`publish-catalog:${document.id}:${page.id}`) as NodeId;
      document.nodes[id] = { id, type: "legacy-section:products", typeVersion: 1, pageId: page.id, parentId: null, orderKey: keyBetween(roots.at(-1)?.orderKey ?? null, null), version: 1, props: { heading: page.slug === "shop" ? "Shop" : "Products", items }, overrides: {} };
    }
  }
  return document;
}

export async function goLiveKcdProject(opts: { projectId: string; userId: string; subdomain: string; admin?: SupabaseClient }) {
  const fail = (status: number, error: string, detail?: string) => ({ ok: false as const, status, error, detail });
  if (!builderOperationsEnabled(opts.projectId)) return fail(409, "This draft uses operation editing. Publishing is not enabled; your saved draft is unchanged.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!opts.admin && (!url || !key)) return fail(503, "Publishing service unavailable.");
  const admin = opts.admin ?? createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  const normalized = opts.subdomain.trim().toLowerCase();
  let sourceResult;
  try { sourceResult = await admin.rpc("kcd_publish_source", { p_project_id: opts.projectId, p_owner_id: opts.userId }); }
  catch { return fail(503, "Could not load the owned draft for publishing."); }
  if (sourceResult.error || !sourceResult.data) return fail(sourceResult.error ? 503 : 404, "Could not load the owned draft for publishing.");
  let prepared: ReturnType<typeof createKcdPublishedSnapshot>;
  try { prepared = createKcdPublishedSnapshot(kcdPublishDocument(sourceResult.data)); }
  catch (error) { return fail(422, "Resolve the draft's unsupported content before publishing.", error instanceof Error ? error.message : undefined); }
  // A lost response may follow a successful commit. Never promise rollback or retry it automatically.
  const unconfirmed = () => fail(503, "Publishing could not be confirmed. Check your live site before retrying.");
  let result;
  try {
    result = await admin.rpc("publish_kcd_document", { p_project_id: opts.projectId, p_owner_id: opts.userId, p_subdomain: normalized, p_source: sourceResult.data, p_snapshot: prepared.snapshot, p_canonical_payload: prepared.canonicalPayload });
  } catch { return unconfirmed(); }
  if (result.error) {
    const code = result.error.code;
    if ((/^[0-9A-Z]{5}$/.test(code) && !code.startsWith("08")) || code === "PGRST202") {
      const status = ["40001", "23505"].includes(code) ? 409 : code === "PGRST202" ? 503 : 500;
      return fail(status, "Could not publish. The previous live site is unchanged. Retry after resolving the failure.", result.error.message);
    }
    return unconfirmed();
  }
  const publicPath = `/sites/${normalized}`;
  if (!result.data || result.data.publicPath !== publicPath || result.data.contentHash !== prepared.contentHash || typeof result.data.deploymentId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.data.deploymentId)) return unconfirmed();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return { ok: true as const, publicPath, liveUrl: liveSiteUrl(normalized) ?? `${appUrl}${publicPath}`, plannedKebuAfricaUrl: `https://${normalized}.kebu.africa` };
}
