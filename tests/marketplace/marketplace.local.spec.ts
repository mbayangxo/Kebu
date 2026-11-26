import {test,expect,type BrowserContext} from "playwright/test";
import {createHmac} from "node:crypto";
const developer="11111111-1111-4111-8111-111111111111",buyer="22222222-2222-4222-8222-222222222222";
async function session(context:BrowserContext,id:string){
  const exp=Math.floor(Date.now()/1000)+3600;
  const token=[Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url"),Buffer.from(JSON.stringify({sub:id,exp})).toString("base64url"),"fixture"].join(".");
  await context.addCookies([{name:"sb-127-auth-token",value:"base64-"+Buffer.from(JSON.stringify({access_token:token,refresh_token:"fixture",expires_at:exp,expires_in:3600,token_type:"bearer",user:{id,email:id+"@example.test",app_metadata:{},user_metadata:{}}})).toString("base64url"),url:"http://127.0.0.1:38520",sameSite:"Lax"}]);
}
async function admin(context:BrowserContext){
  const payload="v1."+(Date.now()+3600000);
  const sig=createHmac("sha256","marketplace-local-fixture-admin-secret").update(payload).digest("hex");
  await context.addCookies([{name:"alkebulan-admin",value:payload+"."+sig,url:"http://127.0.0.1:38520"}]);
}
for(const width of [1440,390]){
 test("developer → reviewer → account add/open/remove at "+width+"px",async({browser,request})=>{
  await request.post("http://127.0.0.1:38521/__qa/reset");
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:"block"});
  await session(context,developer);
  const page=await context.newPage();
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/dev/apps/new");
  await page.getByLabel("App name",{exact:true}).fill("Community Calendar");
  await page.getByLabel("Short description",{exact:true}).fill("Plan your community events");
  await page.getByLabel("Description",{exact:true}).fill("A hosted calendar for community groups to plan their events together.");
  await page.getByLabel("Launch URL",{exact:true}).fill("https://calendar.example/app");
  await page.getByLabel("Privacy policy URL",{exact:true}).fill("https://calendar.example/privacy");
  await page.getByLabel("Support URL",{exact:true}).fill("https://calendar.example/support");
  await page.getByRole("button",{name:"Create draft",exact:true}).click();
  await expect(page).toHaveURL(/\/dev\/apps\/[0-9a-f-]+$/);
  await page.getByRole("button",{name:"Submit for review",exact:true}).click();
  await expect(page.getByText("Status: review",{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText("Status: review",{exact:true})).toBeVisible();
  await expect(page.getByLabel("App name",{exact:true})).toBeDisabled();
  expect((await request.get("/api/admin/app-reviews")).status()).toBe(401);
  expect((await (await request.get("/api/app-store")).json()).apps).toHaveLength(0);
  await admin(context);
  await page.goto("/admin/app-reviews");
  await page.getByRole("combobox",{name:"Decision",exact:true}).selectOption("published");
  await page.getByLabel("Review note (shared with the developer)",{exact:true}).fill("Verified hosted functionality, ownership, privacy and support.");
  await page.getByRole("button",{name:"Save decision for Community Calendar",exact:true}).click();
  await expect(page.getByText("Review decision saved.",{exact:true})).toBeVisible();
  await page.screenshot({path:process.env.KEBU_MARKETPLACE_SCREENSHOTS+"/review-"+width+".png",fullPage:true});
  await context.clearCookies();await session(context,buyer);
  await page.goto("/app-store");
  await page.getByRole("button",{name:"View details",exact:true}).click();
  await expect(page.getByRole("button",{name:"Add Community Calendar",exact:true})).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Add Community Calendar",exact:true}).click();
  await expect(page.getByText("Added to My Apps.",{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link",{name:"Open Community Calendar",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:process.env.KEBU_MARKETPLACE_SCREENSHOTS+"/store-"+width+".png",fullPage:true});
  await page.getByRole("link",{name:"Open Community Calendar",exact:true}).click();
  const launch=page.getByRole("link",{name:"Launch Community Calendar ↗",exact:true});
  await expect(launch).toHaveAttribute("href","https://calendar.example/app");
  await expect(launch).toHaveAttribute("rel","noopener noreferrer");
  const id=new URL(page.url()).pathname.split("/").at(-1)!;
  const staff=await browser.newContext({serviceWorkers:"block"});
  await session(staff,developer);await admin(staff);
  const review=await staff.newPage();await review.goto("/admin/app-reviews");
  await review.getByLabel("Review note (shared with the developer)",{exact:true}).fill("Suspend for investigation of an app issue.");
  await review.getByRole("button",{name:"Save decision for Community Calendar",exact:true}).click();
  await expect(review.getByText("Review decision saved.",{exact:true})).toBeVisible();
  await staff.close();
  await page.goto("/app-store");
  await expect(page.getByText("This app has been withdrawn or suspended.",{exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Open Community Calendar",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Remove Community Calendar",exact:true}).click();
  await expect(page.getByRole("link",{name:"Open Community Calendar",exact:true})).toHaveCount(0);
  await page.goto("/app-store/open/"+id);
  await expect(page.getByRole("heading",{name:"App unavailable",exact:true})).toBeVisible();
  // Review history and install belong to different actors; removal persists.
  const state=await (await request.get("http://127.0.0.1:38521/__qa/state")).json();
  expect(state.apps).toHaveLength(1);expect(state.reviews).toHaveLength(2);expect(state.installs).toHaveLength(0);
  expect(errors).toEqual([]);
  await context.close();
 });
}
