import { readFileSync, writeFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { createKcdPublishedSnapshot } from "../../lib/create/kcd-published-snapshot";
import { emptyDocument, node, PAGE_A, uuidFor } from "./helpers";
import type { NodeId } from "../../lib/creative-core";
import { nestedOrderFixture } from "./fixtures/nested-order";
import { artDirectionFixture } from "./fixtures/art-direction";
import { motionFixture } from "./fixtures/motion";
import { videoFixture } from "./fixtures/video";
import { decompositionFixture } from "./fixtures/decomposition";
import { decomposeLegacySection } from "../../lib/create/kcd-section-decomposition";
test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1" || !process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE, "Controlled local published snapshot.");

for(const javaScriptEnabled of [false,true])for(const width of [1440,768,390])test(`art: published ${width}px typography, content and media with JavaScript ${javaScriptEnabled?"on":"off"}`,async({browser,baseURL})=>{
 const f=artDirectionFixture();writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(f.doc)));
 const context=await browser.newContext({baseURL,javaScriptEnabled,viewport:{width,height:1000}});
 try{
  const page=await context.newPage(),errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto("/spatial-local-probe");
  const check=async(w:number)=>{
   const desktop=w>1024,tablet=w>640&&!desktop,name=desktop?"Desktop story":tablet?"Tablet story":"Phone story";
   await expect(page.getByRole("heading",{name,exact:true})).toHaveCSS("font-size",`${desktop?30:tablet?22:18}px`);
   await expect(page.getByRole("heading",{name,exact:true})).toHaveCSS("letter-spacing",desktop||tablet?"2px":"normal");
   await expect(page.getByRole("heading")).toHaveCount(1);await expect(page.getByRole("link",{name:/story/})).toHaveCount(1);
   const inactive=page.locator(`[data-kcd-device-body-for="${f.text}"]:not([data-kcd-device="${desktop?"desktop":tablet?"tablet":"mobile"}"]) a`);
   for(const link of await inactive.all())expect(await link.evaluate(element=>{(element as HTMLElement).focus();return document.activeElement===element;})).toBe(false);
   const media=page.getByRole("img",{name:"Kebu test image",exact:true});await expect(media).toHaveCount(1);
   await expect(media).toHaveAttribute("src",desktop?"/brand/kebu-mark.png":tablet?"/brand/favicon.png":"/brand/kebu-mark.png?device=mobile");
   await expect(media).toHaveCSS("object-position",desktop?"50% 50%":tablet?"20% 80%":"90% 10%");
   await expect(page.locator(`[data-kcd-canvas-for="${f.group}"]`)).toHaveCSS("flex-direction",desktop?"row":"column");
   await expect(page.locator(`[data-kcd-node-id="${f.root}"]`)).toHaveCSS("padding-top",desktop?"0px":tablet?"8px":"16px");
   for(const id of [f.root,f.group,f.text,f.image])await expect(page.locator(`[data-kcd-node-id="${id}"]`)).toHaveCount(1);
  };
  await check(width);await page.screenshot({path:`evidence/3d/art-published-${width}-${javaScriptEnabled?"on":"off"}.png`,fullPage:true});
  for(const next of [390,768,1440]){await page.setViewportSize({width:next,height:1000});await check(next);}expect(errors).toEqual([]);
 }finally{await context.close();}
});

test("art: an explicitly empty phone image does not reveal the desktop source",async({browser,baseURL})=>{
 const f=artDirectionFixture();f.doc.nodes[f.image].overrides.mobile!.src="";
 writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(f.doc)));
 const context=await browser.newContext({baseURL,javaScriptEnabled:false,viewport:{width:390,height:1000}});
 try{const page=await context.newPage();await page.goto("/spatial-local-probe");await expect(page.getByRole("img",{name:"No image selected",exact:true})).toHaveCount(1);await expect(page.getByRole("img",{name:"Kebu test image",exact:true})).toHaveCount(0);}finally{await context.close();}
});

for(const javaScriptEnabled of [false,true])for(const width of [1440,768,390])test(`order: published ${width}px nested flow with JavaScript ${javaScriptEnabled?"on":"off"}`,async({browser,baseURL})=>{
 const f=nestedOrderFixture();writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(f.doc)));
 const context=await browser.newContext({baseURL,javaScriptEnabled,viewport:{width,height:1000}});
 try{
  const page=await context.newPage(),errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto("/spatial-local-probe");
  for(const ids of [f.children,f.sectionChildren]){
   const expected=width===1440?ids:width===768?[ids[1],ids[0],ids[2]]:[ids[2],ids[0],ids[1]];
   await expect.poll(async()=>{
    const positions=await Promise.all(ids.map(async id=>({id,top:await page.locator(`[data-kcd-node-id="${id}"]`).evaluate(element=>element.getBoundingClientRect().top)})));
    return positions.sort((a,b)=>a.top-b.top).map(value=>value.id);
   }).toEqual(expected);
   await expect(page.locator(`[data-kcd-link-for="${ids[0]}"]`)).toHaveAttribute("href","/spatial-local-probe/contact");
  }
  expect(errors).toEqual([]);await expect(page.locator("[data-kcd-spatial-controls]")).toHaveCount(0);
  await page.screenshot({path:`evidence/3d/order-published-${width}-${javaScriptEnabled?"on":"off"}.png`,fullPage:true});
 }finally{await context.close();}
});
const root = uuidFor(101, 0x3d) as NodeId, text = uuidFor(102, 0x3d) as NodeId, image = uuidFor(103, 0x3d) as NodeId;
function saved() {
 const doc = emptyDocument(); doc.meta.documentSchemaVersion = "kcd-1";
 doc.nodes[root] = node({ id: root, type: "section", pageId: PAGE_A, orderKey: "V", props: { canvasHeight: 560 }, a11y: { label: "Spatial composition" } });
 const geometry = { position: "absolute", x: 80, y: 50, elementWidth: 280, elementHeight: 100 };
 const overrides = { tablet: { x: 20, elementWidth: 260 }, mobile: { x: 8, elementWidth: 220 } };
 doc.nodes[text] = node({ id: text, type: "text", parentId: root, pageId: PAGE_A, orderKey: "V", props: { ...geometry, layer: 7, text: "Published spatial story", href: "contact" }, overrides });
 doc.nodes[image] = node({ id: image, type: "image", parentId: root, pageId: PAGE_A, orderKey: "W", props: { ...geometry, layer: 1, src: "/brand/kebu-mark.png" }, a11y: { alt: "Kebu" }, overrides });
 const prepared = createKcdPublishedSnapshot(doc); doc.nodes[text].props.x = 999; doc.nodes[text].props.text = "Later draft";
 return prepared;
}
for (const javaScriptEnabled of [false, true]) for (const [width, x, elementWidth] of [[1440, 80, 280], [768, 20, 260], [390, 8, 220]] as const) {
 test(`spatial: published ${width}px geometry and layers with JavaScript ${javaScriptEnabled ? "on" : "off"}`, async ({browser,baseURL}) => {
  writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!, JSON.stringify(saved()));
  const context = await browser.newContext({baseURL,javaScriptEnabled,viewport:{width,height:1000}});
  try {
   const page = await context.newPage(); const errors: string[] = [];page.on("pageerror",error=>errors.push(error.message));
   await page.goto("/spatial-local-probe");
   const target = page.locator(`[data-kcd-node-id="${text}"]`);
   await expect(target).toHaveText("Published spatial story"); await expect(target).toHaveCSS("left",`${x}px`);await expect(target).toHaveCSS("width",`${elementWidth}px`);await expect(target).toHaveCSS("z-index","7");
   await expect(page.locator(`[data-kcd-canvas-for="${root}"]`)).toHaveCSS("min-height","560px");
   await expect(target.getByRole("link")).toHaveAttribute("href","/spatial-local-probe/contact");
   const hit = await target.evaluate(element => { const r=element.getBoundingClientRect();return document.elementFromPoint(r.left+10,r.top+10)?.closest("[data-kcd-node-id]")?.getAttribute("data-kcd-node-id"); });
   expect(hit).toBe(text);expect(errors).toEqual([]);await expect(page.locator("[data-kcd-spatial-controls]")).toHaveCount(0);
   await page.screenshot({path:`evidence/3d/published-${width}-${javaScriptEnabled ? "hydrated" : "ssr"}.png`,fullPage:true});
  } finally { await context.close(); }
 });
}


for(const javaScriptEnabled of [false,true]) for(const [width,containerWidth,x] of [[1440,600,350],[768,500,250],[390,300,50]] as const) test(`constraints: published ${width}px anchors and transforms with JavaScript ${javaScriptEnabled?"on":"off"}`,async({browser,baseURL})=>{
 const doc=emptyDocument();doc.meta.documentSchemaVersion="kcd-1";const group=uuidFor(104,0x3d) as NodeId,stretch=uuidFor(105,0x3d) as NodeId,proportional=uuidFor(106,0x3d) as NodeId;
 doc.nodes[root]=node({id:root,type:"section",pageId:PAGE_A,orderKey:"V",props:{canvasHeight:700,paddingY:"none",width:"full"}});
 doc.nodes[group]=node({id:group,type:"group",parentId:root,pageId:PAGE_A,orderKey:"V",props:{elementWidth:600,elementHeight:600,canvasHeight:600},overrides:{tablet:{elementWidth:500,elementHeight:500,canvasHeight:500},mobile:{elementWidth:300,elementHeight:400,canvasHeight:400}}});
 doc.nodes[text]=node({id:text,type:"text",parentId:group,pageId:PAGE_A,orderKey:"V",props:{text:"Anchored story",position:"absolute",x:350,y:240,elementWidth:200,elementHeight:100,constraintX:{mode:"end",reference:600},constraintY:{mode:"center",reference:600},rotation:25,scaleX:1.2,scaleY:0.8},overrides:{mobile:{rotation:-15}}});
 doc.nodes[stretch]=node({id:stretch,type:"text",parentId:group,pageId:PAGE_A,orderKey:"W",props:{text:"Stretched",position:"absolute",x:20,y:10,elementWidth:560,elementHeight:580,constraintX:{mode:"stretch",reference:600},constraintY:{mode:"stretch",reference:600}}});
 doc.nodes[proportional]=node({id:proportional,type:"text",parentId:group,pageId:PAGE_A,orderKey:"X",props:{text:"Proportional",position:"absolute",x:60,y:60,elementWidth:180,elementHeight:120,constraintX:{mode:"proportional",reference:600},constraintY:{mode:"proportional",reference:600}}});
 writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(doc)));
 const context=await browser.newContext({baseURL,javaScriptEnabled,viewport:{width,height:1000}});
 try{const page=await context.newPage();const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto("/spatial-local-probe");
 const target=page.locator(`[data-kcd-node-id="${text}"]`);await expect(target).toHaveCSS("left",`${x}px`);await expect(target).toHaveCSS("top",`${width===1440?240:width===768?190:140}px`);await expect(target).toHaveCSS("width","200px");
 await expect(page.locator(`[data-kcd-node-id="${group}"]`)).toHaveCSS("width",`${containerWidth}px`);
 const stretchTarget=page.locator(`[data-kcd-node-id="${stretch}"]`);await expect(stretchTarget).toHaveCSS("width",`${containerWidth-40}px`);await expect(stretchTarget).toHaveCSS("height",`${width===1440?580:width===768?480:380}px`);
 const proportionalTarget=page.locator(`[data-kcd-node-id="${proportional}"]`);await expect(proportionalTarget).toHaveCSS("left",`${containerWidth/10}px`);await expect(proportionalTarget).toHaveCSS("width",`${containerWidth*.3}px`);
 const matrix=await page.locator(`[data-kcd-transform-for="${text}"]`).evaluate(element=>{const m=new DOMMatrix(getComputedStyle(element).transform);return{rotation:Math.atan2(m.b,m.a)*180/Math.PI,x:Math.hypot(m.a,m.b),y:Math.hypot(m.c,m.d)}});
 expect(matrix.rotation).toBeCloseTo(width===390?-15:25,3);expect(matrix.x).toBeCloseTo(1.2,3);expect(matrix.y).toBeCloseTo(.8,3);expect(errors).toEqual([]);
 await page.screenshot({path:`evidence/3d/constraints-published-${width}-${javaScriptEnabled?"on":"off"}.png`,fullPage:true});
 }finally{await context.close();}
});

for(const javaScriptEnabled of [false,true])for(const width of [1440,768,390])test(`motion: published ${width}px readable content and preserved transforms with JavaScript ${javaScriptEnabled?"on":"off"}`,async({browser,baseURL})=>{
 const f=motionFixture();
 writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(f.doc)));
 const context=await browser.newContext({baseURL,javaScriptEnabled,viewport:{width,height:1000},reducedMotion:"reduce"});
 try{const page=await context.newPage(),errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await page.goto("/spatial-local-probe");
  const host=page.locator(`[data-kcd-motion-for="${f.text}"]`),transform=page.locator(`[data-kcd-transform-for="${f.text}"]`);
  await expect(host).toHaveCSS("opacity","1");await expect(host).toHaveCSS("transform","none");await expect(transform).not.toHaveCSS("transform","none");
  await expect(page.getByRole("heading",{name:width>1024?"Desktop story":width>640?"Tablet story":"Phone story",exact:true})).toBeVisible();
  await expect(page.locator(`[data-kcd-node-id="${f.text}"]`)).toHaveCount(1);expect(errors).toEqual([]);
 }finally{await context.close();}
});

test("motion: load and enter triggers, focus, dynamic reduced motion and disabled devices",async({browser,baseURL})=>{
 const f=motionFixture();
 f.doc.nodes[f.text].motion={...(f.doc.nodes[f.text].motion as object),trigger:"load",devices:{mobile:{enabled:false}}};
 writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(f.doc)));
 const context=await browser.newContext({baseURL,viewport:{width:1440,height:1000},reducedMotion:"no-preference"});
 try{const page=await context.newPage();await page.addInitScript(()=>{
   const animate=Element.prototype.animate;Element.prototype.animate=function(...args){const id=this.getAttribute("data-kcd-motion-for");if(id){(window as unknown as {motionCalls:string[]}).motionCalls??=[];(window as unknown as {motionCalls:string[]}).motionCalls.push(id);}return animate.apply(this,args);};
  });await page.goto("/spatial-local-probe");
  const host=page.locator(`[data-kcd-motion-for="${f.text}"]`),body=page.locator(`[data-kcd-interaction-for="${f.text}"]`);
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {motionCalls:string[]}).motionCalls?.length??0)).toBe(1);
  await expect.poll(()=>host.evaluate(e=>e.getAnimations().length)).toBe(0);
  await page.getByRole("link",{name:"Desktop story",exact:true}).focus();await expect.poll(()=>body.evaluate(e=>e.getAnimations().length)).toBe(1);await expect(body).not.toHaveCSS("transform","none");
  await page.emulateMedia({reducedMotion:"reduce"});await expect(body).toHaveCSS("transform","none");await expect(host).toHaveCSS("opacity","1");
  await page.emulateMedia({reducedMotion:"no-preference"});await page.setViewportSize({width:390,height:1000});await expect(host).toHaveCSS("opacity","1");expect(await page.evaluate(()=>(window as unknown as {motionCalls:string[]}).motionCalls.length)).toBe(1);
  await page.setViewportSize({width:768,height:1000});await expect.poll(()=>page.evaluate(()=>(window as unknown as {motionCalls:string[]}).motionCalls.length)).toBe(2);
  await page.emulateMedia({reducedMotion:"reduce"});await expect.poll(()=>host.evaluate(e=>e.getAnimations().length)).toBe(0);
  await page.emulateMedia({reducedMotion:"no-preference"});await page.getByRole("link",{name:"Tablet story",exact:true}).blur();await expect(body).toHaveCSS("transform","none");
 }finally{await context.close();}
 // A below-fold enter trigger must wait for actual intersection.
 const g=motionFixture();g.doc.nodes[g.text].props.position="absolute";g.doc.nodes[g.text].props.y=1600;g.doc.nodes[g.group].props.canvasHeight=1900;
 writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(g.doc)));
 const enterContext=await browser.newContext({baseURL,viewport:{width:1440,height:700},reducedMotion:"no-preference"});
 try{const page=await enterContext.newPage();await page.goto("/spatial-local-probe");const host=page.locator(`[data-kcd-motion-for="${g.text}"]`);await expect(host).toHaveCSS("opacity","1");expect(await host.evaluate(e=>e.getAnimations().length)).toBe(0);await host.scrollIntoViewIfNeeded();await expect.poll(()=>host.evaluate(e=>e.getAnimations().length)).toBe(1);await expect.poll(()=>host.evaluate(e=>e.getAnimations().length)).toBe(0);await expect(host).toHaveCSS("opacity","1");}finally{await enterContext.close();}
});

for(const missing of ["animate","observer"] as const)test(`motion: missing ${missing} keeps content readable`,async({browser,baseURL})=>{
 const f=motionFixture();writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(f.doc)));
 const context=await browser.newContext({baseURL,viewport:{width:1440,height:1000}});
 try{const page=await context.newPage(),errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await page.addInitScript(which=>{if(which==="animate")Object.defineProperty(Element.prototype,"animate",{value:undefined,configurable:true});else Object.defineProperty(window,"IntersectionObserver",{value:undefined,configurable:true});},missing);await page.goto("/spatial-local-probe");const host=page.locator(`[data-kcd-motion-for="${f.text}"]`);await expect(host).toHaveCSS("opacity","1");await expect(host).toHaveCSS("transform","none");await expect(page.getByRole("heading",{name:"Desktop story",exact:true})).toBeVisible();expect(errors).toEqual([]);}finally{await context.close();}
});

test("motion: hover returns smoothly, coarse pointers stay still and existing links retain keyboard focus",async({browser,baseURL})=>{
 const f=motionFixture();delete f.doc.nodes[f.text].motion;writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(f.doc)));
 for(const coarse of [false,true]){
  const context=await browser.newContext({baseURL,viewport:{width:1440,height:1000},hasTouch:coarse,reducedMotion:"no-preference"});
  try{const page=await context.newPage();await page.goto("/spatial-local-probe");const target=page.locator(`[data-kcd-node-id="${f.text}"]`),body=page.locator(`[data-kcd-interaction-for="${f.text}"]`);
   await expect(page.locator(`[data-kcd-motion-for="${f.text}"]`)).toHaveAttribute("data-kcd-motion-ready","true");
   expect(await page.evaluate(()=>matchMedia("(hover: hover) and (pointer: fine)").matches)).toBe(!coarse);
   await target.dispatchEvent("pointerenter");if(coarse){await expect(body).toHaveCSS("transform","none");expect(await body.evaluate(e=>e.getAnimations().length)).toBe(0);}else await expect(body).not.toHaveCSS("transform","none");
   await target.dispatchEvent("pointerleave");await target.dispatchEvent("pointerleave");await expect(body).toHaveCSS("transform","none");
   await page.getByRole("link",{name:"Desktop story",exact:true}).focus();await expect(body).not.toHaveCSS("transform","none");await page.getByRole("link",{name:"Desktop story",exact:true}).blur();await expect(body).toHaveCSS("transform","none");
  }finally{await context.close();}
 }
});

for(const javaScriptEnabled of [false,true])for(const width of [1440,768,390])test(`effects: published ${width}px masks, styling and identity JavaScript ${javaScriptEnabled?"on":"off"}`,async({browser,baseURL})=>{
 const f=artDirectionFixture();Object.assign(f.doc.nodes[f.image].props,{mask:"ellipse",blur:1,opacity:0.8,rotation:20});Object.assign(f.doc.nodes[f.image].overrides.tablet!,{mask:"arch",blur:0});Object.assign(f.doc.nodes[f.image].overrides.mobile!,{mask:"diamond",opacity:1});writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(f.doc)));
 const context=await browser.newContext({baseURL,javaScriptEnabled,viewport:{width,height:1000}});
 try{const page=await context.newPage(),errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await page.goto("/spatial-local-probe");const effect=page.locator(`[data-kcd-effects-for="${f.image}"]`);await expect(effect).toHaveCSS("clip-path",width===1440?"ellipse(50% 50% at 50% 50%)":width===768?"inset(0px round 50% 50% 0px 0px)":"polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)");await expect(effect).toHaveCSS("opacity",width===390?"1":"0.8");await expect(page.getByRole("img",{name:"Kebu test image",exact:true})).toHaveCount(1);await expect(page.locator(`[data-kcd-node-id="${f.image}"]`)).toHaveCount(1);await expect(page.locator(`[data-kcd-transform-for="${f.image}"]`)).not.toHaveCSS("transform","none");expect(errors).toEqual([]);await page.screenshot({path:`evidence/3f/effects-public-${width}-${javaScriptEnabled?"on":"off"}.png`,fullPage:true});}finally{await context.close();}
});

for(const javaScriptEnabled of [false,true])for(const width of [1440,768,390])test(`rich: published ${width}px semantic formatting, safe links and device copy JavaScript ${javaScriptEnabled?"on":"off"}`,async({browser,baseURL})=>{
 const f=artDirectionFixture(),n=f.doc.nodes[f.text];delete n.props.href;n.props.runs=[{text:"Desktop",bold:true},{text:" story",italic:true,href:"contact"}];n.overrides.tablet!.runs=[{text:"Tablet",underline:true},{text:" story",href:"contact"}];n.overrides.mobile!.runs=[{text:"Phone",bold:true,italic:true},{text:" story",href:"contact"}];writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(f.doc)));
 const context=await browser.newContext({baseURL,javaScriptEnabled,viewport:{width,height:1000}});
 try{const page=await context.newPage(),errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await page.goto("/spatial-local-probe");const copy=width===1440?"Desktop":width===768?"Tablet":"Phone";await expect(page.getByRole("heading",{name:`${copy} story`,exact:true})).toHaveCount(1);await expect(page.getByRole("link",{name:"story",exact:true})).toHaveAttribute("href","/spatial-local-probe/contact");await expect(page.locator(`[data-kcd-appearance-for="${f.text}"] ${width===768?"u":"strong"}:visible`)).toHaveText(copy);await expect(page.locator(`[data-kcd-node-id="${f.text}"]`)).toHaveCount(1);expect(errors).toEqual([]);}finally{await context.close();}
});

for(const javaScriptEnabled of [false,true])for(const width of [1440,768,390])test(`video: published ${width}px explicit play, no preload, poster and captions JavaScript ${javaScriptEnabled?"on":"off"}`,async({browser,baseURL})=>{
 const f=videoFixture();writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(f.doc)));const context=await browser.newContext({baseURL,javaScriptEnabled,reducedMotion:"reduce",viewport:{width,height:1000}});let requests=0;
 await context.route("**/qa-video.webm",async route=>{requests++;await route.fulfill({contentType:"video/webm",body:readFileSync("tests/creative-core/fixtures/native-video.webm")});});await context.route("**/qa-captions.vtt",route=>route.fulfill({contentType:"text/vtt",body:"WEBVTT\n\n00:00.000 --> 00:00.900\nCampaign caption\n"}));
 try{const page=await context.newPage(),errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await page.goto("/spatial-local-probe");const video=page.locator("video:visible");await expect(video).toHaveAttribute("preload","none");await expect(video).toHaveAttribute("controls","");await expect(video).toHaveAttribute("poster",width===768?"/brand/favicon.png":"/brand/kebu-mark.png");await expect(video).toHaveAttribute("aria-label","Campaign video");expect(await video.evaluate(e=>(e as HTMLVideoElement).paused)).toBe(true);expect(requests).toBe(0);await expect(page.locator(`[data-kcd-node-id="${f.video}"]`)).toHaveCount(1);await expect(video.locator("track")).toHaveAttribute("srclang","en");
 await video.evaluate(e=>{(e as HTMLVideoElement).play();});await expect.poll(()=>requests).toBeGreaterThan(0);await expect.poll(()=>video.evaluate(e=>(e as HTMLVideoElement).currentTime)).toBeGreaterThan(0);expect(errors).toEqual([]);await page.screenshot({path:`evidence/3f/video-public-${width}-${javaScriptEnabled?"on":"off"}.png`,fullPage:true});}finally{await context.close();}
});

test("video: an invalid source surfaces a recoverable error",async({browser,baseURL})=>{
 const f=videoFixture();writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(f.doc)));const context=await browser.newContext({baseURL});await context.route("**/qa-video.webm",route=>route.fulfill({status:404,body:"Missing"}));
 try{const page=await context.newPage();await page.goto("/spatial-local-probe");await page.locator("video:visible").evaluate(e=>{(e as HTMLVideoElement).play().catch(()=>{});});await expect(page.getByRole("alert").filter({hasText:"This video could not be loaded"})).toBeVisible();await expect(page.getByRole("link",{name:"Open video",exact:true}).last()).toHaveAttribute("href","/qa-video.webm");}finally{await context.close();}
});

for(const family of ["hero","editorial-hero","split","text","image","gallery","video"])for(const width of [1440,768,390])test(`decompose: published ${family} ${width}px editable composition before hydration`,async({browser,baseURL})=>{
 const f=decompositionFixture(family),plan=decomposeLegacySection(f.doc,f.root),doc={...f.doc,nodes:{}};for(const node of plan.nodes)(doc.nodes as typeof f.doc.nodes)[node.id]=node;writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(doc)));const context=await browser.newContext({baseURL,javaScriptEnabled:false,viewport:{width,height:1000}});
 try{const page=await context.newPage();await page.goto("/spatial-local-probe");for(const node of plan.nodes)await expect(page.locator(`[data-kcd-node-id="${node.id}"]`)).toHaveCount(1);if(family.includes("hero")){await expect(page.getByRole("heading",{name:width===1440?"A new creative chapter":width===768?"Tablet creative chapter":"Phone creative chapter",exact:true})).toBeVisible();await expect(page.locator(`[data-kcd-canvas-for="${f.root}"]`)).toHaveCSS("min-height","700px");await expect(page.getByRole("link",{name:"Contact us",exact:true})).toHaveAttribute("href","/spatial-local-probe/contact");const media=plan.nodes.find(n=>n.props.fillContainer&&n.type==="image")!,overlay=plan.nodes.find(n=>n.props.fillContainer&&n.type==="group")!;await expect(page.locator(`[data-kcd-node-id="${media.id}"]`)).toHaveCSS("z-index","0");await expect(page.locator(`[data-kcd-node-id="${overlay.id}"]`)).toHaveCSS("z-index","1");}
 if(family==="gallery"){await expect(page.getByRole("img",{name:"First frame",exact:true})).toBeVisible();const group=plan.nodes.find(n=>n.props.layout==="grid")!;await expect(page.locator(`[data-kcd-canvas-for="${group.id}"]`)).toHaveCSS("display","grid");}
 if(family==="video")await expect(page.locator("video")).toHaveAttribute("preload","none");await expect(page.locator("[data-kcd-spatial-controls]")).toHaveCount(0);await page.screenshot({path:`evidence/3g/public-${family}-${width}.png`,fullPage:true});}finally{await context.close();}
});

for(const layout of ["featured","carousel","masonry"])test(`decompose: gallery ${layout} layout and responsive reflow`,async({browser,baseURL})=>{
 const f=decompositionFixture("gallery");f.doc.nodes[f.root].props.layout=layout;const plan=decomposeLegacySection(f.doc,f.root),doc={...f.doc,nodes:{}};for(const node of plan.nodes)(doc.nodes as typeof f.doc.nodes)[node.id]=node;writeFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE!,JSON.stringify(createKcdPublishedSnapshot(doc)));const context=await browser.newContext({baseURL,viewport:{width:1440,height:1000}});
 try{const page=await context.newPage();await page.goto("/spatial-local-probe");const group=plan.nodes.find(n=>n.props.layout===(layout==="featured"?"grid":layout))!,canvas=page.locator(`[data-kcd-canvas-for="${group.id}"]`);await expect(canvas).toHaveCSS("display",layout==="featured"?"grid":layout==="carousel"?"flex":"block");await page.setViewportSize({width:390,height:1000});if(layout==="carousel"){await expect(canvas).toHaveCSS("overflow-x","auto");expect(await canvas.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);await canvas.focus();await page.keyboard.press("ArrowRight");await expect.poll(()=>canvas.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);}if(layout==="masonry")await expect(canvas).toHaveCSS("column-count","1");if(layout==="featured"){const card=plan.nodes.find(n=>n.props.gridSpan===2)!;await expect(page.locator(`[data-kcd-node-id="${card.id}"]`)).toHaveCSS("grid-column","span 1");}}finally{await context.close();}
});
