/** Optional private candidate: actual Builder → canonical SQL → saved public snapshot. */
import { test, expect } from "playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { websiteV1ToDocument, documentToRows } from "../../lib/create/kcd-adapter";
import { openBuilderSqlBridge } from "./fixtures/builder-sql-bridge";
import { owner, projectId } from "./fixtures/3j-database";
import type { Op, NodeId, PageId } from "../../lib/creative-core";
import {maylecorAboutMayBlocks} from "../../lib/create/maylecor-about-bio";

test.skip(!process.env.MAY_LOCAL_VALIDATE || process.env.KEBU_LOCAL_OPERATION_UI !== "1", "Requires the private recovered May candidate; never embeds it in source.");
for (const width of [1440, 390]) test(`May candidate: every page edits, persists and renders at ${width}px`, async ({page, browser, baseURL}) => {
  test.setTimeout(420000);
  const definition=JSON.parse(readFileSync(process.env.MAY_LOCAL_VALIDATE!,"utf8"));
  const candidate=websiteV1ToDocument(definition,{id:projectId}).document;
  const authority=await openBuilderSqlBridge(page,async server=>{
    const initial=server.current(), home=initial.pages[0];
    const ids=new Map<string,string>([...candidate.pages.map(p=>[p.id,crypto.randomUUID()] as const),...Object.values(candidate.nodes).map(n=>[n.id,crypto.randomUUID()] as const)]);
    ids.set(candidate.pages[0].id,home.id);
    candidate.pages=candidate.pages.map(p=>({...p,id:ids.get(p.id)! as PageId}));
    candidate.nodes=Object.fromEntries(Object.values(candidate.nodes).map(n=>{const mapped={...n,id:ids.get(n.id)! as NodeId,pageId:ids.get(n.pageId)! as PageId,parentId:n.parentId?ids.get(n.parentId)! as NodeId:null};return[mapped.id,mapped];}));
    const mapped=home.id;
    const ops:Op[]=[{op:"updatePage",pageId:home.id,title:candidate.pages[0].title},{op:"movePage",pageId:home.id,orderKey:candidate.pages[0].orderKey}];
    for(const p of candidate.pages.slice(1)){const {layoutVersion: _version,...rest}=p; void _version;ops.push({op:"insertPage",page:rest});}
    for(const n of Object.values(candidate.nodes)){const {version: _version,pageId: target,parentId,orderKey,...node}=n;void _version;ops.push({op:"insertNode",node,pageId:target===mapped?home.id:target,parentId,orderKey});}
    await server.apply({txId:crypto.randomUUID(),origin:"user",label:"Import recovered May candidate",expect:{[home.id]:home.layoutVersion},ops});
    const rows=documentToRows(candidate);
    await server.queryAs("postgres",owner,"update projects set theme=$1,seo=$2 where id=$3",[rows.project.theme,rows.project.seo??{},projectId]);
    await server.read();
  });
  const {server}=authority;
  try{
    await page.setViewportSize({width,height:1000});
    for(const p of server.current().pages){
      await page.goto(`/create/${projectId}`);
      if(width<640){await page.getByRole("button",{name:"Phone",exact:true}).first().click();await page.getByRole("button",{name:"Build",exact:true}).first().click();}
      await page.getByRole("combobox",{name:"Editing page",exact:true}).selectOption(p.id);
      await page.getByRole("button",{name:"Edit section",exact:true}).first().click();
      await page.getByText("Scene text",{exact:true}).click();
      if(p.slug==="home")await page.getByRole("button",{name:"Add scene text",exact:true}).click();
      const field=page.getByLabel("Scene text content",{exact:true});
      const original=p.slug==="home"?"MAY LÈCOR":await field.inputValue(), next=`${original} `;
      await field.fill(next);
      const node=Object.values(server.current().nodes).find(n=>n.pageId===p.id&&n.type==="legacy-section:legally-blonde-hero"&&(p.slug==="home"?n.props.showNavigation!==false:n.props.title===p.title))!;
      const saved=()=>{const n=server.current().nodes[node.id];return (width<640?n.overrides.mobile?.extraCutouts:n.props.extraCutouts) as {kind?:string;text?:string}[]|undefined;};
      await expect.poll(()=>saved()?.find(c=>c.kind==="text")?.text).toBe(next);
      await field.fill(original);
      await expect.poll(()=>saved()?.find(c=>c.kind==="text")?.text).toBe(original);
      await expect(page.getByText("Draft saved",{exact:true}).first()).toBeVisible();
      await page.reload();
      const restored=(await server.read()).nodes[node.id];
      expect(((width<640?restored.overrides.mobile?.extraCutouts:restored.props.extraCutouts) as {kind?:string;text?:string}[])?.find(c=>c.kind==="text")?.text).toBe(original);
      if(width<640){await page.getByRole("button",{name:"Phone",exact:true}).first().click();await page.getByRole("button",{name:"Build",exact:true}).first().click();}
      await page.getByRole("combobox",{name:"Editing page",exact:true}).selectOption(p.id);
      await page.getByRole("button",{name:"Edit section",exact:true}).first().click();
      await page.getByText("Scene text",{exact:true}).click();
      await expect(page.getByLabel("Scene text content",{exact:true})).toHaveValue(original);
      console.log("MAY_PAGE_SAVED",width,p.slug);
    }
    expect(authority.legacyWrites).toEqual([]);
    const published=await server.publish();
    writeFileSync(process.env.KEBU_LOCAL_S7_SNAPSHOT_FILE!,JSON.stringify(published));
    const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,reducedMotion:"reduce",extraHTTPHeaders:{"x-kebu-is-public-site":"1"}});
    const visitor=await context.newPage();
    const results=[];
    for(const p of candidate.pages){
      await visitor.emulateMedia({reducedMotion:"reduce"});
      const response=await visitor.goto(`${baseURL}/s7-local-probe/${p.slug}`);
      expect(response?.status()).toBe(200);
      await expect(visitor.locator('[data-may-celebration]')).toHaveAttribute('data-may-celebration',p.slug);
      await expect(visitor.locator('[data-may-celebration]')).toBeHidden();
      if(p.slug==='about'){
        const text=(await visitor.locator('body').innerText()).replace(/\s+/g,' ');
        for(const block of maylecorAboutMayBlocks())expect(text).toContain(block.body.replace(/\s+/g,' '));
      }
      if(p.slug==='mayjor-good'&&process.env.MAY_ARTIST_MEDIA==='1')await expect(visitor.getByRole('button',{name:'Send foundation enquiry',exact:true})).toBeVisible();
      await visitor.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,50));}});
      await visitor.evaluate(()=>window.scrollTo(0,0));
      await expect.poll(()=>visitor.locator("img").evaluateAll(images=>images.filter(i=>!(i as HTMLImageElement).complete||(i as HTMLImageElement).naturalWidth===0).map(i=>i.getAttribute("src")))).toEqual([]);
      const links=await visitor.locator("a[href]").evaluateAll(anchors=>anchors.map(a=>({href:a.getAttribute("href"),text:a.textContent})));
      expect(links.filter(l=>!l.href||l.href==="#")).toEqual([]);
      for(const link of links){if(link.href?.startsWith("/s7-local-probe/")){const slug=link.href.split("/")[2].split(/[?#]/)[0];expect(candidate.pages.some(p=>p.slug===slug)).toBe(true);}}
      const overflow=await visitor.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      expect(overflow).toBe(false);
      if(process.env.MAY_ARTIST_MEDIA==="1"&&['music','audio','videos'].includes(p.slug)){
        const player=visitor.locator(p.slug==='videos'?'video[controls]':'audio[controls]').first();
        await expect(player).toBeVisible();
        await expect.poll(()=>player.evaluate(el=>(el as HTMLMediaElement).duration)).toBeGreaterThan(15);
        await expect(player).toHaveAttribute('src',/yaw-laa-taan-preview/);
        await player.click();
        await player.evaluate(el=>(el as HTMLMediaElement).play());
        await expect.poll(()=>player.evaluate(el=>(el as HTMLMediaElement).currentTime)).toBeGreaterThan(.1);
        await player.evaluate(el=>{(el as HTMLMediaElement).currentTime=3;});
        await expect.poll(()=>player.evaluate(el=>(el as HTMLMediaElement).currentTime)).toBeGreaterThanOrEqual(3);
        await player.evaluate(el=>(el as HTMLMediaElement).pause());
        expect(await player.evaluate(el=>(el as HTMLMediaElement).paused)).toBe(true);
      }
      await visitor.screenshot({path:test.info().outputPath(`${p.slug}-${width}.png`),fullPage:true});
      const media=await visitor.locator('[data-kebu-layer] img').evaluateAll(images=>images.map(el=>{const img=el as HTMLImageElement,rect=img.getBoundingClientRect();return{src:img.src,width:rect.width,height:rect.height,visibility:getComputedStyle(img).visibility};}));
      expect(media.every(img=>img.width>0&&img.height>0&&img.visibility!=="hidden")).toBe(true);
      await visitor.emulateMedia({reducedMotion:"no-preference"});
      await expect(visitor.locator('[data-may-celebration]')).toBeVisible();
      if(width>600)expect(await visitor.locator('[data-kebu-aesthetic="may-reference"]').evaluate(el=>getComputedStyle(el).cursor)).toContain('data:image/svg+xml');
      const moving=visitor.locator(p.slug==="home"?'[data-kebu-source="cutoutAccent"]':'[data-collage-text]').first();
      await visitor.evaluate(()=>window.scrollTo(0,0));
      const before=await moving.evaluate(el=>(el as HTMLElement).style.transform);
      await visitor.evaluate(()=>window.scrollTo(0,500));
      await expect.poll(()=>moving.evaluate(el=>(el as HTMLElement).style.transform)).not.toBe(before);
      await visitor.evaluate(()=>window.scrollTo(0,0));
      const target=p.slug==="contact"?"home":"contact", href=target==="home"?"/s7-local-probe":`/s7-local-probe/${target}`;
      const link=visitor.locator(`a[href="${href}"]`).filter({visible:true}).first();
      if(!(await link.count())){const menu=visitor.getByRole("button",{name:"Menu",exact:true});if(await menu.isVisible())await menu.click();}
      await link.click();await expect(visitor).toHaveURL(`${baseURL}${href}`);
      results.push({slug:p.slug,status:response?.status(),links:links.length,overflow,motion:true,clicked:target,media});
    }
    writeFileSync(test.info().outputPath("page-results.json"),JSON.stringify(results,null,2));
    await context.close();
  }finally{await server.close();}
});
