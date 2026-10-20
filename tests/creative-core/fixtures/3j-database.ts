import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setupExperienceDatabase } from "../experience-db-setup";
import { document, plan, profile } from "./3j-maylecor";
import { documentVersions, experiencePlanTransaction } from "@/lib/create/experience-engine";
import { brandBrainStoredFields } from "@/lib/create/brand-brain";
import { newExperienceDna } from "@/lib/create/experience-dna";
import { kcdPublishDocument, type KcdPublishSource } from "@/lib/create/kcd-publish";
import { createKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import type { Transaction } from "@/lib/creative-core";

export const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222", projectId = document().id;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };
export async function open3jDatabase(dataDir?: string, seed = true) {
  const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
  if (!root) throw Error("Set the installed local PGlite path; no fixture persistence fallback");
  const { PGlite } = await import(pathToFileURL(resolve(root, "dist/index.js")).href), { pgcrypto } = await import(pathToFileURL(resolve(root, "dist/contrib/pgcrypto.js")).href);
  const db: Db = new PGlite({ ...(dataDir ? { dataDir } : {}), extensions: { pgcrypto } });
  const setRole = async (name = "authenticated", user = owner) => {
    if (!["authenticated", "anon", "service_role", "postgres"].includes(name) || (user && !/^[a-f\d-]{36}$/.test(user))) throw Error("Invalid local test role");
    await db.exec(`reset role;set request.jwt.claim.sub='${user}';set role ${name}`);
  };
  const rawSource = async () => {
    await setRole("postgres");
    return (await db.query<{ source: KcdPublishSource }>("select kcd_publish_source($1,$2) as source", [projectId, owner])).rows[0].source;
  };
  if (seed) {
    await setupExperienceDatabase(db);
    const initial = document(), brand = profile();
    await db.query("insert into auth.users(id) values($1),($2)", [owner, other]);
    await db.query("insert into projects(id,owner_id,title,document_schema_version,theme,site_chrome) values($1,$2,$3,'kcd-1',$4,$5)", [projectId, owner, initial.title, initial.tokens, initial.meta.siteChrome]);
    await db.query("insert into project_pages(id,project_id,slug,title,sort_order,order_key) values($1,$2,'home','Home',0,'V')", [initial.pages[0].id, projectId]);
    await setRole();
    await db.query("select save_brand_brain($1,0,$2)", [brand.id, brandBrainStoredFields(brand.profile)]);
    await db.query("select save_project_brand_brain($1,$2,0)", [projectId, brand.id]);
    await db.query("select save_project_experience_dna($1,0,$2)", [projectId, { ...newExperienceDna(), goal: "Editable owner artist portfolio", audience: "Music and fashion audiences", visitorAction: "Explore the biography and photos", pages: plan().pages.map(({ slug, title, purpose }) => ({ slug, title, purpose })) }]);
    const sourceDocument = kcdPublishDocument(await rawSource()), id = crypto.randomUUID();
    const tx = experiencePlanTransaction(sourceDocument, plan(), { kind: "site", replace: true }, brand, id);
    const payload = { id, projectId, createdAt: new Date().toISOString(), model: "manual-native-reference", kind: "plan", scope: { kind: "site", replace: true }, analysisIds: [], plan: plan(), transaction: tx, source: { dnaRevision: 1, bindingRevision: 1, profileId: brand.id, profileRevision: 1, versions: documentVersions(sourceDocument) } };
    await setRole("service_role");
    await db.query("insert into project_experience_proposals(id,project_id,owner_id,kind,payload) values($1,$2,$3,'plan',$4)", [id, projectId, owner, payload]);
  }
  let current = kcdPublishDocument(await rawSource()), queue = Promise.resolve();
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const next = queue.then(work); queue = next.then(() => undefined, () => undefined); return next;
  };
  const rawApply = async (tx: Transaction, user: string) => {
    await setRole("authenticated", user);
    const reviewed = (await db.query("select id from project_experience_proposals where id=$1 and project_id=$2 and kind='plan'", [tx.txId, projectId])).rows.length > 0;
    const replay = (await db.query("select tx_id from creative_op_journal where tx_id=$1 and project_id=$2 and status='committed'", [tx.txId, projectId])).rows.length > 0;
    let candidate = tx;
    if (!replay) {
      const prepared = prepareBuilderTransaction(current, tx);
      if (!prepared.ok) throw Error(prepared.error.message);
      candidate = prepared.transaction;
    }
    const result = (await db.query<{ result: { status: string; replayed: boolean; versions: Record<string, number>; removed: string[]; removedPages?: string[] } }>(`select ${reviewed ? "apply_experience_plan" : "apply_node_ops"}($1,$2) as result`, [projectId, candidate])).rows[0].result;
    current = kcdPublishDocument(await rawSource());
    return { ...result, pages: current.pages.filter(page => result.versions[page.id]), nodes: Object.values(current.nodes).filter(node => result.versions[node.id]) };
  };
  return {
    current: () => current,
    read: () => serial(async () => { current = kcdPublishDocument(await rawSource()); return current; }),
    apply: (tx: Transaction, user = owner) => serial(() => rawApply(tx, user)),
    proposal: () => serial(async () => { await setRole("service_role"); return (await db.query<{ payload: { transaction: Transaction } }>("select payload from project_experience_proposals where project_id=$1 order by created_at desc limit 1", [projectId])).rows[0].payload; }),
    queryAs: <T = Record<string, unknown>>(role: string, user: string, sql: string, args: unknown[] = []) => serial(async () => { await setRole(role, user); return db.query<T>(sql, args); }),
    publish: () => serial(async () => {
      const source = await rawSource(), published = createKcdPublishedSnapshot(kcdPublishDocument(source));
      await db.query("select publish_kcd_document($1,$2,$3,$4,$5,$6)", [projectId, owner, "maylecor-3j", source, published.snapshot, published.canonicalPayload]);
      const stored = (await db.query<{ snapshot: typeof published.snapshot }>("select snapshot from deployments where project_id=$1 and status='live'", [projectId])).rows[0].snapshot;
      return { ...published, snapshot: stored };
    }),
    close: () => serial(() => db.close()),
  };
}
