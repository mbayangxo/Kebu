/** Viewport pixel checks complement full-page captures, which can omit offscreen composited images. */
import {test,expect} from "playwright/test";
import {writeFileSync} from "node:fs";
test.skip(process.env.KEBU_LOCAL_OPERATION_UI!=="1"||!process.env.MAY_LOCAL_VALIDATE,"Requires the published private May candidate in the isolated harness");
for(const width of [1440,390])test(`notebook portraits actually paint at ${width}px`,async({browser,baseURL})=>{
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:"reduce",extraHTTPHeaders:{"x-kebu-is-public-site":"1"}});
  try{
    const page=await context.newPage();
    await page.goto(`${baseURL}/s7-local-probe/photos`,{waitUntil:"networkidle"});
    const results=[];
    for(const id of ['memory-photo-0','memory-photo-1']){
      const image=page.locator(`[data-kebu-layer="${id}"] img`);
      await image.evaluate(el=>el.scrollIntoView({block:"center"}));
      await expect(image).toBeVisible();
      await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0)).toBe(true);
      // A blank paper frame compresses to a tiny JPEG; the loaded portrait must produce image pixels.
      const pixels=await image.screenshot({type:"jpeg",quality:80,path:test.info().outputPath(`${id}-${width}.jpg`)});
      expect(pixels.byteLength).toBeGreaterThan(4000);
      await page.screenshot({path:test.info().outputPath(`${id}-viewport-${width}.png`)});
      results.push({id,jpegBytes:pixels.byteLength});
    }
    writeFileSync(test.info().outputPath('paint-results.json'),JSON.stringify(results,null,2));
  }finally{await context.close();}
});
