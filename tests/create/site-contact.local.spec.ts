import { test, expect, type BrowserContext, type APIRequestContext } from "playwright/test";
test.skip(process.env.KEBU_CONTACT_LOCAL !== "1", "Isolated SQL/loopback Auth contact gate only.");
const project = "11111111-1111-4111-8111-111111111111", form = "77777777-7777-4777-8777-777777777777";
const owner = "33333333-3333-4333-8333-333333333333", other = "44444444-4444-4444-8444-444444444444";
async function session(context: BrowserContext, id = owner) {
  const exp = Math.floor(Date.now()/1000)+3600;
  const token = [Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:id,exp})).toString('base64url'),'fixture'].join('.');
  await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:exp,expires_in:3600,token_type:'bearer',user:{id,email:'owner@example.test',app_metadata:{},user_metadata:{}}})).toString('base64url'),url:'http://127.0.0.1:38436',sameSite:'Lax'}]);
}
async function state(request: APIRequestContext) { return (await request.get("http://127.0.0.1:38437/__state")).json(); }
async function reset(request: APIRequestContext) { await request.post("http://127.0.0.1:38437/__reset"); }
async function submit(request: APIRequestContext, message = "Booking enquiry — local QA") {
  return request.post(`/api/public/sites/may-local/forms/${form}/submit`, { data: { values: { name:"Contact QA",email:"visitor@example.test",message } } });
}

test("real visitor form → API → SQL → private owner inbox survives reload", async ({page,request}) => {
  await reset(request); const errors: string[]=[]; page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/contact-local-probe");
  await page.getByLabel("Your name").fill("Contact QA"); await page.getByLabel("Email",{exact:false}).fill("visitor@example.test"); await page.getByLabel("Message",{exact:false}).fill("Booking enquiry — local QA");
  await page.getByRole("button",{name:"Send",exact:true}).click();
  await expect(page.getByRole("status").filter({hasText:"Thanks"})).toBeVisible();
  expect((await state(request)).rows).toHaveLength(1);
  await session(page.context()); await page.goto(`/create/${project}/messages`);
  await expect(page.getByRole("heading",{name:"Contact QA",exact:true})).toBeVisible();
  await expect(page.getByRole("article")).toContainText("Booking enquiry — local QA");
  await expect(page.getByRole("link",{name:"Reply in Kebu Mail"})).toHaveAttribute("href", /composeTo=visitor%40example.test/);
  await expect(page.getByRole("link",{name:"Reply in email app"})).toHaveAttribute("href", /^mailto:visitor%40example.test/);
  await page.reload(); await expect(page.getByRole("article")).toContainText("Booking enquiry — local QA");
  expect(errors).toEqual([]); await page.screenshot({path:test.info().outputPath("contact-owner-inbox.png"),fullPage:true});
});

test("ownership, anonymous access and invalid filters are enforced by real API/SQL", async ({browser,request}) => {
  await reset(request); expect((await submit(request)).status()).toBe(200);
  const stranger=await browser.newContext();try { await session(stranger,other); expect((await stranger.request.get(`/api/projects/${project}/form-submissions`)).status()).toBe(404); }finally { await stranger.close(); }
  expect((await request.get(`/api/projects/${project}/form-submissions`)).status()).toBe(401);
  const ownerContext=await browser.newContext();try { await session(ownerContext); for(const filters of ["limit=NaN","offset=-1","sectionId=bad"]) expect((await ownerContext.request.get(`/api/projects/${project}/form-submissions?${filters}`)).status()).toBe(400); }finally { await ownerContext.close(); }
});

test("message fields remain intact on network failure and retry saves once", async ({page,request}) => {
  await reset(request); await page.goto("/contact-local-probe");
  await page.getByLabel("Your name").fill("Retry QA"); await page.getByLabel("Email",{exact:false}).fill("visitor@example.test"); await page.getByLabel("Message",{exact:false}).fill("Keep this message");
  await page.route("**/forms/*/submit",route=>route.abort("failed"));
  await page.getByRole("button",{name:"Send",exact:true}).click();
  await expect(page.getByRole("alert").filter({hasText:"Your message is still here"})).toBeVisible();
  await expect(page.getByLabel("Message",{exact:false})).toHaveValue("Keep this message");
  expect((await state(request)).rows).toHaveLength(0); await page.unroute("**/forms/*/submit");
  await page.getByRole("button",{name:"Send",exact:true}).click(); await expect(page.getByRole("status").filter({hasText:"Thanks"})).toBeVisible();
  expect((await state(request)).rows).toHaveLength(1);
});

test("phone inbox, refresh recovery and Mail reply composer use real UI without sending", async ({page,request}) => {
  await reset(request); expect((await submit(request)).status()).toBe(200); await session(page.context());
  await page.setViewportSize({width:390,height:844});
  await page.route("**/form-submissions?*",route=>route.fulfill({status:503,json:{error:"Contact inbox unavailable"}}));
  await page.goto(`/create/${project}/messages`); await expect(page.getByRole("alert").filter({hasText:"Contact inbox unavailable"})).toBeVisible();
  await page.unroute("**/form-submissions?*"); await page.getByRole("button",{name:"Retry loading messages"}).click();
  await expect(page.getByRole("article")).toContainText("Booking enquiry");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  const reply = await page.getByRole("link",{name:"Reply in Kebu Mail"}).getAttribute("href");
  await page.route("**/api/mail/mailboxes",route=>route.fulfill({json:{context:"personal",needsSetup:false,mailboxes:[{id:owner,address:"qa@kebu.test",display_name:"QA",mailbox_type:"personal",business_id:null}]}}));
  await page.route("**/api/mail/messages?*",route=>route.fulfill({json:{messages:[]}}));
  let sends=0;await page.route("**/api/mail/send",route=>{sends++;return route.fulfill({status:503,json:{error:"No external provider in local QA"}});});
  await page.goto(reply!); await expect(page.getByRole("textbox",{name:"To",exact:true})).toHaveValue("visitor@example.test");
  await expect(page.getByRole("textbox",{name:"Subject",exact:true})).toHaveValue("Re: May contact QA"); expect(sends).toBe(0);
});


test("required reply email and real inbox pagination preserve all saved messages", async ({request,browser}) => {
  await reset(request);
  const invalid=await request.post(`/api/public/sites/may-local/forms/${form}/submit`,{data:{values:{name:"QA",message:"Missing reply address"}}});
  expect(invalid.status()).toBe(400); expect((await state(request)).rows).toHaveLength(0);
  for(let index=0;index<3;index++) expect((await submit(request,`Enquiry ${index}`)).status()).toBe(200);
  const context=await browser.newContext();try {await session(context);
    const first=await (await context.request.get(`/api/projects/${project}/form-submissions?limit=2`)).json();
    expect(first.submissions).toHaveLength(2); expect(first.nextOffset).toBe(2);
    const second=await (await context.request.get(`/api/projects/${project}/form-submissions?limit=2&offset=2`)).json();
    expect(second.submissions).toHaveLength(1);expect(second.nextOffset).toBeNull();
    expect(new Set([...first.submissions,...second.submissions].map(item=>item.id)).size).toBe(3);
  }finally{await context.close();}
});


test("lost successful response retries the same receipt without duplicating the enquiry", async ({page,request}) => {
  await reset(request); await page.goto("/contact-local-probe");
  await page.getByLabel("Your name").fill("Lost response QA");await page.getByLabel("Email",{exact:false}).fill("visitor@example.test");await page.getByLabel("Message",{exact:false}).fill("Only one enquiry");
  let first=true;
  await page.route("**/forms/*/submit",async route=>{if(first){first=false;await route.fetch();await route.abort("failed");}else await route.continue();});
  await page.getByRole("button",{name:"Send",exact:true}).click();await expect(page.getByRole("alert").filter({hasText:"Your message is still here"})).toBeVisible();
  expect((await state(request)).rows).toHaveLength(1);
  await page.getByRole("button",{name:"Send",exact:true}).click();await expect(page.getByRole("status").filter({hasText:"Thanks"})).toBeVisible();
  expect((await state(request)).rows).toHaveLength(1);
});
