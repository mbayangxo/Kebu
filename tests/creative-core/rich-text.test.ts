import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { editRichText, formatRichRange, richTextValue, expectFor } from "@/lib/creative-core";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";
import { primitivePropertyOperations } from "@/lib/create/kcd-primitive-operations";
import { createKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { KcdPrimitiveSubtree } from "@/app/components/create/kcd/primitive-subtree";
import { artDirectionFixture } from "./fixtures/art-direction";

describe("structured rich text",()=>{
 it("can type after clearing device formatting to an explicit empty run list",()=>{
  expect(editRichText("","New phone copy",[])).toEqual([{text:"New phone copy"}]);
  expect(editRichText("Old","",[{text:"Old",bold:true}])).toBeUndefined();
 });
 it("splits selected text, combines semantic marks and preserves unrelated formatting",()=>{
  let runs=formatRichRange("Hello world",undefined,0,5,"bold",true);runs=formatRichRange("Hello world",runs,6,11,"italic",true);
  expect(runs).toEqual([{text:"Hello",bold:true},{text:" "},{text:"world",italic:true}]);
  expect(editRichText("Hello world","Hello big world",runs)).toEqual([{text:"Hello",bold:true},{text:" big "},{text:"world",italic:true}]);
  expect(richTextValue(formatRichRange("Hello world",runs,0,11,"bold",false))).toBe("Hello world");
  expect(()=>formatRichRange("Hello",undefined,0,5,"href","javascript:alert(1)")).toThrow();expect(()=>formatRichRange("Hello",undefined,2,2,"bold",true)).toThrow();
 });
 it("saves text/runs atomically and rejects malformed inherited content and nested links",()=>{
  const f=artDirectionFixture(),n=f.doc.nodes[f.text];delete n.props.href;const runs=formatRichRange(String(n.props.text),undefined,0,7,"bold",true);
  const ops=primitivePropertyOperations(n,"desktop","runs",runs),tx={txId:crypto.randomUUID(),origin:"user" as const,label:"Format",ops,expect:expectFor(f.doc,ops)};
  // Device copy differs, so inheriting desktop runs is rejected until device runs are supplied.
  expect(prepareBuilderTransaction(f.doc,tx)).toMatchObject({ok:false});
  for(const bucket of Object.values(n.overrides))delete bucket!.text;
  const saved=prepareBuilderTransaction(f.doc,tx);expect(saved.ok).toBe(true);if(!saved.ok)return;
  expect(createKcdPublishedSnapshot(saved.prediction.document).snapshot.rendererRequirement.minVersion).toBe(9);
  const bad=primitivePropertyOperations(saved.prediction.document.nodes[f.text],"desktop","text","Changed"),result=prepareBuilderTransaction(saved.prediction.document,{...tx,txId:crypto.randomUUID(),ops:bad,expect:expectFor(saved.prediction.document,bad)});expect(result).toMatchObject({ok:false});
 });
 it("renders escaped semantic spans with device variants and rejects nested links",()=>{
  const f=artDirectionFixture(),n=f.doc.nodes[f.text];delete n.props.href;for(const bucket of Object.values(n.overrides))delete bucket!.text;
  n.props.runs=[{text:"Desktop",bold:true},{text:" story",italic:true,href:"contact"}];const html=renderToStaticMarkup(createElement(KcdPrimitiveSubtree,{document:f.doc,rootId:f.root,device:"desktop",responsive:true}));
  expect(html).toContain("<strong>Desktop</strong>");expect(html).toContain("<em> story</em>");expect(html).toContain('href="/contact"');n.props.href="home";expect(()=>createKcdPublishedSnapshot(f.doc)).toThrow();
 });
});
