import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OperationHistory, type NodeId } from "@/lib/creative-core";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";
import { productRowToSectionItem, type ProjectProductRow } from "@/lib/create/project-products";
import { prepareBuilderTransaction, normalizeBuilderNode } from "@/lib/create/kcd-write-boundary";
import { sectionPropsForSave } from "@/lib/create/section-props-boundary";

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/lib/create/kcd-project-document", () => ({ loadKcdDocument: mocks.load }));
import { catalogTransaction, syncCatalogToProductsSections } from "@/lib/create/sync-catalog-to-sections";

const projectId = uuidFor(1, 0x71);
const id = uuidFor(2, 0x71) as NodeId;
const productId = uuidFor(3, 0x71);
const relatedId = uuidFor(4, 0x71);
const product: ProjectProductRow = {
  id: productId, project_id: projectId, business_id: null, name: "New name", description: "",
  price_label: "5,000 XOF", image_url: "", whatsapp_order_message: "", sort_order: 0,
  is_active: true, created_at: "", updated_at: "",
};
function fixture() {
  const doc = emptyDocument(); doc.id = projectId;
  doc.nodes[id] = node({ id, pageId: PAGE_A, type: "legacy-section:products", orderKey: "V", version: 7,
    props: { heading: "My shop", layout: "list", items: [{ name: "Old", productId, relatedProductIds: [relatedId] }] },
    overrides: { mobile: { heading: "Phone shop" } }, locked: true,
  });
  return doc;
}
type QueryResult = { data: unknown; error: { code?: string; message: string } | null };
function database(kcd = true) {
  const results = new Map<string, QueryResult>([
    ["projects", { data: { id: projectId, document_schema_version: kcd ? "kcd-1" : null }, error: null }],
    ["project_pages", { data: [{ id: PAGE_A }], error: null }],
    ["project_sections", { data: [{ id, props: fixture().nodes[id].props }], error: null }],
    ["project_products", { data: [product], error: null }],
    ["project_product_variants", { data: [], error: null }],
  ]);
  const events: string[] = [];
  const writes: Array<{ table: string; value: unknown }> = [];
  const rpc = vi.fn().mockImplementation(async (name: string) => ({
    data: name === "kcd_operation_protocol" ? 3 : { status: "committed", versions: { [id]: 8 } }, error: null,
  }));
  const from = vi.fn().mockImplementation((table: string) => {
    let write = false;
    const q = {
      select: vi.fn(), eq: vi.fn(), in: vi.fn(), is: vi.fn(), order: vi.fn(), maybeSingle: vi.fn(),
      update: vi.fn((value: unknown) => { write = true; writes.push({ table, value }); return q; }),
      then: (resolve: (value: QueryResult) => void) => {
        events.push(table); return Promise.resolve(write ? { data: null, error: null } : results.get(table)!).then(resolve);
      },
    };
    for (const name of ["select", "eq", "in", "is", "order", "maybeSingle"] as const) q[name].mockReturnValue(q);
    return q;
  });
  const db = { from, rpc } as unknown as SupabaseClient;
  return { db, results, events, writes, rpc };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("KEBU_KCD_RENDER", "all"); vi.stubEnv("KEBU_KCD_OPERATIONS", "all");
  vi.stubEnv("VERCEL_ENV", "development"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ""); vi.stubEnv("SUPABASE_URL", "");
  mocks.load.mockResolvedValue(fixture());
});
afterEach(() => vi.unstubAllEnvs());

describe("catalog operation authority", () => {
  it("uses one atomic versioned system transaction and never directly writes KCD rows", async () => {
    const db = database();
    expect(await syncCatalogToProductsSections(db.db, projectId)).toEqual({ status: "synced" });
    expect(db.writes).toEqual([]);
    const [, args] = db.rpc.mock.calls.find(([name]) => name === "apply_node_ops")!;
    expect(args.p_project_id).toBe(projectId);
    expect(args.p_tx).toMatchObject({ origin: "system", expect: { [id]: 7 }, ops: [{ op: "setProp", id, path: "items" }] });
    expect(args.p_tx.ops[0].normalizedProps).toMatchObject({ layout: "list", _locked: true, deviceOverrides: { mobile: { heading: "Phone shop" } } });
    expect(args.p_tx.ops[0].value[0]).toMatchObject({ name: "New name", relatedProductIds: [relatedId] });
  });
  it("captures editor versions before reading a possibly stale catalog snapshot", async () => {
    const db = database();
    mocks.load.mockImplementation(async () => { db.events.push("versions"); return fixture(); });
    await syncCatalogToProductsSections(db.db, projectId);
    expect(db.events.indexOf("versions")).toBeLessThan(db.events.indexOf("project_products"));
  });
  it("keeps failed/conflicted/uncertain saves visibly pending without a blind rewrite", async () => {
    for (const response of [
      { data: { status: "conflicted" }, error: null },
      { data: { status: "committed" }, error: null },
      { data: { status: "committed", versions: { [id]: 9 } }, error: null },
      { data: null, error: { message: "Lost response" } },
    ]) {
      const db = database(); db.rpc.mockImplementation(async (name: string) => name === "kcd_operation_protocol" ? { data: 3, error: null } : response);
      expect(await syncCatalogToProductsSections(db.db, projectId)).toMatchObject({ status: "pending" });
      expect(db.writes).toEqual([]); expect(db.rpc).toHaveBeenCalledTimes(2);
    }
  });
  it("retains the separate write flag and protocol 3 boundary", async () => {
    const disabled = database(); vi.stubEnv("KEBU_KCD_OPERATIONS", "");
    expect(await syncCatalogToProductsSections(disabled.db, projectId)).toMatchObject({ status: "pending" });
    expect(disabled.rpc).not.toHaveBeenCalled(); expect(disabled.writes).toEqual([]);
    vi.stubEnv("KEBU_KCD_OPERATIONS", "all"); const old = database(); old.rpc.mockResolvedValue({ data: 2, error: null });
    expect(await syncCatalogToProductsSections(old.db, projectId)).toMatchObject({ status: "pending" });
    expect(old.rpc).toHaveBeenCalledTimes(1); expect(old.writes).toEqual([]);
  });
  it("inspection after a reload discovers pending sync without writing or journaling", async () => {
    const db = database();
    expect(await syncCatalogToProductsSections(db.db, projectId, true)).toMatchObject({ status: "pending" });
    expect(db.writes).toEqual([]); expect(db.rpc).not.toHaveBeenCalled();
  });
  it("does not erase sections on unreadable catalog, variants, pages or editing mode", async () => {
    for (const table of ["projects", "project_pages", "project_sections", "project_products", "project_product_variants"]) {
      const db = database(); db.results.set(table, { data: null, error: { code: "08006", message: "Connection unavailable" } });
      expect(await syncCatalogToProductsSections(db.db, projectId)).toMatchObject({ status: "pending" });
      expect(db.writes).toEqual([]); expect(db.rpc).not.toHaveBeenCalled();
    }
  });
  it("does not treat a catalog read failure as an empty catalog or retry unrelated errors", async () => {
    const db = database(); db.results.set("project_products", { data: null, error: { message: "Permission denied" } });
    await syncCatalogToProductsSections(db.db, projectId);
    expect(db.events.filter((table) => table === "project_products")).toHaveLength(1); expect(db.writes).toEqual([]);
  });
  it("empty active catalog removes items through operations", async () => {
    const db = database(); db.results.set("project_products", { data: [], error: null });
    expect(await syncCatalogToProductsSections(db.db, projectId)).toEqual({ status: "synced" });
    const [, args] = db.rpc.mock.calls.find(([name]) => name === "apply_node_ops")!;
    expect(args.p_tx.ops[0].value).toEqual([]); expect(db.writes).toEqual([]);
  });
  it("keeps the non-opted-in legacy path outside the operation protocol", async () => {
    const db = database(false);
    expect(await syncCatalogToProductsSections(db.db, projectId)).toEqual({ status: "synced" });
    expect(db.rpc).not.toHaveBeenCalled(); expect(mocks.load).not.toHaveBeenCalled();
    expect(db.writes.map((write) => write.table)).toEqual(["project_sections", "projects"]);
  });
  it("normalizes subscriptions and active variants while preserving editor relationships", async () => {
    const db = database(); db.results.set("project_products", { data: [{ ...product, is_subscription: true, subscription_interval: "monthly" }], error: null });
    db.results.set("project_product_variants", { data: [
      { id: uuidFor(5, 0x71), product_id: productId, name: "Active", option1: "M", option2: "", option3: "", price_label: "", image_url: "", is_active: true },
      { id: uuidFor(6, 0x71), product_id: productId, name: "Inactive", is_active: false },
    ], error: null });
    await syncCatalogToProductsSections(db.db, projectId);
    const [, args] = db.rpc.mock.calls.find(([name]) => name === "apply_node_ops")!;
    expect(args.p_tx.ops[0].value[0]).toMatchObject({ isSubscription: true, subscriptionInterval: "monthly", hasVariants: true, variants: [{ name: "Active" }] });
    expect(args.p_tx.ops[0].value[0].variants).toHaveLength(1);
  });
});

describe("catalog transaction invariants", () => {
  it("the legacy save boundary preserves validated related-product links while still stripping unknown keys", () => {
    const saved = sectionPropsForSave("products", { items: [{ name: "Product", productId, relatedProductIds: [relatedId], unknown: "strip" }] });
    if (!saved.ok) throw new Error(saved.error);
    expect(saved.props.items).toEqual([expect.objectContaining({ productId, relatedProductIds: [relatedId] })]);
    expect((saved.props.items as Record<string, unknown>[])[0].unknown).toBeUndefined();
    expect(sectionPropsForSave("products", { items: [{ name: "Product", relatedProductIds: ["not-an-id"] }] }).ok).toBe(false);
  });
  it("no-op detection ignores PostgreSQL JSON key ordering and avoids repeated version bumps", async () => {
    const doc = fixture();
    const tx = catalogTransaction(doc, [productRowToSectionItem(product)]);
    const result = prepareBuilderTransaction(doc, tx);
    if (!result.ok) throw new Error(result.error.message);
    const reordered = JSON.parse(JSON.stringify(result.prediction.document), (_key, value) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).reverse()) : value);
    mocks.load.mockResolvedValue(reordered);
    const db = database();
    expect(await syncCatalogToProductsSections(db.db, projectId)).toEqual({ status: "synced" });
    expect(db.rpc).not.toHaveBeenCalled(); expect(catalogTransaction(reordered, [productRowToSectionItem(product)]).ops).toEqual([]);
  });
  it("batches sections without changing device props, layout, ids or custom headings", () => {
    const doc = fixture(); const second = uuidFor(7, 0x71) as NodeId;
    doc.nodes[second] = node({ id: second, pageId: PAGE_A, type: "legacy-section:products", orderKey: "W", props: { heading: "", items: [] } });
    const before = structuredClone(doc);
    const tx = catalogTransaction(doc, [productRowToSectionItem(product)]);
    const result = prepareBuilderTransaction(doc, tx);
    if (!result.ok) throw new Error(result.error.message);
    expect(doc).toEqual(before);
    expect(result.prediction.versions).toEqual({ [id]: 8, [second]: 2 });
    expect(result.prediction.document.nodes[second].props.heading).toBe("Shop");
    expect(result.prediction.document.nodes[id]).toMatchObject({ id, orderKey: "V", overrides: before.nodes[id].overrides, locked: true, props: { heading: "My shop", layout: "list" } });
  });
  it("external catalog changes prevent Undo from overwriting a concurrent sync", () => {
    const doc = fixture(); doc.nodes[id] = normalizeBuilderNode(doc.nodes[id]);
    const history = new OperationHistory();
    const userTx = { txId: uuidFor(8, 0x71), origin: "user" as const, label: "Shop title", expect: { [id]: 7 }, ops: [{ op: "setProp" as const, id, path: "heading", value: "Edited title" }] };
    const userEdit = prepareBuilderTransaction(doc, userTx);
    if (!userEdit.ok) throw new Error(userEdit.error.message);
    history.record(doc, userTx, userEdit.prediction, 0);
    const changed = prepareBuilderTransaction(userEdit.prediction.document, catalogTransaction(userEdit.prediction.document, [productRowToSectionItem(product)]));
    if (!changed.ok) throw new Error(changed.error.message);
    expect(history.prepare("undo", changed.prediction.document, uuidFor(9, 0x71))).toMatchObject({ ok: false });
    expect(changed.prediction.document.nodes[id].props.heading).toBe("Edited title");
  });
  it("rejects unsafe product text through the normal content boundary", async () => {
    const db = database(); db.results.set("project_products", { data: [{ ...product, name: "<script>alert(1)</script>" }], error: null });
    expect(await syncCatalogToProductsSections(db.db, projectId)).toMatchObject({ status: "pending" });
    expect(db.rpc.mock.calls.filter(([name]) => name === "apply_node_ops")).toEqual([]); expect(db.writes).toEqual([]);
  });
});
