import { test,expect } from "playwright/test";
import { writeFileSync } from "node:fs";
import { emptyDocument,node,PAGE_A,PAGE_B,uuidFor } from "./helpers";
import { createKcdPublishedSnapshot } from "../../lib/create/kcd-published-snapshot";
import type { NodeId } from "../../lib/creative-core";
test.skip(process.env.KEBU_LOCAL_OPERATION_UI!=="1","Supplemental local published snapshot fixture");
const imageId=uuidFor(203) as NodeId;
test.beforeAll(()=>{
 const doc=emptyDocument([PAGE_A,PAGE_B]);doc.pages[1].slug="contact";
 for(const [page,text,offset] of [[PAGE_A,"Published story",200],[PAGE_B,"Contact us",300]] as const){
  const root=uuidFor(offset+1) as NodeId;const child=uuidFor(offset+2) as NodeId;
  doc.nodes[root]=node({id:root,type:"section",pageId:page,orderKey:"V"});
  doc.nodes[child]=node({id:child,type:"text",pageId:page,parentId:root,orderKey:"V",props:{text,href:page===PAGE_A?"contact":"home"},overrides:page===PAGE_A?{mobile:{text:"Phone story"},tablet:{text:"Tablet story"}}:{},a11y:{headingLevel:1}});
 }
 doc.nodes[imageId]=node({id:imageId,type:"image",pageId:PAGE_A,parentId:uuidFor(201) as NodeId,orderKey:"k",props:{src:"/brand/kebu-mark.png",href:"contact"},a11y:{alt:"Kebu brand"},visibility:{hideOn:["mobile"]}});
 writeFileSync(process.env.KEBU_LOCAL_S7_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(doc)));
});
for(const [device,width,heading] of [["desktop",1440,"Published story"],["tablet",768,"Tablet story"],["phone",390,"Phone story"]] as const){
 test(`${device}: verified snapshot renders, follows page links, and respects visibility`,async({page})=>{
  await page.setViewportSize({width,height:900});const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.route("**/api/**",route=>route.fulfill({json:{}}));
  await page.goto("/s7-local-probe/home");await expect(page.getByRole("heading",{name:heading,exact:true})).toBeVisible();
  await expect(page.locator(`[data-kcd-node-id="${imageId}"]`)).toHaveCount(1);
  if(device==="phone")await expect(page.getByAltText("Kebu brand")).toBeHidden();else await expect(page.getByAltText("Kebu brand")).toBeVisible();
  await page.screenshot({path:`evidence/3c/s7/published-${device}.png`,fullPage:true});
  await page.getByRole("link",{name:heading,exact:true}).click();await expect(page.getByRole("heading",{name:"Contact us",exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Contact us",exact:true}).click();await expect(page.getByRole("heading",{name:heading,exact:true})).toBeVisible();expect(errors).toEqual([]);
 });
}
test("phone hides inaccessible image links before hydration",async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();await page.goto(`${process.env.KEBU_E2E_BASE_URL}/s7-local-probe/home`);
 await expect(page.getByRole("heading",{name:"Phone story",exact:true})).toBeVisible();await expect(page.getByAltText("Kebu brand")).toHaveCount(1);await expect(page.getByAltText("Kebu brand")).toBeHidden();await expect(page.locator(`[data-kcd-link-for="${imageId}"]`)).toBeHidden();await context.close();
});
test("tampered snapshot cannot fall back to legacy rendering",async({page})=>{expect((await page.goto("/s7-local-probe/tampered"))?.status()).toBe(404);});
