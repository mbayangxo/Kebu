import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { evenlySpacedKeys, type NodeId } from "@/lib/creative-core";
import { initialBuilderRows, projectBuilderEdit } from "@/lib/create/kcd-builder-projection";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";

describe("Builder content projection curve", () => {
  it("projects only changed content at 100/500/2,000 nodes without a quadratic curve", () => {
    const results: Array<{ nodes: number; medianMs: number }> = [];
    for (const size of [100, 500, 2000]) {
      const doc = emptyDocument(); doc.meta.documentSchemaVersion = "kcd-1";
      const keys = evenlySpacedKeys(size);
      for (let i = 0; i < size; i++) {
        const id = uuidFor(i + 1, 0x95) as NodeId;
        doc.nodes[id] = node({ id, type: "legacy-section:hero", pageId: PAGE_A, orderKey: keys[i], props: { heading: `Heading ${i}` } });
      }
      const id = uuidFor(1, 0x95) as NodeId; const rows = initialBuilderRows(doc);
      const next = { ...doc, nodes: { ...doc.nodes, [id]: { ...doc.nodes[id], version: 2, props: { heading: "Edited" } } } };
      expect(projectBuilderEdit(doc, next, rows).sections.at(-1)).toBe(rows.sections.at(-1));
      const samples: number[] = [];
      for (let batch = 0; batch < 5; batch++) {
        let iterations = 0; const start = performance.now();
        do { projectBuilderEdit(doc, next, rows); iterations++; } while (performance.now() - start < 8);
        samples.push((performance.now() - start) / iterations);
      }
      samples.sort((a, b) => a - b); results.push({ nodes: size, medianMs: samples[2] });
    }
    console.info("Builder projection median milliseconds:", JSON.stringify(results));
    if (process.env.KEBU_BUILDER_PERF_REPORT) writeFileSync(process.env.KEBU_BUILDER_PERF_REPORT, JSON.stringify({ node: process.version, scope: "Incremental stored-row projection; excludes React render, network, database and paint", results }, null, 2) + "\n");
    expect(results[2].medianMs / results[0].medianMs).toBeLessThan(80);
    expect(results[2].medianMs).toBeLessThan(50);
  });
});
