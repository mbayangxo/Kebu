import { test, expect, type BrowserContext, type Page, type APIRequestContext } from "playwright/test";
const owner = "33333333-3333-4333-8333-333333333333", other = "44444444-4444-4444-8444-444444444444";
async function session(context: BrowserContext, id = owner) {
  const exp = Math.floor(Date.now()/1000)+3600;
  const token = [Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:id,exp})).toString('base64url'),'fixture'].join('.');
  await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:exp,expires_in:3600,token_type:'bearer',user:{id,email:'qa@example.test',app_metadata:{},user_metadata:{}}})).toString('base64url'),url:'http://127.0.0.1:38426',sameSite:'Lax'}]);
}
async function state(request: APIRequestContext) { return (await request.get('http://127.0.0.1:38427/__qa/state')).json(); }
async function setup(page: Page, request: APIRequestContext) {
  await request.post('http://127.0.0.1:38427/__qa/reset'); await session(page.context());
  const errors: string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/library?view=documents');await expect(page.getByRole('button',{name:'+ New document',exact:true})).toBeEnabled();return errors;
}
async function create(page: Page, title='My document', text='Initial text') {
  await page.getByRole('button',{name:'+ New document',exact:true}).click();
  await page.getByLabel('Document title',{exact:true}).fill(title);await page.getByLabel('New document text',{exact:true}).fill(text);
  await page.getByRole('button',{name:'Create',exact:true}).click();await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await expect(page.getByLabel('Document text',{exact:true})).toHaveValue(text);
}
test('create, edit without blur, SQL persistence and reload on mobile',async({page,request})=>{
  await page.setViewportSize({width:390,height:844});const errors=await setup(page,request);await create(page);
  await page.getByLabel('Document text',{exact:true}).fill('Newest mobile text');
  await expect.poll(async()=>((await state(request)).items[0]?.body)).toBe('Newest mobile text');
  await page.reload();await page.getByRole('button',{name:/My document/}).click();await expect(page.getByLabel('Document text',{exact:true})).toHaveValue('Newest mobile text');expect(errors).toEqual([]);await page.screenshot({path:test.info().outputPath("library-mobile.png"),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('delayed saves preserve newer typing and serialize their revisions',async({page,request})=>{
  const errors=await setup(page,request);await create(page);
  let release!:()=>void;const gate=new Promise<void>(done=>release=done);const writes:Record<string,unknown>[]=[];
  await page.route('**/api/work/items',async route=>{if(route.request().method()!=='PATCH'){await route.continue();return;}writes.push(route.request().postDataJSON());if(writes.length===1)await gate;await route.continue();});
  await page.getByLabel('Document text',{exact:true}).fill('First text');await expect.poll(()=>writes.length).toBe(1);
  await page.getByLabel('Document text',{exact:true}).fill('Latest text');await page.waitForTimeout(1100);expect(writes).toHaveLength(1);release();
  await expect.poll(async()=>((await state(request)).items[0]?.body)).toBe('Latest text');expect(writes).toHaveLength(2);expect(writes[0]?.expectedUpdatedAt).not.toBe(writes[1]?.expectedUpdatedAt);expect(errors).toEqual([]);
});
test('a second session conflict keeps local text until an explicit choice',async({page,browser,request})=>{
  const errors=await setup(page,request);await create(page);
  const second=await browser.newContext();try{await session(second);const remote=await second.request.get('http://127.0.0.1:38426/api/work/items?kind=doc&personal=1');const row=(await remote.json()).items[0];
  expect((await second.request.patch('http://127.0.0.1:38426/api/work/items',{data:{id:row.id,body:'Changed elsewhere',expectedUpdatedAt:row.updated_at}})).status()).toBe(200);
  await page.getByLabel('Document text',{exact:true}).fill('Keep local');await expect(page.getByRole('button',{name:'Keep my text'})).toBeVisible();
  await expect(page.getByLabel('Document text',{exact:true})).toHaveValue('Keep local');expect((await state(request)).items[0].body).toBe('Changed elsewhere');
  await page.getByRole('button',{name:'Keep my text'}).click();await expect.poll(async()=>((await state(request)).items[0]?.body)).toBe('Keep local');expect(errors).toEqual([]);
  }finally{await second.close();}
});
test('wrong owner and unauthenticated access are refused by API and SQL policies',async({page,browser,request})=>{
  await setup(page,request);await create(page);const row=(await state(request)).items[0];
  const stranger=await browser.newContext();try{await session(stranger,other);
  const list=await stranger.request.get('http://127.0.0.1:38426/api/work/items?kind=doc&personal=1');expect((await list.json()).items).toEqual([]);
  expect((await stranger.request.patch('http://127.0.0.1:38426/api/work/items',{data:{id:row.id,body:'Unauthorized',expectedUpdatedAt:row.updated_at}})).status()).toBe(404);
  expect((await stranger.request.delete(`http://127.0.0.1:38426/api/work/items?id=${row.id}`)).status()).toBe(409);
  expect((await state(request)).items[0].body).toBe('Initial text');}finally{await stranger.close();}
  const anon=await browser.newContext();try{expect((await anon.request.get('http://127.0.0.1:38426/api/work/items?kind=doc')).status()).toBe(401);}finally{await anon.close();}
});
test('lost creation response retries the same UUID without making duplicate rows',async({page,request})=>{
  const errors=await setup(page,request);let first=true;
  await page.route('**/api/work/items',async route=>{if(route.request().method()==='POST'&&first){first=false;await route.fetch();await route.abort('failed');return;}await route.continue();});
  await page.getByRole('button',{name:'+ New document',exact:true}).click();await page.getByLabel('Document title',{exact:true}).fill('Retry document');await page.getByLabel('New document text',{exact:true}).fill('Retained text');await page.getByRole('button',{name:'Create',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Creation failed'})).toBeVisible();await expect(page.getByRole('button',{name:'Create',exact:true})).toBeEnabled();
  expect((await state(request)).items).toHaveLength(1);await page.getByRole('button',{name:'Create',exact:true}).click();await expect(page.getByRole('heading',{name:'Retry document'})).toBeVisible();expect((await state(request)).items).toHaveLength(1);expect(errors).toEqual([]);
});
test('offline text is recovered after reload without overwriting a newer server version',async({page,browser,request})=>{
  const errors=await setup(page,request);await create(page);const row=(await state(request)).items[0];
  await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}));await page.getByLabel('Document text',{exact:true}).fill('Recovered text');
  await expect(page.getByRole('status').filter({hasText:'Saved on this device'})).toBeVisible();
  const second=await browser.newContext();try{await session(second);expect((await second.request.patch('http://127.0.0.1:38426/api/work/items',{data:{id:row.id,body:'New server text',expectedUpdatedAt:row.updated_at}})).status()).toBe(200);}finally{await second.close();}
  await page.reload();await page.getByRole('button',{name:/My document/}).click();await expect(page.getByLabel('Document text',{exact:true})).toHaveValue('Recovered text');await expect(page.getByRole('button',{name:'Use saved text'})).toBeVisible();
  await page.getByRole('button',{name:'Use saved text'}).click();await expect(page.getByLabel('Document text',{exact:true})).toHaveValue('New server text');expect(errors).toEqual([]);
});
test('a failed deletion keeps the document and retry confirms SQL removal',async({page,request})=>{
  const errors=await setup(page,request);await create(page);page.on('dialog',dialog=>dialog.accept());let denied=true;
  await page.route('**/api/work/items?*',async route=>{if(route.request().method()==='DELETE'&&denied){denied=false;await route.fulfill({status:503,json:{error:'Temporary deletion failure'}});return;}await route.continue();});
  await page.getByRole('button',{name:'Delete document'}).click();await expect(page.getByRole('alert').filter({hasText:'Temporary deletion failure'})).toBeVisible();await expect(page.getByLabel('Document text',{exact:true})).toHaveValue('Initial text');expect((await state(request)).items).toHaveLength(1);
  await page.getByRole('button',{name:'Delete document'}).click();await expect.poll(async()=>((await state(request)).items.length)).toBe(0);await expect(page.getByText('No documents yet.',{exact:true})).toBeVisible();expect(errors).toEqual([]);
});

test('Calendar retry keeps details and creates one persisted event on mobile',async({page,request})=>{
  await request.post('http://127.0.0.1:38427/__qa/reset');await session(page.context());await page.setViewportSize({width:390,height:844});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/calendar');await page.getByLabel('Event title',{exact:true}).fill('Local calendar event');await page.getByLabel('Event notes',{exact:true}).fill('Keep these details');let first=true;
  await page.route('**/api/work/items',async route=>{if(route.request().method()==='POST'&&first){first=false;await route.fetch();await route.abort('failed');return;}await route.continue();});
  await page.getByRole('button',{name:'Add event →',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Could not add event'})).toBeVisible();await expect(page.getByLabel('Event title',{exact:true})).toHaveValue('Local calendar event');await expect(page.getByRole('button',{name:'Add event →',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Add event →',exact:true}).click();await expect(page.getByLabel('Event title',{exact:true})).toHaveValue('');expect((await state(request)).items).toHaveLength(1);await page.reload();await expect(page.getByRole('article').filter({hasText:'Local calendar event'})).toBeVisible();await page.screenshot({path:test.info().outputPath('calendar-mobile.png'),fullPage:true});expect(errors).toEqual([]);
});
test('Tasks completion and deletion failures preserve server state and allow retry',async({page,request})=>{
  await request.post('http://127.0.0.1:38427/__qa/reset');await session(page.context());const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/tasks');
  await page.getByRole('button',{name:'+ New task',exact:true}).click();await page.getByPlaceholder('Name this task').fill('Real task');await page.getByRole('button',{name:'Create',exact:true}).click();await expect(page.getByRole('heading',{name:'Real task',exact:true})).toBeVisible();
  let firstPatch=true;await page.route('**/api/work/items',async route=>{if(route.request().method()==='PATCH'&&firstPatch){firstPatch=false;await route.abort('failed');return;}await route.continue();});
  const checkbox=page.getByRole('checkbox',{name:'Complete Real task'});await checkbox.click();await expect(page.getByRole('alert').filter({hasText:'Could not save'})).toBeVisible();await expect(checkbox).not.toBeChecked();expect((await state(request)).items[0].status).toBe('open');
  await checkbox.focus();await page.keyboard.press('Space');await expect(checkbox).toBeChecked();expect((await state(request)).items[0].status).toBe('done');await page.screenshot({path:test.info().outputPath('tasks-desktop.png'),fullPage:true});page.on('dialog',dialog=>dialog.accept());let firstDelete=true;
  await page.route('**/api/work/items?*',async route=>{if(route.request().method()==='DELETE'&&firstDelete){firstDelete=false;await route.fulfill({status:503,json:{error:'Keep task on failure'}});return;}await route.continue();});
  await page.getByRole('button',{name:'Delete',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Keep task on failure'})).toBeVisible();await expect(page.getByRole('heading',{name:'Real task',exact:true})).toBeVisible();await page.getByRole('button',{name:'Delete',exact:true}).click();await expect.poll(async()=>((await state(request)).items.length)).toBe(0);expect(errors).toEqual([]);
});

test('device storage failure while offline preserves the editor and never claims a device save',async({page,request})=>{
  const errors=await setup(page,request);await create(page);
  await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});Storage.prototype.setItem=function(){throw new DOMException('Fixture quota','QuotaExceededError');};});
  await page.getByLabel('Document text',{exact:true}).fill('Keep uncached text');
  await expect(page.getByRole('status').filter({hasText:'Save failed'})).toBeVisible();await expect(page.getByRole('alert').filter({hasText:'Device storage failed'})).toBeVisible();await expect(page.getByLabel('Document text',{exact:true})).toHaveValue('Keep uncached text');
  expect((await state(request)).items[0].body).toBe('Initial text');expect(errors).toEqual([]);
});
