import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { open3jDatabase, owner, other, projectId } from "./fixtures/3j-database";
import { expectFor, type Op, type Transaction } from "@/lib/creative-core";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { readKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { maylecorAboutMayBlocks } from "@/lib/create/maylecor-about-bio";
let authority: Awaited<ReturnType<typeof open3jDatabase>>;
const transaction = (ops: Op[]): Transaction => ({ txId: crypto.randomUUID(), origin: "user", label: "Owner specimen edit", ops, expect: expectFor(authority.current(), ops) });
const nativeContent = () => Object.values(authority.current().nodes).map(node => ({ type: node.type, props: node.props, overrides: node.overrides, a11y: node.a11y }));
describe.skipIf(!process.env.KEBU_LOCAL_PGLITE_ROOT)("3J exact specimen actual PostgreSQL", () => {
  beforeEach(async () => { authority = await open3jDatabase(); }, 60000);
  afterEach(async () => { if (authority) await authority.close(); });
  it("applies the saved native five-page proposal once and reloads complete owner content", async () => {
    const proposal = await authority.proposal();
    expect((await authority.apply(proposal.transaction)).status).toBe("committed");
    expect((await authority.apply(proposal.transaction)).replayed).toBe(true);
    const saved = await authority.read();
    expect(saved.pages.map(page => page.slug)).toEqual(["home", "about", "music", "photos", "contact"]);
    expect(Object.values(saved.nodes).every(node => !node.type.startsWith("legacy-section:"))).toBe(true);
    for (const block of maylecorAboutMayBlocks()) expect(Object.values(saved.nodes).some(node => node.props.text === block.body)).toBe(true);
    expect((await authority.queryAs("authenticated", owner, "select * from creative_op_journal where project_id=$1 and status='committed'", [projectId])).rows).toHaveLength(1);
  });
  it("denies another owner and anonymous application without creating content", async () => {
    const proposal = await authority.proposal();
    await expect(authority.apply(proposal.transaction, other)).rejects.toThrow(/not found|Only|owner|permission|access denied/i);
    await expect(authority.queryAs("anon", "", "select apply_node_ops($1,$2)", [projectId, proposal.transaction])).rejects.toThrow(/permission denied/);
    expect((await authority.queryAs("authenticated", other, "select * from project_experience_proposals")).rows).toHaveLength(0);
    expect(Object.keys((await authority.read()).nodes)).toHaveLength(0);
  });
  it("undoes and redoes the exact complete proposal through the persisted journal", async () => {
    const tx = (await authority.proposal()).transaction, prepared = prepareBuilderTransaction(authority.current(), tx);
    if (!prepared.ok) throw Error(prepared.error.message);
    await authority.apply(tx); const saved = nativeContent(), undo = transaction(prepared.prediction.inverse), inverse = prepareBuilderTransaction(authority.current(), undo);
    if (!inverse.ok) throw Error(inverse.error.message);
    await authority.apply(undo); expect(Object.keys((await authority.read()).nodes)).toHaveLength(0);
    await authority.apply(transaction(inverse.prediction.inverse));
    expect(nativeContent()).toEqual(saved);
  });
  it("persists device-specific typography and independent collage geometry after reload", async () => {
    await authority.apply((await authority.proposal()).transaction);
    const heading = Object.values(authority.current().nodes).find(node => node.props.text === "May Lècor")!, figure = Object.values(authority.current().nodes).find(node => node.type === "image" && node.props.position === "absolute" && node.a11y?.alt === "May Lècor figure")!;
    await authority.apply(transaction([{ op: "setOverride", id: heading.id, device: "mobile", key: "fontSize", value: 37 }, { op: "setOverride", id: figure.id, device: "tablet", key: "x", value: 370 }]));
    const saved = await authority.read();
    expect(saved.nodes[heading.id].props.fontSize).toBe(64); expect(saved.nodes[heading.id].overrides.mobile?.fontSize).toBe(37);
    expect(saved.nodes[figure.id].props.x).toBe(650); expect(saved.nodes[figure.id].overrides.tablet?.x).toBe(370);
  });
  it("rejects forged proposal content and stale direction atomically", async () => {
    const tx = (await authority.proposal()).transaction;
    await expect(authority.apply({ ...tx, label: "Forged approved content" })).rejects.toThrow(/saved proposal/);
    await authority.queryAs("authenticated", owner, "update project_experience_dna set dna=dna where project_id=$1", [projectId]);
    await expect(authority.apply(tx)).rejects.toThrow(/direction changed/);
    expect(Object.keys((await authority.read()).nodes)).toHaveLength(0);
  });
  it("publishes this persisted specimen and isolates subsequent draft edits", async () => {
    await authority.apply((await authority.proposal()).transaction);
    const live = await authority.publish(), decoded = readKcdPublishedSnapshot(live.snapshot, live.contentHash);
    expect(decoded?.nativeDocument.pages).toHaveLength(5);
    const heading = Object.values(authority.current().nodes).find(node => node.props.text === "May Lècor")!;
    await authority.apply(transaction([{ op: "setProp", id: heading.id, path: "text", value: "Later owner draft" }]));
    const stored = (await authority.queryAs("postgres", owner, "select snapshot from deployments where project_id=$1 and status='live'", [projectId])).rows[0].snapshot;
    expect(stored).toEqual(live.snapshot); expect((await authority.read()).nodes[heading.id].props.text).toBe("Later owner draft");
  });
  it("survives a real local database close and reopen with content and publication intact", async () => {
    const directory = mkdtempSync(join(tmpdir(), "kebu-3j-db-"));
    let disk: Awaited<ReturnType<typeof open3jDatabase>> | undefined;
    try {
      disk = await open3jDatabase(directory); await disk.apply((await disk.proposal()).transaction);
      const snapshot = await disk.publish(), expected = Object.values(disk.current().nodes).map(node => node.props);
      await disk.close(); disk = undefined; disk = await open3jDatabase(directory, false);
      expect(Object.values((await disk.read()).nodes).map(node => node.props)).toEqual(expected);
      expect((await disk.queryAs("postgres", owner, "select snapshot from deployments where status='live'")).rows[0].snapshot).toEqual(snapshot.snapshot);
    } finally { if (disk) await disk.close(); rmSync(directory, { recursive: true, force: true }); }
  }, 60000);
});
