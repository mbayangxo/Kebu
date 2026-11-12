/**
 * S1 gate — performance BASELINES at 100 / 500 / 2,000 nodes (3C DESIGN FREEZE §15).
 *
 * Budgets are not set here: they are set later from these baselines. What this suite enforces
 * is the curve: a clearly quadratic operation (time growing ~n² from 100 → 2,000) is a blocker.
 * Each measurement is the median of repeated batches sized to ≥ 4 ms, so timer resolution
 * and warm-up do not dominate. Run with KCD_PERF_REPORT=1 to print the baseline table.
 */
import { describe, expect, it } from "vitest";
import {
  applyTransaction,
  buildIndex,
  composeRoots,
  expectFor,
  keyBetween,
  parseDocument,
  resolveNode,
  serializeDocument,
  type KcdDocument,
  type NodeId,
  type Op,
} from "@/lib/creative-core";
import { PAGE_A, applyOptions, emptyDocument, measure, node, registry, uuidFor } from "./helpers";

const SIZES = [100, 500, 2000] as const;

/** n nodes on one page: sections (with one group of 8 texts/images) interleaved with legacy heroes. */
function documentOf(n: number): { doc: KcdDocument; text: NodeId; section: NodeId } {
  const doc = emptyDocument();
  let count = 0;
  let rootKey: string | null = null;
  const id = () => uuidFor(++count, n) as NodeId;
  let firstText: NodeId | null = null;
  let firstSection: NodeId | null = null;
  while (count < n) {
    rootKey = keyBetween(rootKey, null);
    if (count % 20 === 10 || n - count < 10) {
      const h = id();
      doc.nodes[h] = node({ id: h, type: "legacy-section:hero", pageId: PAGE_A, orderKey: rootKey, props: { heading: `Hero ${count}`, align: "center" }, overrides: { mobile: { align: "left" } } });
      continue;
    }
    const s = id();
    const g = id();
    firstSection ??= s;
    doc.nodes[s] = node({ id: s, type: "section", pageId: PAGE_A, orderKey: rootKey, props: { paddingY: "md" } });
    doc.nodes[g] = node({ id: g, type: "group", pageId: PAGE_A, parentId: s, orderKey: "V", props: { direction: "row" } });
    let key: string | null = null;
    for (let i = 0; i < 8; i++) {
      const c = id();
      key = keyBetween(key, null);
      doc.nodes[c] =
        i % 3 === 2
          ? node({ id: c, type: "image", pageId: PAGE_A, parentId: g, orderKey: key, props: { src: "/a.jpg" }, a11y: { alt: "x" } })
          : node({ id: c, type: "text", pageId: PAGE_A, parentId: g, orderKey: key, props: { text: `Text ${c}` }, overrides: { mobile: { text: "m" } } });
      if (i === 0) firstText ??= c;
    }
  }
  return { doc, text: firstText!, section: firstSection! };
}

let txN = 0;
const txFor = (doc: KcdDocument, ops: Op[]) => ({ txId: uuidFor(++txN, 0xbe7), origin: "user" as const, label: "perf", ops, expect: expectFor(doc, ops) });

const MEASURES: Record<string, (d: ReturnType<typeof documentOf>) => () => void> = {
  "load (parse + validate)": ({ doc }) => {
    const text = serializeDocument(doc);
    return () => {
      if (!parseDocument(text).ok) throw new Error("parse failed");
    };
  },
  "canonical serialization": ({ doc }) => () => void serializeDocument(doc),
  "apply setProp (1 node)": ({ doc, text }) => {
    const tx = txFor(doc, [{ op: "setProp", id: text, path: "text", value: "Edited" }]);
    return () => {
      if (!applyTransaction(doc, tx, registry, applyOptions).ok) throw new Error("apply failed");
    };
  },
  "apply moveNode (structural)": ({ doc, text }) => {
    const n = doc.nodes[text];
    const tx = txFor(doc, [{ op: "moveNode", id: text, parentId: n.parentId, orderKey: "zV" }]);
    return () => {
      if (!applyTransaction(doc, tx, registry, applyOptions).ok) throw new Error("apply failed");
    };
  },
  "remove subtree + undo (inverse)": ({ doc, section }) => {
    const removed = applyTransaction(doc, txFor(doc, [{ op: "removeNode", id: section }]), registry, applyOptions);
    if (!removed.ok) throw new Error("remove failed");
    const undo = txFor(removed.document, removed.inverse);
    return () => {
      if (!applyTransaction(removed.document, undo, registry, applyOptions).ok) throw new Error("undo failed");
    };
  },
  "responsive resolution (all nodes, phone)": ({ doc }) => () => {
    const index = buildIndex(doc);
    const walk = (id: NodeId) => {
      const n = doc.nodes[id];
      resolveNode(n, "mobile", registry.get(n.type));
      for (const c of index.children(n.pageId, n.id)) walk(c.id);
    };
    for (const r of composeRoots(doc, PAGE_A, "mobile")) walk(r.id);
  },
};

describe("creative-core performance baselines", () => {
  const results: Record<string, Record<number, number>> = {};
  const docs = Object.fromEntries(SIZES.map((n) => [n, documentOf(n)])) as Record<number, ReturnType<typeof documentOf>>;

  it("builds documents of the requested sizes", () => {
    for (const n of SIZES) expect(Object.keys(docs[n].doc.nodes)).toHaveLength(n);
  });

  it.each(Object.keys(MEASURES))("%s grows sub-quadratically", (name) => {
    results[name] = {};
    for (const n of SIZES) results[name][n] = measure(MEASURES[name](docs[n]));
    const r = results[name];
    // Growth exponent across 100 → 2,000 (20×): 1 = linear, 2 = quadratic.
    const exponent = Math.log(r[2000] / r[100]) / Math.log(20);
    if (process.env.KCD_PERF_REPORT) {
      process.stdout.write(`[kcd-perf] ${name.padEnd(42)} ${SIZES.map((n) => `${n}: ${r[n].toFixed(1).padStart(8)} µs`).join("  ")}  exponent ${exponent.toFixed(2)}` + "\n");
    }
    expect(exponent, `${name}: ${JSON.stringify(r)}`).toBeLessThan(1.6);
  });
});
