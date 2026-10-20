import {test,expect,type Page} from "playwright/test";
import {brandBrainSchema,type BrandBrainRecord} from "../../lib/create/brand-brain";
test.skip(process.env.KEBU_LOCAL_OPERATION_UI!=="1","Controlled local profile authority; signed-in S8 remains deferred.");
async function authority(page:Page,mode:"ok"|"failure"|"conflict"="ok") {
 let records:BrandBrainRecord[]=[],writes=0;
 await page.route("**/api/**",async route=>{
  const req=route.request(),url=new URL(req.url()),reply=(body:unknown,status=200)=>route.fulfill({status,json:body});
  if(url.pathname==="/api/businesses")return reply({businesses:[]});
  if(url.pathname==="/api/studio/brand-brain"){
   if(req.method()==="GET"){const id=url.searchParams.get("id"),selected=id?records.filter(r=>r.id===id):records;if(id&&!selected.length)return reply({error:"Profile not found."},404);return reply({profiles:selected});}
   writes++;const body=req.postDataJSON();const profile=brandBrainSchema.parse(body.profile);
   if(mode==="failure")return reply({error:"Save could not be confirmed. Your draft is kept."},503);
   if(mode==="conflict"&&body.expectedRevision>0){records=records.map(r=>({...r,revision:r.revision+1,profile:{...r.profile,brand:{...r.profile.brand,name:"Other saved name"}}}));return reply({error:"This profile changed elsewhere. Your draft is kept; reload the saved profile."},409);}
   const current=records.find(r=>r.id===body.id);expect(body.expectedRevision).toBe(current?.revision??0);
   const record={id:body.id,revision:(current?.revision??0)+1,profile};records=[record,...records.filter(r=>r.id!==record.id)];return reply({record});
  }
  return reply({});
 });
 return {records:()=>records,writes:()=>writes};
}
async function openAll(page:Page){for(const name of ["Creative DNA · composition and hierarchy","Taste DNA · references and exclusions","Motion DNA · movement limits"])await page.getByText(name,{exact:true}).click();}
for(const width of [1440,390])test(`Brand Brain ${width}px: four profiles, save, revision and refresh`,async({page})=>{
 const server=await authority(page),errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.setViewportSize({width,height:1000});await page.goto("/studio/brand");
 await page.getByRole("textbox",{name:"Brand name",exact:true}).fill("Controlled brand fixture");await page.getByRole("textbox",{name:"Languages (comma-separated)",exact:true}).pressSequentially("Wolof,French");await openAll(page);
 await page.getByRole("combobox",{name:"Composition",exact:true}).selectOption("editorial");await page.getByRole("textbox",{name:"What should stand out first?",exact:true}).fill("The artist and campaign title");
 await page.getByRole("textbox",{name:"Directions you dislike",exact:true}).fill("Generic blobs");await page.getByRole("button",{name:"Add reference",exact:true}).click();await page.getByRole("textbox",{name:"Reference label 1",exact:true}).fill("Editorial composition");await page.getByRole("textbox",{name:"Reference HTTPS address 1",exact:true}).fill("https://example.com/story");
 await page.getByRole("checkbox",{name:"Allow motion in this direction"}).check();await page.getByRole("combobox",{name:"Entrance style",exact:true}).selectOption("rise");await page.getByRole("spinbutton",{name:"Maximum duration (ms)",exact:true}).fill("700");
 await page.getByRole("button",{name:"Save Brand Brain",exact:true}).click();await expect.poll(()=>server.records()[0]?.revision).toBe(1);expect(server.records()[0].profile.brand.languages).toEqual(["Wolof","French"]);expect(server.records()[0].profile.motion.maxDuration).toBe(700);await expect(page.getByText("Brand Brain saved · version 1.",{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole("textbox",{name:"Brand name",exact:true})).toHaveValue("Controlled brand fixture");await openAll(page);await expect(page.getByRole("combobox",{name:"Composition",exact:true})).toHaveValue("editorial");await expect(page.getByRole("textbox",{name:"Directions you dislike",exact:true})).toHaveValue("Generic blobs");await expect(page.getByRole("spinbutton",{name:"Maximum duration (ms)",exact:true})).toHaveValue("700");
 await expect.poll(()=>page.locator('section[aria-label="Brand Brain editor"] input,section[aria-label="Brand Brain editor"] select,section[aria-label="Brand Brain editor"] textarea').evaluateAll(fields=>fields.filter(field=>!(field as HTMLInputElement).labels?.length).length)).toBe(0);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect(errors).toEqual([]);await page.screenshot({path:`evidence/3h/profiles/brand-brain-${width}.png`,fullPage:true});
});
test("Brand Brain failed save keeps draft and requires checking persisted state",async({page})=>{
 const server=await authority(page,"failure");await page.goto("/studio/brand");await page.getByRole("textbox",{name:"Brand name",exact:true}).fill("Unsaved direction");await page.getByRole("button",{name:"Save Brand Brain",exact:true}).click();await expect(page.locator('section[aria-label="Brand Brain editor"]').getByRole("alert").filter({hasText:"could not be confirmed"})).toBeVisible();await expect(page.getByRole("textbox",{name:"Brand name",exact:true})).toHaveValue("Unsaved direction");await expect(page.getByRole("button",{name:"Save Brand Brain",exact:true})).toBeDisabled();expect(server.writes()).toBe(1);expect(server.records()).toEqual([]);
 page.once("dialog",dialog=>dialog.accept());await page.getByRole("button",{name:"Reload saved profile",exact:true}).click();await expect(page.getByRole("button",{name:"Save Brand Brain",exact:true})).toBeEnabled();await expect(page.getByRole("textbox",{name:"Brand name",exact:true})).toHaveValue("Unsaved direction");
});
test("Brand Brain stale save retains draft and explicitly reloads the newer version",async({page})=>{
 await authority(page,"conflict");await page.goto("/studio/brand");await page.getByRole("textbox",{name:"Brand name",exact:true}).fill("First saved name");await page.getByRole("button",{name:"Save Brand Brain",exact:true}).click();await expect(page.getByText("Brand Brain saved · version 1.",{exact:true})).toBeVisible();await page.getByRole("textbox",{name:"Brand name",exact:true}).fill("Local unsaved name");await page.getByRole("button",{name:"Save Brand Brain",exact:true}).click();await expect(page.locator('section[aria-label="Brand Brain editor"]').getByRole("alert")).toContainText("changed elsewhere");await expect(page.getByRole("textbox",{name:"Brand name",exact:true})).toHaveValue("Local unsaved name");page.once("dialog",dialog=>dialog.accept());await page.getByRole("button",{name:"Reload saved profile",exact:true}).click();await expect(page.getByRole("textbox",{name:"Brand name",exact:true})).toHaveValue("Other saved name");await expect(page.getByText("Saved · version 2",{exact:true})).toBeVisible();
});
test("Brand Brain dirty selection can be cancelled and unsafe references never save",async({page})=>{
 const server=await authority(page);await page.goto("/studio/brand");await page.getByRole("textbox",{name:"Brand name",exact:true}).fill("Keep this draft");page.once("dialog",dialog=>dialog.dismiss());await page.getByRole("link",{name:"Original Brand DNA editor",exact:true}).click();await expect(page).toHaveURL(/\/studio\/brand$/);page.once("dialog",dialog=>dialog.dismiss());await page.getByRole("button",{name:"New profile",exact:true}).click();await expect(page.getByRole("textbox",{name:"Brand name",exact:true})).toHaveValue("Keep this draft");await openAll(page);await page.getByRole("button",{name:"Add reference",exact:true}).click();await page.getByRole("textbox",{name:"Reference label 1",exact:true}).fill("Unsafe");await page.getByRole("textbox",{name:"Reference HTTPS address 1",exact:true}).fill("javascript:alert(1)");await page.getByRole("button",{name:"Save Brand Brain",exact:true}).click();await expect(page.locator('section[aria-label="Brand Brain editor"]').getByRole("alert")).toContainText("HTTPS");expect(server.writes()).toBe(0);await page.getByRole("button",{name:"Remove reference 1",exact:true}).click();await page.getByRole("button",{name:"Save Brand Brain",exact:true}).click();await expect.poll(()=>server.records().length).toBe(1);
});
test("Brand Brain load failure is honest and retry recovers",async({page})=>{
 await authority(page);let fail=true;
 await page.route("**/api/studio/brand-brain",route=>fail?route.fulfill({status:503,json:{error:"Could not load Brand Brain."}}):route.fallback());
 await page.goto("/studio/brand");await expect(page.getByRole("alert").filter({hasText:"Could not load Brand Brain"})).toBeVisible();await expect(page.getByRole("button",{name:"Save Brand Brain",exact:true})).toHaveCount(0);fail=false;await page.getByRole("button",{name:"Retry loading profiles",exact:true}).click();await expect(page.getByRole("textbox",{name:"Brand name",exact:true})).toHaveValue("Brand DNA");
});
test("Brand Brain incompatible legacy profiles stay visible and original editor stays reachable",async({page})=>{
 await authority(page);await page.route("**/api/studio/brand-brain",route=>route.fulfill({json:{profiles:[],unavailable:[{id:"11111111-1111-4111-8111-111111111111",name:"Legacy custom font"}]}}));await page.goto("/studio/brand");await expect(page.getByText(/Unsupported existing profiles: Legacy custom font/)).toBeVisible();await expect(page.getByRole("link",{name:"Original Brand DNA editor",exact:true})).toHaveAttribute("href","/studio/brand/legacy");
});
