/**
 * CURRENT VERIFIED FOLLOW-UP (2026-11-05): use scripts/verify-generation-local.mjs.
 * On shared runtime 3ddd1797, GitHub Actions run 41982722295 executed this file's
 * seven browser cases successfully and the complete 73-case generation gate with
 * zero failures/skips. The manual-run failures documented below are historical
 * investigation results, not established defects on that current shared runtime.
 * This remains isolated fixture Auth/REST/SQL evidence, not managed hosted QA.
 *
 * This suite drives a real Chromium browser against a real Next.js dev server for the
 * AI-generation review pipeline (inspectCandidate / the preview+approve+accept UI). It
 * requires a SEPARATE dev server process (not the vitest process) to be running first,
 * with its own env vars — vi.stubEnv() in beforeAll only affects this test process, not
 * that separate server. Until 2026-11-05 this had never been confirmed to actually run:
 * it silently always took the describe.skipIf(!origin||!executable) branch (0/7 tests
 * executed, no failure, nothing visible) because nobody had ever documented what the
 * companion dev server needs.
 *
 * Real recipe, verified working on 2026-11-05 (got from 0/7 executing to 1/7 passing,
 * with the other 6 failing on real, specific, now-diagnosed application behavior rather
 * than "never ran" — see the two still-open findings below):
 *
 *   # 1. Start a second process — a real dev server, with all six of these set:
 *   CREATIVE_PREVIEW_SECRET=<any string >= 32 chars, matching the value this file
 *     stubs in beforeAll ("isolated-preview-signing-secret-123456789")>
 *   CREATIVE_GENERATION_APP_URL=<that server's own origin, e.g. http://127.0.0.1:38201>
 *   CREATIVE_CHROMIUM_EXECUTABLE_PATH=<a real local Chromium binary — this is the
 *     general-purpose escape hatch browserConfiguration() takes specifically to AVOID
 *     needing @sparticuz/chromium outside Vercel; @sparticuz/chromium is a Lambda/
 *     Vercel-specific binary and is not the blocker for this test>
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:38429  (this file's own in-process proxy,
 *     started in beforeAll on this fixed port — stands in for Supabase's REST API)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<any non-empty, non-"placeholder" string — required by
 *     requireUser() in lib/create/auth.ts:13, not previously documented anywhere; this
 *     was the specific gap that made "private preview rejects..." always fail with 503
 *     instead of the expected 401, even with every other var above correctly set>
 *   SUPABASE_SERVICE_ROLE_KEY=<any non-empty, non-"placeholder" string — required by
 *     createServiceClient() in lib/opportunity/admin.ts:6>
 *
 *   # 2. Then, in this process:
 *   KEBU_GENERATION_PREVIEW_ORIGIN=<same origin as CREATIVE_GENERATION_APP_URL above>
 *   KEBU_CHROMIUM_EXECUTABLE_PATH=<same executable path as above>
 *   npx vitest run tests/generation/browser.local.test.ts
 *
 * Two real, specific failures remain open past that point (not blocked by any missing
 * package or missing env var — genuine application behavior to debug further):
 *   - "actual browser detects failure..." times out in inspectCandidate() at
 *     lib/generation/browser.ts:60 waiting for window.__kebuGenerationCheck. The client
 *     component that sets it (app/components/generation/candidate-preview.tsx:19) fetches
 *     /api/generation/preview/[id] itself — that fetch's success depends on this file's
 *     own proxy correctly answering both the REST row lookup AND the
 *     claim_creative_generation_access RPC for a freshly-created run id within the
 *     15s window; not yet isolated which side times out.
 *   - "user can submit, approve..." times out waiting for the "Start request" button to
 *     become enabled (app/components/generation/generation-workbench.tsx:98 — disabled
 *     while `!loaded || !configured || busy || prompt.trim().length < 8`; the prompt text
 *     in this test is 35 chars, so it's `loaded` or `configured` not resolving true, not
 *     the character-count guard).
 */
import { createServer,type Server } from "node:http";
import { mkdirSync,writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll,afterAll,describe,it,expect,vi } from "vitest";
vi.mock("server-only",()=>({}));
import type { SupabaseClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { inspectCandidate } from "@/lib/generation/browser";
import { advanceGenerationStage,type PipelineServices } from "@/lib/generation/engine";
import { buildCandidate, type Candidate } from "@/lib/generation/targets";
import { fixtureRun,studioDocument,plan,direction,target } from "./fixtures";
import { generationView } from "@/lib/generation/api";
import type { GenerationRun } from "@/lib/generation/contracts";
const origin=process.env.KEBU_GENERATION_PREVIEW_ORIGIN,executable=process.env.KEBU_CHROMIUM_EXECUTABLE_PATH;
let proxy:Server,current:GenerationRun,proxyOrigin="";let authorized=0;
const receipts=new Map<string,Buffer>();
const storage={storage:{from:()=>({upload:async(path:string,bytes:Buffer)=>{receipts.set(path,bytes);return {error:null};}})}} as unknown as SupabaseClient;
describe.skipIf(!origin||!executable)("actual Next native previews, browser checks and user review",()=>{
 beforeAll(async()=>{vi.stubEnv("CREATIVE_PREVIEW_SECRET","isolated-preview-signing-secret-123456789");vi.stubEnv("CREATIVE_CHROMIUM_EXECUTABLE_PATH",executable!);
 proxy=createServer(async(req,res)=>{res.setHeader("content-type","application/json");const url=new URL(req.url!,"http://localhost");
 if(url.pathname==="/rest/v1/creative_generation_runs"){authorized++;res.end(JSON.stringify(current??null));return;}
 if(url.pathname==="/rest/v1/rpc/claim_creative_generation_access"){res.end("true");return;}
 res.writeHead(401);res.end('{"error":"Local fixture has no browser session"}');});
 await new Promise<void>(done=>proxy.listen(38429,"127.0.0.1",done));proxyOrigin=origin!;vi.stubEnv("CREATIVE_GENERATION_APP_URL",origin!);
 // Compile the real preview before the worker's bounded browser budget starts.
 await fetch(`${origin}/generation/preview/${crypto.randomUUID()}`);
 },120000);
 afterAll(async()=>{vi.unstubAllEnvs();proxy?.closeAllConnections();await new Promise<void>(done=>proxy?proxy.close(()=>done()):done());});
 for(const kind of ["studio","builder"] as const){
 it(`${kind}: actual browser detects failure, bounded repair fixes it, actual screenshots feed visual review`,async()=>{
 current=fixtureRun(kind);current.data.direction=direction;current.phase="generating";
 const initial=kind==="studio"?{document:studioDocument(10)}:plan();
 if(kind==="builder") (initial as ReturnType<typeof plan>).pages[0].nodes[1].props = {...(initial as ReturnType<typeof plan>).pages[0].nodes[1].props,fontSize:8} as never;
 const source=structuredClone(current.data.source);let requestedImages=0;
 const services:PipelineServices={source:async()=>source,request:async(schema,_instruction,data,images)=>{
  if(images){requestedImages+=images.length;expect(images.every(image=>Buffer.from(image.data,"base64").subarray(0,2).equals(Buffer.from([255,216])))).toBe(true);return {output:schema.parse({issues:[],summary:"Fixture vision accepts measured screenshot"}),model:"fixture-vision",inputTokens:20,outputTokens:5};}
  if(current.phase==="generating")return {output:schema.parse(initial),model:"fixture-code",inputTokens:10,outputTokens:20};
  const document=(data as {candidate:Candidate}).candidate.document;
  const node=kind==="studio"?{pageId:"page-1",objectId:"title",key:"height",value:200}: {pageId:document.pages[0].id,objectId:Object.values((document as import("@/lib/creative-core").KcdDocument).nodes).find(node=>node.type==="text")!.id,key:"fontSize",value:42};
  return {output:schema.parse({changes:[{...node,device:"base"}]}),model:"fixture-repair",inputTokens:10,outputTokens:15};
 },inspect:async run=>(await inspectCandidate(storage,run)).report,images:async report=>report.screenshots.filter(item=>[390,1280].includes(item.viewport)).slice(0,4).map(item=>({mediaType:"image/jpeg" as const,data:receipts.get(item.path)!.toString("base64")}))};
 Object.assign(current,await advanceGenerationStage(current,services));current.state="working";
 Object.assign(current,await advanceGenerationStage(current,services));expect(current.data.report?.status).toBe("fail");expect(current.data.report?.screenshots).toHaveLength(4);current.state="working";
 Object.assign(current,await advanceGenerationStage(current,services));expect(current.phase).toBe("repairing");current.state="working";
 Object.assign(current,await advanceGenerationStage(current,services));expect(current.data.repairs).toBe(1);current.state="working";
 Object.assign(current,await advanceGenerationStage(current,services));expect(current.data.report?.status).toBe("pass");current.state="working";
 Object.assign(current,await advanceGenerationStage(current,services));expect(current.state).toBe("ready");expect(requestedImages).toBe(4);expect(authorized).toBeGreaterThan(0);
 const output=process.env.KEBU_GENERATION_OUTPUT_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(resolve(output,`${kind}-report.json`),JSON.stringify(current.data.report,null,2));for(const item of current.data.report!.screenshots)writeFileSync(resolve(output,`${kind}-${item.viewport}.jpg`),receipts.get(item.path)!);}
 },120000);
 }
 it("private preview rejects missing or cancelled capabilities",async()=>{current=fixtureRun();current.data.candidate=buildCandidate(current,{document:studioDocument()});const response=await fetch(`${proxyOrigin}/api/generation/preview/${current.id}`);expect(response.status).toBe(401);});
 for(const width of [1280,390]) for(const kind of ["builder","studio"] as const){it(`${kind} at ${width}px: user can submit, approve, review results and accept a saved draft`,async()=>{
 const browser=await chromium.launch({executablePath:executable,args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});const context=await browser.newContext({serviceWorkers:"block",viewport:{width,height:900}});const page=await context.newPage();const run=fixtureRun(kind);run.state="queued";const actions:string[]=[];
 await context.route("**/api/generation/**",async route=>{const req=route.request(),url=new URL(req.url());if(url.pathname.endsWith(`/api/generation/${kind}/${target}`)){if(req.method()==="POST"){actions.push("start");run.state="awaiting_approval";run.data.direction=direction;run.data.brief=JSON.parse(req.postData()!).brief;await route.fulfill({json:{run:generationView(run)}});}else await route.fulfill({json:{configured:true,runs:[]}});return;}
 if(req.method()==="POST"){const action=JSON.parse(req.postData()!).action;actions.push(action);if(action==="approve"){run.state="ready";run.phase="reviewing";run.data.candidate=buildCandidate(run,kind==="studio"?{document:studioDocument()}:plan());run.data.report={candidateHash:"fixture",checker:"kebu-browser-v1",checkedAt:new Date().toISOString(),status:"pass",issues:[],checks:["fixture UI transport"],viewports:[390,1280],screenshots:[],visualReview:"passed"};}else if(action==="accept")run.state="accepted";await route.fulfill({json:{run:generationView(run)}});return;}
 if(url.pathname.includes("/preview/")){await route.fulfill({json:{kind,document:(run.data.candidate as Candidate).document}});return;}await route.fulfill({json:{run:generationView(run)}});
 });
 try{await page.goto(`${origin}/generation/${kind}/${target}`);await page.getByLabel("What are we making?").fill("Create an original editorial launch");await page.getByRole("button",{name:"Start request",exact:true}).click();await page.getByRole("button",{name:"Approve direction and generate"}).click();await expect.poll(()=>page.getByRole("button",{name:"Accept into saved draft"}).isVisible()).toBe(true);await page.frameLocator("iframe").locator("[data-generation-preview]").waitFor({state:"visible"});
 if(kind==="studio"){const image=page.frameLocator("iframe").getByAltText("Generated design preview");await image.waitFor({state:"visible"});await expect.poll(()=>image.evaluate(element=>(element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth>0)).toBe(true);}else await page.frameLocator("iframe").getByText("Make something meaningful",{exact:true}).waitFor({state:"visible"});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 page.once("dialog",dialog=>dialog.accept());await page.getByRole("button",{name:"Accept into saved draft"}).click();await expect.poll(()=>page.getByRole("link",{name:"Open editable draft"}).isVisible()).toBe(true);expect(actions).toEqual(["start","approve","accept"]);
 if(process.env.KEBU_GENERATION_OUTPUT_DIR)await page.screenshot({path:resolve(process.env.KEBU_GENERATION_OUTPUT_DIR,`${kind}-workbench-${width}.jpg`),fullPage:true});}finally{await context.close();await browser.close();}
 },90000);}
});
