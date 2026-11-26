"use client";
import { useState } from "react";
import { CollageScrollInspector } from "@/app/components/create/collage-scroll-inspector";
import { CollageTextInspector } from "@/app/components/create/collage-text-inspector";
import { AddSectionPicker } from "@/app/components/create/add-section-picker";
import { defaultCutoutCollageProps } from "@/lib/create/legally-blonde-defaults";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { buildEditorPreviewDefinition } from "@/lib/create/editor-definition";
import { defaultMaylecorKsendrProps } from "@/lib/create/maylecor-ksendr-defaults";
import type { BuilderElementSelection } from "@/lib/create/builder-selection";

/** Isolated component gate. Storage here is an explicit local fixture, not hosted SQL proof. */
export default function CollageProbe() {
  const [props, setProps] = useState<Record<string, unknown>>(() => ({
    ...defaultMaylecorKsendrProps(), title: "COLLAGE TEST", brandLabel: "COLLAGE TEST",
    titleAsText: true, sectionMinHeightPx: 620, motionEnabled: true,
    layerPositions: { cutoutAccent: { leftPct: 20, topPct: 20 } },
    layerLinks: { cutoutAccent: "/about" },
    socialLinks: [], extraCutouts: [],
  }));
  const [secondScene, setSecondScene] = useState(false);
  const [preview, setPreview] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [selected, setSelected] = useState<BuilderElementSelection | null>(null);
  const [message, setMessage] = useState("");
  const definition = buildEditorPreviewDefinition(
    { title: "Collage test", theme: { primary: "#111111", accent: "#E9006B", background: "#ffffff", text: "#111111", fontDisplay: "Oswald", fontBody: "system-ui", spacing: "comfortable" } },
    [{ id: "home", slug: "home", title: "Home", sort_order: 0 }],
    [{ id: "collage", page_id: "home", section_type: "legally-blonde-hero", sort_order: 0, props }, ...(secondScene ? [{ id: "collage-second", page_id: "home", section_type: "legally-blonde-hero", sort_order: 1, props: { ...props, title: "SECOND SCENE", showNavigation: false } }] : [])], null,
  );
  return <>
    <div data-testid="fixture-controls" ref={element => { if (element) element.dataset.ready = "true"; }} style={{ position: "relative", zIndex: 200, background: "white", padding: 12 }}>
      <button onClick={() => setPreview(!preview)}>{preview ? "Edit composition" : "Preview composition"}</button>
      <button onClick={() => { localStorage.setItem("collage-probe", JSON.stringify(props)); setMessage("Saved fixture"); }}>Save fixture</button>
      <button onClick={() => { const saved = localStorage.getItem("collage-probe"); if (saved) setProps(JSON.parse(saved)); }}>Load fixture</button>
      <button onClick={() => setNarrow(!narrow)}>Toggle narrow frame</button>
      <button onClick={() => setProps(p => ({ ...p, motionEnabled: !p.motionEnabled }))}>Toggle motion</button>
      <button onClick={() => setSecondScene(!secondScene)}>Toggle second scene</button>
      <button onClick={() => setProps(p => ({ ...p, extraCutouts: [{ id: "skyline-test", src: "/templates/maylecor/city-skyline.png", alt: "Skyline", topPct: 30, leftPct: 30, widthPct: 40, zIndex: 5, parallaxRole: "city" }], layerZIndex: {} }))}>Add skyline fixture</button>
      <button onClick={() => setProps(p => ({ ...p, layerZIndex: { "skyline-test": 19 } }))}>Move skyline forward</button>
      <output>{message}</output>
    </div>
    <CollageScrollInspector value={props} onNavigationChange={showNavigation => setProps(current => ({ ...current, showNavigation }))} onChange={layerScroll => setProps(current => ({ ...current, layerScroll }))} />
    <CollageTextInspector value={props.extraCutouts} onChange={extraCutouts=>setProps(current=>({...current,extraCutouts}))} />
    <AddSectionPicker pageTitle="Home" onAdd={type => {
      if (type === "legally-blonde-hero") { setProps(defaultCutoutCollageProps()); setPreview(false); }
    }} />
    <div data-testid="composition" style={{ width: narrow ? 375 : "100%", margin: "auto", position: "relative" }}>
      <SiteRenderer definition={definition} mode={preview ? "live" : "preview"} pageSlug="home" siteBase="/collage-local-probe"
        editor={preview ? undefined : {
          selectedElement: selected, onSelectElement: setSelected,
          onPatchSection: (_id, patch) => setProps(p => ({ ...p, ...patch })),
        }} />
    </div>
  </>;
}
