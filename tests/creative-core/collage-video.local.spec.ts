import { test, expect, type Page, type Route } from 'playwright/test';
import { readFileSync } from 'node:fs';
test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== '1','Controlled local media fixture; not hosted release acceptance.');
const bytes=readFileSync('tests/creative-core/fixtures/scroll-video.webm');
async function serveVideo(route: Route) {
  const range=route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
  const start=range?Number(range[1]):0, end=range&&range[2]?Math.min(Number(range[2]),bytes.length-1):bytes.length-1;
  const body=bytes.subarray(start,end+1);
  await route.fulfill({status:range?206:200,contentType:'video/webm',headers:{'Accept-Ranges':'bytes','Content-Length':String(body.length),...(range?{'Content-Range':`bytes ${start}-${end}/${bytes.length}`}:{})},body});
}
async function create(page: Page,mode='scrub',seekable=true) {
  await page.route('**/qa-native-video.webm',seekable?serveVideo:route=>route.fulfill({status:200,contentType:'video/webm',body:bytes}));
  await page.goto('/video-scene-local-probe');
  await expect(page.getByTestId('video-fixture-ready')).toHaveAttribute('data-ready','true');
  await page.getByText('Video layers',{exact:true}).click();
  await page.getByRole('button',{name:'Add video layer',exact:true}).click();
  const src=page.getByLabel('Video file address',{exact:true});await src.fill('/qa-native-video.webm');await src.press('Tab');
  await page.getByLabel('Video playback',{exact:true}).selectOption(mode);
  await page.getByLabel('Video horizontal travel (px)',{exact:true}).fill('160');
  await page.getByLabel('Video vertical travel (px)',{exact:true}).fill('0');
  await page.getByLabel('Video page link',{exact:true}).fill('/music');await page.getByLabel('Video page link',{exact:true}).press('Tab');
  await page.getByRole('button',{name:'Save local fixture',exact:true}).click();
  await page.getByRole('button',{name:'Preview video scene',exact:true}).click();
  await page.mouse.move(10,100);await page.mouse.wheel(0,-5000);
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
}

test('real media frames follow scrolling and geometry, then a linked video opens another themed page',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await create(page);
  const film=page.locator('video[aria-label="Video"]');
  await expect.poll(()=>film.evaluate(el=>(el as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
  const figure=page.locator('[data-collage-video]');
  const start=await figure.evaluate(el=>getComputedStyle(el).transform);
  await page.mouse.move(1100,700);await page.mouse.wheel(0,500);
  await expect.poll(()=>figure.evaluate(el=>getComputedStyle(el).transform)).not.toBe(start);
  await expect.poll(()=>film.evaluate(el=>(el as HTMLVideoElement).currentTime)).toBeGreaterThan(.15);
  expect(await film.evaluate(el=>(el as HTMLVideoElement).paused)).toBe(true);
  await expect.poll(()=>film.evaluate(el=>(el as HTMLVideoElement).seeking)).toBe(false);
  const later=await film.evaluate(el=>(el as HTMLVideoElement).currentTime);
  await page.mouse.wheel(0,-150);
  await expect.poll(()=>film.evaluate(el=>(el as HTMLVideoElement).currentTime)).toBeLessThan(later);
  await expect(page.getByRole('link',{name:'Explore this story',exact:true})).toHaveAttribute('href','/video-scene-local-probe/music');
  await page.screenshot({path:'evidence/3c/s5/scrolling-video.png'});
  await page.getByRole('link',{name:'Explore this story',exact:true}).click();
  await expect(page).toHaveURL(/\/video-scene-local-probe\/music$/);
  await expect(page.getByTestId('fixture-page')).toHaveText('music');
  await expect(page.getByTestId('video-fixture-ready')).toHaveAttribute('data-ready','true');
  await page.getByRole('button',{name:'Load local fixture',exact:true}).click();
  await page.getByRole('button',{name:'Preview video scene',exact:true}).click();
  await expect(page.locator('[data-collage-video]')).toHaveCount(1);
});

test('silent loop plays, can be paused, and stops when outside the viewport',async({page})=>{
  await create(page,'loop');
  const film=page.locator('video[aria-label="Video"]');
  await expect.poll(()=>film.evaluate(el=>(el as HTMLVideoElement).paused)).toBe(false);
  expect(await film.evaluate(el=>(el as HTMLVideoElement).muted)).toBe(true);
  await page.getByRole('button',{name:'Pause video',exact:true}).click();
  await expect.poll(()=>film.evaluate(el=>(el as HTMLVideoElement).paused)).toBe(true);
  await page.getByRole('button',{name:'Play video',exact:true}).click();
  await expect.poll(()=>film.evaluate(el=>(el as HTMLVideoElement).paused)).toBe(false);
  await page.mouse.wheel(0,2400);
  await expect.poll(()=>film.evaluate(el=>(el as HTMLVideoElement).paused)).toBe(true);
});

test('phone reduced motion keeps a manually playable still composition after save and reload',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await create(page,'loop');await page.reload();
  await expect(page.getByTestId('video-fixture-ready')).toHaveAttribute('data-ready','true');
  await page.getByRole('button',{name:'Load local fixture',exact:true}).click();await page.getByRole('button',{name:'Preview video scene',exact:true}).click();
  const film=page.locator('video[aria-label="Video"]');
  await expect.poll(()=>film.evaluate(el=>(el as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1);
  expect(await film.evaluate(el=>(el as HTMLVideoElement).paused)).toBe(true);
  expect(await film.evaluate(el=>(el as HTMLVideoElement).controls)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'evidence/3c/s5/video-phone-reduced-motion.png'});
});

test('a failed file shows a real retry and preserves its saved page link',async({page})=>{
  let fails=true;await page.route('**/qa-native-video.webm',route=>fails?route.abort():serveVideo(route));
  await page.goto('/video-scene-local-probe');
  await expect(page.getByTestId('video-fixture-ready')).toHaveAttribute('data-ready','true');await page.getByText('Video layers',{exact:true}).click();
  await page.getByRole('button',{name:'Add video layer',exact:true}).click();
  await page.getByLabel('Video file address',{exact:true}).fill('/qa-native-video.webm');await page.getByLabel('Video file address',{exact:true}).press('Tab');
  await page.getByRole('button',{name:'Preview video scene',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Video could not be loaded.'})).toBeVisible();
  fails=false;await page.getByRole('button',{name:'Retry video',exact:true}).click();
  await expect.poll(()=>page.locator('video[aria-label="Video"]').evaluate(el=>(el as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1);
  await expect(page.getByText('Video could not be loaded.',{exact:false})).toHaveCount(0);
});

test('a host without seek support exposes the real limitation and usable manual controls',async({page})=>{
  await create(page,'scrub',false);
  await expect(page.getByText('This video cannot follow scrolling.',{exact:false})).toBeVisible();
  expect(await page.locator('video[aria-label="Video"]').evaluate(el=>(el as HTMLVideoElement).controls)).toBe(true);
});
