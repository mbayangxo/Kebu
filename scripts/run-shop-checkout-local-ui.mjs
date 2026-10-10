import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, createWriteStream } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Real checkout components in Next.js; network fixtures are explicitly mocked.
// This verifies UI behavior, not signed-in authorization or provider transactions.
const root=process.cwd(), route=resolve(root,'app/checkout-local-probe'), output=resolve(root,'evidence/3j');
if(existsSync(route)) throw Error('Refusing to overwrite an existing probe route');
const config=resolve(root,'next.config.ts'), originalConfig=readFileSync(config,'utf8');
const fixtureConfig=originalConfig.replace('const nextConfig: NextConfig = {','const nextConfig: NextConfig = {\n  devIndicators: false,');
if(fixtureConfig===originalConfig)throw Error('Next.js configuration format changed');
writeFileSync(config,fixtureConfig); // Development badge only; runtime errors remain visible.
mkdirSync(route);
writeFileSync(resolve(route,'page.tsx'),`import { PublicShopOrder } from '@/app/components/create/public-shop-order';
import { PublicShopCart } from '@/app/components/create/public-shop-cart';
import { ShopOrdersPanel } from '@/app/components/shop/shop-orders-panel';
export default function Probe(){return <main style={{padding:20,maxWidth:900,margin:'auto'}}><h1>Local checkout QA — mocked network</h1><section data-testid="buyer"><PublicShopOrder subdomain="qa-shop" productId="ab000000-0000-4000-8000-000000000002" variantId="ab000000-0000-4000-8000-000000000004" productName="QA Tee" productPrice="1000 XOF" /></section><PublicShopCart subdomain="qa-shop"/><section data-testid="merchant"><ShopOrdersPanel projectId="ab000000-0000-4000-8000-000000000001"/></section></main>}`);
const log=createWriteStream(resolve(output,'checkout-ui-dev.log'));
const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:'https://skqnxyaeimvbyrmdfzvk.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_QA_SERVICE_ROLE_KEY:'',ANTHROPIC_API_KEY:''};
const server=spawn(process.execPath,[resolve(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3128'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
server.stdout.pipe(log);server.stderr.pipe(log);
const base='http://127.0.0.1:3128';
let browser;
const results=[];
try{
 let ready=false;
 for(let i=0;i<120;i++){try{const r=await fetch(base+'/checkout-local-probe');if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
 if(!ready)throw Error('Next.js checkout fixture did not start');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH??'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{localStorage.setItem('kebu_celebrated_1st_ab000000-0000-4000-8000-000000000001','1');localStorage.setItem('kebu_celebrated_2nd_ab000000-0000-4000-8000-000000000001','1');});
 const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let order={id:'gift-order',order_number:'ORD-QA',product_name:'QA Tee',price_label:'1000 XOF',quantity:1,customer_name:'Synthetic buyer',customer_phone:'221770000000',customer_note:'',return_recorded:false,payment_status:'paid',amount_xof:0,gift_card_amount_xof:1000,status:'fulfilled',created_at:'2026-10-10T00:00:00Z'};
 const patches=[];
 await page.route('**/api/projects/ab000000-0000-4000-8000-000000000001/orders',async r=>{
  if(r.request().method()==='PATCH'){const b=r.request().postDataJSON();patches.push(b);if(b.action==='refund_gift')order={...order,payment_status:'refunded'};if(b.action==='record_return')order={...order,status:'archived',return_recorded:true};await r.fulfill({json:{order}});}
  else await r.fulfill({json:{orders:[order]}});
 });
 const attempts=[];
 await page.route('**/api/sites/analytics',r=>r.fulfill({json:{ok:true}}));
 await page.route('**/api/public/sites/qa-shop/shipping-quote**',r=>r.fulfill({json:{quote:null}}));
 await page.route('**/api/public/sites/qa-shop/cart/checkout',async r=>{attempts.push(r.request().postDataJSON());await r.fulfill({json:attempts.length===1?{}:{orderId:'cart-order',message:'Paid with gift credit.',paid:true}});});
 await page.goto(base+'/checkout-local-probe');
 await page.getByTestId('buyer').getByRole('button',{name:'Add to cart',exact:true}).click();
 const openCart=()=>page.getByRole('button',{name:'Open cart (1 items)'}).click();
 const fillCart=async()=>{const cart=page.getByRole('dialog',{name:'Shopping cart'});await cart.getByPlaceholder('Your name',{exact:true}).fill('Synthetic buyer');await cart.getByPlaceholder('WhatsApp / phone (for delivery texts)',{exact:true}).fill('221770000000');return cart;};
 await openCart();let cart=await fillCart();await cart.getByRole('button',{name:'Place cart order',exact:true}).click();await cart.getByText('Network error.',{exact:true}).waitFor();
 await page.reload();await openCart();cart=await fillCart();await cart.getByRole('button',{name:'Place cart order',exact:true}).click();await cart.getByText('Paid with gift credit.',{exact:true}).waitFor();
 assert.equal(attempts.length,2);assert.equal(attempts[0].requestId,attempts[1].requestId);assert.equal(attempts[1].items[0].variantId,'ab000000-0000-4000-8000-000000000004');
 await page.screenshot({path:resolve(output,'checkout-phone-retry.png'),fullPage:true});
 results.push('Phone cart: incomplete confirmation and refresh reuse one attempt; variant preserved; gift-paid message shown');
 await page.locator('.kebu-shop-cart-panel').getByRole('button',{name:'Close',exact:true}).click();await page.setViewportSize({width:1280,height:900});
 const merchant=page.getByTestId('merchant');await merchant.getByRole('button',{name:'All',exact:true}).click();
 assert.equal(await merchant.getByRole('button',{name:'Mark fulfilled',exact:true}).isDisabled(),true);
 page.once('dialog',d=>d.accept());await merchant.getByRole('button',{name:'Refund gift credit',exact:true}).click();await merchant.getByRole('button',{name:'Restock full return',exact:true}).waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('[data-testid="merchant"]')?.textContent?.includes('refunded'));
 let dialogs=0;const confirm=d=>{dialogs++;return d.accept(d.type()==='prompt'?'return-receipt-123':undefined);};page.on('dialog',confirm);
 await merchant.getByRole('button',{name:'Restock full return',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="merchant"]')?.textContent?.includes('archived'));
 page.off('dialog',confirm);assert.equal(await merchant.getByRole('button',{name:'Full return restocked',exact:true}).isDisabled(),true);assert.equal(dialogs,2);assert.deepEqual(patches.map(p=>p.action),['refund_gift','record_return']);assert.equal(patches[1].allItemsReceivedResalable,true);
 await page.screenshot({path:resolve(output,'checkout-desktop-return.png'),fullPage:true});
 results.push('Desktop fulfilled order: gift refund and confirmed full return accessible; fulfillment controls disabled');
 const denied=await context.request.patch(base+'/api/projects/ab000000-0000-4000-8000-000000000001/orders',{data:{orderId:'gift-order',action:'record_return',allItemsReceivedResalable:true,returnReference:'receipt'}});
 assert.equal(denied.status(),401);results.push('Real merchant API rejects a request without an authenticated application session');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,results,pageErrors:errors,network:'mocked for UI journeys; real API for unauthenticated denial'},null,2));
}finally{await browser?.close();server.kill('SIGTERM');rmSync(route,{recursive:true,force:true});writeFileSync(config,originalConfig);rmSync(resolve(root,'.next/dev/types'),{recursive:true,force:true});log.end();}
