import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setupPublishDatabase } from "./publish-db-setup";
import { brandBrainApplication } from "@/lib/create/brand-brain-application";
import { newBrandBrain } from "@/lib/create/brand-brain";
import { kcdPublishDocument } from "@/lib/create/kcd-publish";
import { expectFor, type NodeId, type Transaction } from "@/lib/creative-core";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
const owner = "11111111-1111-4111-8111-111111111111", project = "22222222-2222-4222-8222-222222222222", page = "33333333-3333-4333-8333-333333333333", text = "44444444-4444-4444-8444-444444444444" as NodeId;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> }; let db: Db;
async function document() { const row = (await db.query<{ source: Parameters<typeof kcdPublishDocument>[0] }>("select kcd_publish_source($1,$2) as source", [project, owner])).rows[0]; return kcdPublishDocument(row.source); }
async function send(tx: Transaction, user = owner) {
  await db.exec(`select set_config('request.jwt.claim.sub','${user}',false);set role authenticated`);
  try { return (await db.query<{ result: { status: string; replayed?: boolean } }>("select apply_node_ops($1,$2) as result", [project, tx])).rows[0].result; }
  finally { await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)"); }
}
describe.skipIf(!root)("Brand Brain application through actual PostgreSQL authority", () => {
  beforeAll(async () => {
    const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href); const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href); db = new PGlite({ extensions: { pgcrypto } }); await setupPublishDatabase(db);
    await db.query("insert into auth.users(id) values($1)", [owner]); await db.query("insert into projects(id,owner_id,title,document_schema_version) values($1,$2,'Brand Brain SQL fixture','kcd-1')", [project, owner]);
    await db.query("insert into project_pages(id,project_id,slug,title,sort_order,order_key) values($1,$2,'home','Home',0,'V')", [page, project]);
    const section = (await db.query<{ id: string }>("insert into project_sections(page_id,section_type,sort_order,order_key,props) values($1,'section',0,'V','{}') returning id", [page])).rows[0].id;
    await db.query("insert into project_sections(id,page_id,parent_id,section_type,sort_order,order_key,props) values($1,$2,$3,'text',0,'V',$4)", [text, page, section, { text: "SQL story", variant: "heading" }]);
  }, 60000);
  afterAll(async () => { if (db) await db.close(); });
  it("persists bounded direction, replays once, reloads and exactly undoes", async () => {
    const doc = await document(), profile = newBrandBrain(); profile.brand.primaryColor = "#123456"; profile.motion.enabled = true;
    const plan = brandBrainApplication(doc, text, { id: owner, revision: 1, profile }, { palette: true, motion: true });
    const tx: Transaction = { txId: crypto.randomUUID(), origin: "user", label: "Apply Brand Brain", ops: plan.ops, expect: expectFor(doc, plan.ops) };
    const predicted = prepareBuilderTransaction(doc, tx); if (!predicted.ok) throw Error(predicted.error.message);
    expect((await send(tx)).status).toBe("committed"); expect((await send(tx)).replayed).toBe(true);
    const saved = await document(); expect(saved.nodes[text].props.color).toBe("#123456"); expect(saved.nodes[text].motion).toMatchObject({ preset: "fade", duration: 500 });
    expect(brandBrainApplication(saved, text, { id: owner, revision: 1, profile }, { palette: true, motion: true }).ops).toEqual([]);
    const inverse = predicted.prediction.inverse; expect((await send({ txId: crypto.randomUUID(), origin: "user", label: "Undo Brand Brain", ops: inverse, expect: expectFor(saved, inverse) })).status).toBe("committed");
    const undone = await document(); expect(undone.nodes[text].props).toEqual(doc.nodes[text].props); expect(undone.nodes[text].motion).toBeUndefined();
  });
  it("rejects cross-user application and invalid motion without a partial palette write", async () => {
    const doc = await document(), profile = newBrandBrain(); profile.brand.primaryColor = "#abcdef";
    const ops = brandBrainApplication(doc, text, { id: owner, revision: 1, profile }, { palette: true, motion: false }).ops;
    const tx: Transaction = { txId: crypto.randomUUID(), origin: "user", label: "Foreign apply", ops, expect: expectFor(doc, ops) };
    await expect(send(tx, "55555555-5555-4555-8555-555555555555")).rejects.toThrow();
    const invalid = { ...tx, txId: crypto.randomUUID(), ops: [...ops, { op: "setMotion" as const, id: text, value: { version: 1, duration: 99999 } }] };
    expect((await send(invalid)).status).toBe("rejected"); expect((await document()).nodes[text].props).toEqual(doc.nodes[text].props);
  });
});
