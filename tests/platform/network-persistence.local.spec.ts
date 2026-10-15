import { test, expect, type BrowserContext, type Page, type APIRequestContext } from 'playwright/test';
const owner='33333333-3333-4333-8333-333333333333',other='44444444-4444-4444-8444-444444444444';
async function session(context:BrowserContext,id=owner){
 const exp=Math.floor(Date.now()/1000)+3600;
 const token=[Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:id,exp})).toString('base64url'),'fixture'].join('.');
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:exp,expires_in:3600,token_type:'bearer',user:{id,email:'qa@example.test',app_metadata:{},user_metadata:{}}})).toString('base64url'),url:'http://127.0.0.1:38436',sameSite:'Lax'}]);
}
async function state(request:APIRequestContext){return(await request.get('http://127.0.0.1:38437/__qa/state')).json();}
async function setup(page:Page,request:APIRequestContext){
 await request.post('http://127.0.0.1:38437/__qa/reset');await session(page.context());await page.goto('/network/join');await expect(page.getByRole('link',{name:'Hi, qa',exact:true})).toBeVisible();
 await page.getByLabel('Full name',{exact:true}).fill('Awa Ndiaye');await page.getByLabel('City, Country',{exact:true}).fill('Dakar, Senegal');await page.getByLabel('Country (for filtering)',{exact:true}).fill('Senegal');
 await page.getByLabel('Sector',{exact:true}).selectOption('Creative economy');await page.getByLabel('One-line headline',{exact:true}).fill('Building a creative studio');await page.locator('#network-building').fill('A studio for local founders');await page.locator('#network-offering').fill('Design services');await page.getByRole('button',{name:'Partner',exact:true}).click();await page.getByLabel('Business stage',{exact:true}).selectOption('Idea');await page.getByLabel('Languages spoken',{exact:true}).fill('Wolof, French');
}
for(const width of [1440,390])test(`pending submission freezes every field and confirmed profile survives directory reload at ${width}px`,async({page,request})=>{
 await page.setViewportSize({width,height:900});await setup(page,request);
 let release!:()=>void;const gate=new Promise<void>(done=>release=done);let started=false;
 await page.route('**/api/network/profiles',async route=>{if(route.request().method()==='POST'){started=true;await gate;}await route.continue();});
 await page.getByRole('button',{name:'Join the network →',exact:true}).click();await expect.poll(()=>started).toBe(true);
 try{
  for(const id of ['name','location','country','languages','sector','headline','building','stage','offering'])await expect(page.locator('#network-'+id)).toBeDisabled();
  await expect(page.getByRole('button',{name:'Partner',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Adding you to the network...',exact:true})).toBeDisabled();
 }finally{release();}
 await expect(page.getByRole('heading',{name:"You're in the network",exact:true})).toBeVisible();
 const rows=(await state(request)).profiles;expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({name:'Awa Ndiaye',user_id:owner,languages:['Wolof','French'],looking_for:['Partner']});
 await page.getByRole('button',{name:'View the network →',exact:true}).click();await expect(page.getByRole('heading',{name:'Awa Ndiaye',exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'Awa Ndiaye',exact:true})).toBeVisible();
 await page.getByRole('textbox',{name:'Search members'}).fill('does-not-exist');await expect(page.getByRole('heading',{name:'Awa Ndiaye',exact:true})).toHaveCount(0);await page.getByRole('textbox',{name:'Search members'}).fill('creative studio');await expect(page.getByRole('heading',{name:'Awa Ndiaye',exact:true})).toBeVisible();
 const directory=await page.request.get('/api/network/profiles');const profile=(await directory.json()).profiles[0];expect(profile).not.toHaveProperty('user_id');expect(profile).not.toHaveProperty('is_verified');expect(profile).not.toHaveProperty('contact_count');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:test.info().outputPath(`network-${width}.png`),fullPage:true});
});
test('lost response retry confirms one SQL row and preserves the submitted draft',async({page,request})=>{
 await setup(page,request);let first=true;const ids:string[]=[];
 await page.route('**/api/network/profiles',async route=>{if(route.request().method()==='POST'){ids.push(route.request().postDataJSON().submission_id);if(first){first=false;await route.fetch();await route.abort('failed');return;}}await route.continue();});
 await page.getByRole('button',{name:'Join the network →',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'confirmed saved'})).toContainText('not confirmed saved');await expect(page.getByLabel('Full name',{exact:true})).toBeEnabled();await expect(page.getByLabel('Full name',{exact:true})).toHaveValue('Awa Ndiaye');expect((await state(request)).profiles).toHaveLength(1);
 await page.getByRole('button',{name:'Join the network →',exact:true}).click();await expect(page.getByRole('heading',{name:"You're in the network",exact:true})).toBeVisible();expect(ids).toHaveLength(2);expect(ids[0]).toBe(ids[1]);expect((await state(request)).profiles).toHaveLength(1);
});
test('API rejects wrong-owner retries and anonymous access without exposing identity fields',async({page,request,browser})=>{
 await setup(page,request);let submitted:Record<string,unknown>={};await page.route('**/api/network/profiles',async route=>{if(route.request().method()==='POST')submitted=route.request().postDataJSON();await route.continue();});await page.getByRole('button',{name:'Join the network →',exact:true}).click();await expect(page.getByRole('heading',{name:"You're in the network",exact:true})).toBeVisible();
 const second=await browser.newContext();const anonymous=await browser.newContext();try{
  await session(second,other);const response=await second.request.post('http://127.0.0.1:38436/api/network/profiles',{data:submitted});expect(response.status()).toBe(503);expect((await state(request)).profiles).toHaveLength(1);
  expect((await second.request.post('http://127.0.0.1:38436/api/network/profiles',{data:{...submitted,user_id:owner}})).status()).toBe(400);
  expect((await anonymous.request.get('http://127.0.0.1:38436/api/network/profiles')).status()).toBe(401);
  expect((await anonymous.request.post('http://127.0.0.1:38436/api/network/profiles',{data:submitted})).status()).toBe(401);
 }finally{await second.close();await anonymous.close();}
});
