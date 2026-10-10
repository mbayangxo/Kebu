import {test,expect,type Page} from "@playwright/test";
import {brandBrainSchema,type BrandBrainRecord} from "../../lib/create/brand-brain";
import {documentToRows} from "../../lib/create/kcd-adapter";
import {prepareBuilderTransaction} from "../../lib/create/kcd-write-boundary";
import type {NodeId,Transaction} from "../../lib/creative-core";
import {artDirectionFixture} from "./fixtures/art-direction";
test.skip(process.env.KEBU_LOCAL_OPERATION_UI!=="1","Controlled local full journey; hosted signed-in testing is deferred.");
const site="11111111-1111-4111-8111-111111111111",libraryId="33333333-3333-4333-8333-333333333333",image="/icons/icon-192.png";
async function authority(page:Page){
 const fixture=artDirectionFixture();let document=fixture.doc,records:BrandBrainRecord[]=[],binding={projectId:site,profileId:null as string|null,revision:0};
 let attachmentMode:"ok"|"conflict"|"uncertain"|"badAck"="ok",loadFail=false,uploadFail=false,attachWrites=0,profileWrites=0,uploads=0;
 const transactions:Transaction[]=[];
 await page.route("**/api/**",async route=>{
  const req=route.request(),url=new URL(req.url()),reply=(body:unknown,status=200)=>route.fulfill({json:body,status});
  if(url.pathname==="/api/businesses")return reply({businesses:[]});
  if(url.pathname==="/api/studio/uploads")return reply({uploads:[{id:libraryId,kind:"image",url:image,file_name:"Campaign cover"}]});
  if(url.pathname==="/api/studio/upload"){uploads++;expect(req.headers()["content-type"]).toContain("multipart/form-data");return uploadFail?reply({error:"Upload failed. Retry."},503):reply({kind:"image",url:"/icons/icon-512.png"});}
  if(url.pathname==="/api/studio/brand-brain"){
   if(req.method()==="GET"){const id=url.searchParams.get("id");return reply({profiles:id?records.filter(row=>row.id===id):records});}
   const body=req.postDataJSON(),profile=brandBrainSchema.parse(body.profile);profileWrites++;
   const current=records.find(row=>row.id===body.id);expect(body.expectedRevision).toBe(current?.revision??0);
   const record={id:body.id,revision:body.expectedRevision+1,profile};records=[record,...records.filter(row=>row.id!==record.id)];return reply({record});
  }
  if(url.pathname===`/api/projects/${site}/brand-brain`){
   if(req.method()==="GET")return loadFail?reply({error:"Could not load site direction. Retry."},503):reply({binding,record:records.find(row=>row.id===binding.profileId)??null,unavailable:false});
   attachWrites++;const body=req.postDataJSON();
   if(attachmentMode==="conflict"){binding={...binding,revision:binding.revision+1};return reply({error:"Site direction changed elsewhere. Reload the saved attachment before retrying."},409);}
   expect(body.expectedRevision).toBe(binding.revision);binding={...binding,profileId:body.profileId,revision:binding.revision+1};
   if(attachmentMode==="uncertain")return reply({error:"Attachment could not be confirmed. Reload the saved attachment before retrying."},503);
   if(attachmentMode==="badAck")return reply({binding:{...binding,revision:99}});
   return reply({binding});
  }
  if(url.pathname===`/api/projects/${site}`){const rows=documentToRows(document);return reply({...rows,project:{...rows.project,subdomain:"brand-brain-closure",status:"draft"},renderPath:"kcd",publishState:{isLive:false,hasUnpublishedChanges:false,lastPublishedAt:null},siteChrome:{enabled:false}});}
  if(url.pathname.endsWith("/operations")){
   if(req.method()==="GET")return reply({document});const tx=req.postDataJSON()as Transaction,result=prepareBuilderTransaction(document,tx);if(!result.ok)return reply({error:result.error.message},400);
   transactions.push(tx);document=result.prediction.document;return reply({status:"committed",versions:result.prediction.versions,removed:result.prediction.removed,nodes:Object.keys(result.prediction.versions).flatMap(id=>document.nodes[id as NodeId]?[document.nodes[id as NodeId]]:[])});
  }
  if(url.pathname.endsWith("/billing"))return reply({canPublish:true,billingExempt:true});if(url.pathname.endsWith("/site-chrome"))return reply({siteChrome:{enabled:false}});
  return reply({});
 });
 return {fixture,records:()=>records,binding:()=>binding,document:()=>document,transactions,writes:()=>attachWrites,profileWrites:()=>profileWrites,uploads:()=>uploads,mode:(value:typeof attachmentMode)=>{attachmentMode=value;},loadFail:(value:boolean)=>{loadFail=value;},uploadFail:()=>{uploadFail=true;}};
}
async function create(page:Page){await page.goto("/studio/brand");await page.getByRole("textbox",{name:"Brand name",exact:true}).fill("Internal direction");await page.getByRole("button",{name:"Save Brand Brain",exact:true}).click();await expect(page.getByText("Brand Brain saved · version 1.",{exact:true})).toBeVisible();}
async function builder(page:Page,text:string){await page.goto(`/create/${site}`);await page.locator(`[data-kcd-node-id="${text}"]`).click();await page.locator("summary").filter({hasText:"Brand Brain · saved direction"}).click();return page.getByRole("region",{name:"Apply Brand Brain"});}
for(const width of [1440,390])test(`3H full ${width}px authoring, images, attachment, fresh URL, application and detach`,async({page})=>{
 const server=await authority(page),errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.setViewportSize({width,height:1000});await create(page);
 const assets=page.getByRole("region",{name:"Approved brand images"});await assets.getByRole("button",{name:"Choose Studio upload",exact:true}).click();await assets.getByRole("button",{name:"Approve Campaign cover",exact:true}).click();
 await assets.getByLabel("Upload approved image",{exact:true}).setInputFiles({name:"Portrait.png",mimeType:"image/png",buffer:Buffer.from("controlled image upload fixture")});await expect(assets.getByRole("textbox",{name:"Image label 2",exact:true})).toHaveValue("Portrait.png");
 await assets.getByRole("button",{name:"Move image 2 up",exact:true}).click();await assets.getByRole("textbox",{name:"Image label 1",exact:true}).fill("Artist portrait");
 await page.getByText("Creative DNA · composition and hierarchy",{exact:true}).click();await page.getByRole("combobox",{name:"Composition",exact:true}).selectOption("editorial");
 await page.getByText("Taste DNA · references and exclusions",{exact:true}).click();await page.getByRole("textbox",{name:"Never use",exact:true}).fill("Generic stock illustration");
 await page.getByText("Motion DNA · movement limits",{exact:true}).click();await page.getByRole("checkbox",{name:"Allow motion in this direction"}).check();await page.getByRole("combobox",{name:"Entrance style",exact:true}).selectOption("rise");
 await page.getByRole("button",{name:"Save Brand Brain",exact:true}).click();await expect.poll(()=>server.records()[0]?.revision).toBe(2);await page.reload();await expect(assets.getByRole("textbox",{name:"Image label 1",exact:true})).toHaveValue("Artist portrait");expect(server.records()[0].profile.brand.approvedImagery.map(item=>item.url)).toEqual(["/icons/icon-512.png",image]);
 await page.screenshot({path:`evidence/3h/complete/curation-${width}.png`,fullPage:true});
 let panel=await builder(page,server.fixture.text);await panel.getByRole("combobox",{name:"Saved Brand Brain"}).selectOption(server.records()[0].id);await panel.getByRole("button",{name:"Attach profile to site",exact:true}).click();await expect(panel.getByText("Site direction: Internal direction · attached.",{exact:true})).toBeVisible();expect(server.transactions).toHaveLength(0);
 await panel.scrollIntoViewIfNeeded();await page.screenshot({path:`evidence/3h/complete/attached-${width}.png`,fullPage:true});
 await page.goto("/studio/brand");panel=await builder(page,server.fixture.text);await expect(panel.getByRole("combobox",{name:"Saved Brand Brain"})).toHaveValue(server.records()[0].id);expect(new URL(page.url()).searchParams.has("brain")).toBe(false);
 await panel.getByRole("checkbox",{name:"Apply motion direction"}).check();await panel.getByRole("button",{name:"Apply to selected subtree",exact:true}).click();await expect.poll(()=>server.transactions.length).toBe(1);expect(server.document().nodes[server.fixture.text].motion).toMatchObject({preset:"rise"});
 if(width<640)await page.getByRole("button",{name:"Done — view site",exact:true}).click();await page.getByRole("button",{name:"Undo",exact:true}).first().click();await expect.poll(()=>server.transactions.length).toBe(2);
 if(width<640)await page.getByRole("button",{name:"Sections",exact:true}).first().click();await panel.getByRole("button",{name:"Detach site profile",exact:true}).click();await expect(panel.getByText("Site direction: No attached profile.",{exact:true})).toBeVisible();expect(server.transactions).toHaveLength(2);expect(server.records()).toHaveLength(1);
 await panel.scrollIntoViewIfNeeded();await page.screenshot({path:`evidence/3h/complete/attachment-${width}.png`,fullPage:true});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect(errors).toEqual([]);
});
for(const mode of ["conflict","uncertain","badAck"]as const)test(`attachment ${mode} requires authoritative reload and never retries automatically`,async({page})=>{
 const server=await authority(page);await create(page);const panel=await builder(page,server.fixture.text);await panel.getByRole("combobox",{name:"Saved Brand Brain"}).selectOption(server.records()[0].id);server.mode(mode);await panel.getByRole("button",{name:"Attach profile to site",exact:true}).click();await expect(panel.getByRole("alert")).toBeVisible();await expect(panel.getByRole("button",{name:"Attach profile to site",exact:true})).toBeDisabled();expect(server.writes()).toBe(1);server.mode("ok");await panel.getByRole("button",{name:"Reload profiles",exact:true}).click();await expect(panel.getByRole("alert")).toHaveCount(0);
 if(mode==="conflict"){await panel.getByRole("button",{name:"Attach profile to site",exact:true}).click();await expect.poll(()=>server.binding().profileId).toBe(server.records()[0].id);}else await expect(panel.getByRole("button",{name:"Detach site profile",exact:true})).toBeEnabled();expect(server.transactions).toHaveLength(0);
});
test("attachment read failure prevents writes and recovers; image failures retain draft",async({page})=>{
 const server=await authority(page);await create(page);server.loadFail(true);const panel=await builder(page,server.fixture.text);await panel.getByRole("combobox",{name:"Saved Brand Brain"}).selectOption(server.records()[0].id);await expect(panel.getByRole("alert")).toContainText("Could not load site direction");await expect(panel.getByRole("button",{name:"Attach profile to site",exact:true})).toBeDisabled();server.loadFail(false);await panel.getByRole("button",{name:"Reload profiles",exact:true}).click();await expect(panel.getByRole("button",{name:"Attach profile to site",exact:true})).toBeEnabled();expect(server.writes()).toBe(0);
 await page.goto("/studio/brand");server.uploadFail();await page.getByLabel("Upload approved image",{exact:true}).setInputFiles({name:"bad.png",mimeType:"image/png",buffer:Buffer.from("fixture")});await expect(page.getByRole("region",{name:"Approved brand images"}).getByRole("alert")).toContainText("Upload failed");await expect(page.getByRole("textbox",{name:"Brand name",exact:true})).toHaveValue("Internal direction");expect(server.records()[0].profile.brand.approvedImagery).toEqual([]);
 await page.getByRole("button",{name:"Add image address",exact:true}).click();await page.getByRole("textbox",{name:"Image address 1",exact:true}).fill("javascript:bad");await page.getByRole("button",{name:"Save Brand Brain",exact:true}).click();await expect(page.getByRole("region",{name:"Brand Brain editor"}).getByRole("alert").first()).toContainText("HTTPS");expect(server.profileWrites()).toBe(1);await page.getByRole("button",{name:"Remove image 1",exact:true}).click();await expect(page.getByRole("textbox",{name:"Image address 1",exact:true})).toHaveCount(0);
});
