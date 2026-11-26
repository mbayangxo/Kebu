import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildMayReferenceDraft, mayDraftDefinition } from "../../scripts/build-may-reference-draft.mjs";
import { buildEditorPreviewDefinition } from "@/lib/create/editor-definition";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";
import { defaultMaylecorKsendrProps } from "@/lib/create/maylecor-ksendr-defaults";

function snapshot() {
  return {project:{title:"May Lècor",theme:{}},pages:[{id:"home",slug:"home",title:"Home",sort_order:0},{id:"about",slug:"about",title:"About May",sort_order:1}],sections:[{id:"scene",page_id:"home",section_type:"legally-blonde-hero",sort_order:0,props:defaultMaylecorKsendrProps()},{id:"bio",page_id:"about",section_type:"text",sort_order:0,props:{heading:"May’s story",body:"Original authored biography."}}]};
}
describe("local May design application",()=>{
  it("preserves authored data and identifiers without mutating the recovery snapshot",()=>{
    const source=snapshot(), before=structuredClone(source), draft=buildMayReferenceDraft(source);
    expect(source).toEqual(before);
    expect(draft.pages).toEqual(expect.arrayContaining(source.pages));
    expect(draft.sections.find((s:{id:string})=>s.id==="bio").props.body).toBe("Original authored biography.");
    const scene=draft.sections.find((s:{id:string})=>s.id==="scene").props;
    const original=source.sections[0].props as ReturnType<typeof defaultMaylecorKsendrProps>;
    expect(scene.cutoutAccent).toBe(original.cutoutAccent);
    expect(scene.layerScales).toEqual(original.layerScales);
    expect(scene.navLinks).toEqual(expect.arrayContaining(original.navLinks.map(link=>({...link,href:link.href.startsWith("https://forthemayjorgood.com")?"/mayjor-good":link.href}))));
  });
  it("produces native editable sections accepted by the publishing schema",()=>{
    const draft=buildMayReferenceDraft(snapshot());
    const definition=buildEditorPreviewDefinition(draft.project,draft.pages,draft.sections,null);
    const parsed=validateWebsiteDefinition(definition);
    expect(parsed).toMatchObject({ok:true});
    expect(validateWebsiteDefinition(mayDraftDefinition(draft))).toMatchObject({ok:true});
    if(process.env.MAY_LOCAL_VALIDATE) {
      const candidate=JSON.parse(readFileSync(process.env.MAY_LOCAL_VALIDATE,"utf8"));
      const validation=validateWebsiteDefinition(candidate);
      expect(validation,JSON.stringify(validation)).toMatchObject({ok:true});
    }
  });
  it("does not duplicate page title sections on another pass",()=>{
    const once=buildMayReferenceDraft(snapshot()),twice=buildMayReferenceDraft(once);
    expect(twice.sections.map((s:{id:string})=>s.id)).toEqual(once.sections.map((s:{id:string})=>s.id));
  });
});
