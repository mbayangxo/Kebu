/** Real Builder shell/panel in Chromium; API responses here are controlled fixtures, not hosted SQL proof. */
import { test, expect, type Page } from "playwright/test";
import { emptyDocument, node, PAGE_A, PAGE_B, uuidFor } from "./helpers";
import { documentToRows } from "../../lib/create/kcd-adapter";
import type { NodeId } from "../../lib/creative-core";

test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1", "Local Builder harness only.");
const projectId="11111111-1111-4111-8111-111111111111";
async function fixture(page:Page, mode:"create"|"rename"|"delete"|"reorder"|"nav"|"valid") {
 const doc=emptyDocument([PAGE_A,PAGE_B]);doc.title="Page receipt fixture";
 const id=uuidFor(1,0x91) as NodeId;doc.nodes[id]=node({id,pageId:PAGE_A,type:"legacy-section:hero",orderKey:"V",props:{heading:"Home"}});
 const rows=documentToRows(doc);let writes=0;
 await page.route("**/api/**",async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path===`/api/projects/${projectId}`)return route.fulfill({json:{...rows,project:{...rows.project,document_schema_version:null,subdomain:"fixture",status:"draft"},renderPath:"3b",siteChrome:{enabled:false},publishState:{isLive:false,hasUnpublishedChanges:false,lastPublishedAt:null}}});
  if(path.endsWith("/billing"))return route.fulfill({json:{canPublish:true,billingExempt:true}});
  if(path.endsWith("/site-chrome/sync-nav"))return route.fulfill({status:503,json:{error:"Unavailable"}});
  if(path.endsWith("/pages")&&req.method()!=="GET"){
   writes++;const body=req.postDataJSON();
   if(mode==="nav"||mode==="valid"){
    const ordered=body.order.map((pageId:string,index:number)=>({...rows.pages.find(p=>p.id===pageId),sort_order:index}));
    rows.pages=ordered;
    return route.fulfill({json:{pages:ordered,...(mode==="nav"?{navSyncStale:true}:{})}});
   }
   return route.fulfill({json:mode==="delete"?{ok:true}:{}});
  }
  return route.fulfill({json:{}});
 });
 await page.goto(`/create/${projectId}`);await page.getByRole("button",{name:"Close menu",exact:true}).click();await page.getByRole("button",{name:"Pages",exact:true}).click();
 return{rows,writes:()=>writes};
}
const pageRow=(page:Page,title="Page 1")=>page.locator("li").filter({has:page.getByRole("button",{name:title,exact:true})});
test("unconfirmed creation keeps the title and does not select a nonexistent page",async({page})=>{
 const state=await fixture(page,"create");await page.getByRole("button",{name:"+ New page",exact:true}).click();
 const input=page.getByRole("textbox",{name:"New page title",exact:true});await input.fill("About");await page.getByRole("button",{name:"Add page",exact:true}).click();
 await expect(page.getByRole("alert").filter({hasText:"Page creation could not be confirmed"}).first()).toBeVisible();
 await expect(input).toHaveValue("About");await expect(input).toBeEnabled();expect(state.writes()).toBe(1);expect(state.rows.pages).toHaveLength(2);
});
test("unconfirmed rename retains the edit form and saved title",async({page})=>{
 await fixture(page,"rename");await pageRow(page).hover();await pageRow(page).getByRole("button",{name:"Rename page",exact:true}).click();
 await page.getByRole("textbox",{name:"Page title",exact:true}).fill("Changed");await page.getByRole("button",{name:"Save",exact:true}).click();
 await expect(page.getByRole("alert").filter({hasText:"Page changes could not be confirmed"}).first()).toBeVisible();await expect(page.getByRole("textbox",{name:"Page title",exact:true})).toHaveValue("Changed");
});
test("unconfirmed deletion retains the page and reports the missing receipt",async({page})=>{
 const state=await fixture(page,"delete");page.once("dialog",dialog=>dialog.accept());await pageRow(page).hover();await pageRow(page).getByRole("button",{name:"Delete page",exact:true}).click();
 await expect(page.getByRole("alert").filter({hasText:"Page deletion could not be confirmed"}).first()).toBeVisible();await expect(pageRow(page)).toBeVisible();expect(state.rows.pages).toHaveLength(2);
});
test("unconfirmed reordering restores the visible order",async({page})=>{
 await fixture(page,"reorder");await pageRow(page).hover();await pageRow(page).getByRole("button",{name:"Move page up",exact:true}).click();
 await expect(page.getByRole("alert").filter({hasText:"Page order could not be confirmed"}).first()).toBeVisible();
 await expect(page.getByRole("list").filter({has:pageRow(page)}).locator("li").first().getByRole("button",{name:"Home",exact:true})).toBeVisible();
});
test("confirmed order survives refresh but navigation sync failure stays visible",async({page})=>{
 const state=await fixture(page,"nav");await pageRow(page).hover();await pageRow(page).getByRole("button",{name:"Move page up",exact:true}).click();
 await expect(page.getByRole("alert").filter({hasText:"navigation still needs synchronization"}).first()).toBeVisible();expect(state.rows.pages[0].id).toBe(PAGE_B);
 await page.reload();await page.getByRole("button",{name:"Close menu",exact:true}).click();await page.getByRole("button",{name:"Pages",exact:true}).click();await expect(pageRow(page).getByRole("button",{name:"Move page up",exact:true})).toBeDisabled();
});
test("phone and keyboard users can discover page actions without hover",async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page,"valid");
 const control=pageRow(page).getByRole("button",{name:"Rename page",exact:true});
 expect(await control.evaluate(el=>Number(getComputedStyle(el.parentElement!).opacity))).toBe(1);
 const box=await control.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
 await control.focus();await page.keyboard.press("Enter");await expect(page.getByRole("textbox",{name:"Page title",exact:true})).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.screenshot({path:test.info().outputPath("builder-pages-phone.png"),fullPage:true});
});

test("desktop keyboard focus reveals otherwise hidden page actions",async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await fixture(page,"valid");
 const control=pageRow(page).getByRole("button",{name:"Rename page",exact:true});
 await page.mouse.move(1000,800);await control.focus();
 await expect.poll(()=>control.evaluate(el=>Number(getComputedStyle(el.parentElement!).opacity))).toBe(1);
 await page.keyboard.press("Enter");await expect(page.getByRole("textbox",{name:"Page title",exact:true})).toBeFocused();
});
