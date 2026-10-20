import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { constrainedAxis, constraintAxisCss, constraintSchema, expectFor, type NodeId, type Op } from "@/lib/creative-core";
import { primitiveConstraintOperations, primitivePropertyOperations } from "@/lib/create/kcd-primitive-operations";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { documentToRows, rowsToDocument } from "@/lib/create/kcd-adapter";
import { createKcdPublishedSnapshot, readKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { KcdPrimitiveSubtree } from "@/app/components/create/kcd/primitive-subtree";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";
const root = uuidFor(1, 0xc04) as NodeId, text = uuidFor(2, 0xc04) as NodeId;
function fixture() {
  const doc = emptyDocument(); doc.meta.documentSchemaVersion = "kcd-1";
  doc.nodes[root] = node({ id: root, type: "section", pageId: PAGE_A, orderKey: "V", props: { canvasHeight: 600 } });
  doc.nodes[text] = node({ id: text, type: "text", parentId: root, pageId: PAGE_A, orderKey: "V", props: { text: "Responsive story", position: "absolute", x: 50, y: 40, elementWidth: 200, elementHeight: 80 } });
  return doc;
}
function apply(doc: ReturnType<typeof fixture>, ops: Op[]) {
  const result = prepareBuilderTransaction(doc, { txId: crypto.randomUUID(), origin: "user", label: "Constraint", ops, expect: expectFor(doc, ops) });
  if (!result.ok) throw new Error(result.error.message); return result.prediction;
}
describe("3D constraints and transforms", () => {
  it.each([["start",50,200],["center",-100,200],["end",-250,200],["stretch",50,16],["proportional",25,100]] as const)("resolves %s against the stored reference", (mode, position, size) => {
    expect(constrainedAxis(50,200,300,{mode,reference:600})).toEqual({position,size});
  });
  it("preserves geometry at the reference and bounds growth", () => {
    for (const mode of ["start","center","end","stretch","proportional"] as const) expect(constrainedAxis(50,200,600,{mode,reference:600})).toEqual({position:50,size:200});
    expect(constrainedAxis(50,200,20000,{mode:"stretch",reference:600}).size).toBe(10000);
  });
  it("emits container-relative CSS and leaves auto dimensions intact", () => {
    expect(constraintAxisCss(50,200,{mode:"end",reference:600}).position).toBe("calc(100% + -550px)");
    expect(constraintAxisCss(50,200,{mode:"stretch",reference:600}).size).toBe("clamp(16px, calc(100% + -400px), 10000px)");
    expect(constraintAxisCss(50,undefined,{mode:"proportional",reference:600}).size).toBe("auto");
  });
  it.each([{mode:"bad",reference:600},{mode:"end",reference:0},{mode:"end",reference:Infinity},{mode:"end",reference:600,css:"unsafe"}])("rejects invalid constraints %j",value=>expect(constraintSchema.safeParse(value).success).toBe(false));
  it.each([["rotation",361],["rotation",NaN],["scaleX",0],["scaleY",10.1]] as const)("rejects invalid %s",(key,value)=>expect(()=>primitivePropertyOperations(fixture().nodes[text],"desktop",key,value)).toThrow());
  it("captures both axes atomically, round-trips, and undoes device settings", () => {
    const doc=fixture();doc.nodes[text].props.constraintY={mode:"end",reference:600};
    const ops=primitiveConstraintOperations(doc,text,"tablet","constraintX","end",{box:{x:50,y:140,elementWidth:200,elementHeight:80},container:{width:500,height:700}});
    const changed=apply(doc,ops);
    expect(changed.document.nodes[text].overrides.tablet).toMatchObject({x:50,y:140,constraintX:{mode:"end",reference:500},constraintY:{mode:"end",reference:700}});
    expect(rowsToDocument(documentToRows(changed.document)).document.nodes[text].overrides).toEqual(changed.document.nodes[text].overrides);
    expect(apply(changed.document,changed.inverse).document.nodes[text].overrides).toEqual({});
    expect(doc.nodes[text].props.x).toBe(50);
  });
  it("requires renderer 4 and renders constraints/transforms before hydration", () => {
    let doc=fixture();doc=apply(doc,[...primitivePropertyOperations(doc.nodes[text],"desktop","constraintX",{mode:"end",reference:600}),...primitivePropertyOperations(doc.nodes[text],"mobile","rotation",30),...primitivePropertyOperations(doc.nodes[text],"mobile","scaleX",1.5)]).document;
    const saved=createKcdPublishedSnapshot(doc);expect(saved.snapshot.rendererRequirement.minVersion).toBe(4);
    expect(readKcdPublishedSnapshot(saved.snapshot)?.nativeDocument.nodes[text].overrides.mobile?.rotation).toBe(30);
    const html=renderToStaticMarkup(createElement(KcdPrimitiveSubtree,{document:doc,rootId:root,device:"desktop",responsive:true}));
    expect(html).toContain("left:calc(100% + -550px)!important");expect(html).toContain("rotate(30deg) scale(1.5, 1)!important");
    expect(html.match(new RegExp(`<div data-kcd-node-id="${text}"`,"g"))).toHaveLength(1);
  });
});
