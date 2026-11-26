"use client";

// Copied into a temporary local route by the supplemental runner, never shipped.
import { useRef, useState } from "react";
import { useCatalogSync } from "@/lib/create/use-catalog-sync";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { SiteProductsPanel } from "@/app/components/create/site-products-panel";
import { ProductVariantsEditor } from "@/app/components/shop/product-variants-editor";
import { websiteDefinitionSchema } from "@/lib/create/website-schema";
const projectId = "11111111-1111-4111-8111-111111111111";
let headingReads = 0;
const definition = websiteDefinitionSchema.parse({
  schemaVersion: "website-v1",
  title: "S5 local renderer probe", theme: {},
  pages: [{ slug: "home", title: "Home", sections: [{ id: "text-probe", type: "text", props: { heading: "Unchanged text", body: "Probe body" } }] }],
});
Object.defineProperty(definition.pages[0].sections[0].props, "heading", {
  enumerable: true, get: () => { headingReads++; return "Unchanged text"; },
});
function ProjectSyncProbe() {
  const [active, setActive] = useState(projectId);
  const sync = useCatalogSync(active);
  const delayedRecord = useRef<(() => void) | null>(null);
  return <section data-testid="sync-race-probe">
    <button onClick={() => { const record = sync.record; delayedRecord.current = () => record({ status: "pending", message: "Old project status" }); }}>Start delayed mutation</button>
    <button onClick={() => setActive("44444444-4444-4444-8444-444444444444")}>Switch project</button>
    <button onClick={() => delayedRecord.current?.()}>Complete old mutation</button>
    <output>{sync.status?.status ?? "checking"}</output>
  </section>;
}
export default function S5UiProbe() {
  const [epoch, setEpoch] = useState(0);
  const [observed, setObserved] = useState(0);
  const [patch, setPatch] = useState("");
  const [changedTheme, setChangedTheme] = useState(false);
  const [editing, setEditing] = useState(true);
  const view = { ...definition, theme: { ...definition.theme, ...(changedTheme ? { background: "#123456", text: "#ffffff" } : {}) } };
  return <main className="p-6 space-y-6">
    <ProjectSyncProbe />
    <section data-testid="renderer-probe">
      <button onClick={() => setEpoch((value) => value + 1)}>Advance callback</button>
      <button onClick={() => setObserved(headingReads)}>Read counts</button>
      <button onClick={() => setChangedTheme((value) => !value)}>Change theme</button>
      <button onClick={() => setEditing((value) => !value)}>Toggle editing</button>
      <output data-testid="reads">{observed}</output>
      <output data-testid="patch">{patch}</output>
      <SiteRenderer definition={view} mode="preview" editor={editing ? {
        inlineEdit: true, selectedSectionId: "text-probe", editDevice: "desktop",
        onPatchSection: (_id, value) => setPatch(`${epoch}:${String(value.heading)}`),
      } : undefined} />
    </section>
    <section data-testid="catalog-probe"><SiteProductsPanel projectId={projectId} /></section>
    <section data-testid="variants-probe"><ProductVariantsEditor projectId={projectId} productId="22222222-2222-4222-8222-222222222222" productName="Probe product" /></section>
  </main>;
}
