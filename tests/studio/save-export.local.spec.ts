import { test, expect, type Page, type Locator } from "playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { emptyCanvasDocument, canvasLayerSchema } from "../../lib/studio/canvas-document";
import { emptyStudioComposition, compositionClipSchema } from "../../lib/studio/composition";

const id = "22222222-2222-4222-8222-222222222222", owner = "33333333-3333-4333-8333-333333333333";
const rev = (n: number) => `2026-10-13T12:00:${String(n).padStart(2, "0")}.000Z`;

async function setupStyles(page:Page, viewer=false) {
  const fixture=await setup(page,{viewer}), doc=fixture.server().canvas!;
  doc.layers=[
    canvasLayerSchema.parse({id:"title",type:"text",name:"Heading",text:"Source words",x:20,y:20,width:280,height:70,fontSize:32,color:"#ff0000",fontWeight:"700"}),
    canvasLayerSchema.parse({id:"image",type:"text",name:"Body",text:"Keep these words",x:40,y:180,width:300,height:80,fontSize:18,color:"#00aa00",fontWeight:"400",shadowBlur:10,groupId:"pair"}),
    canvasLayerSchema.parse({id:"locked",type:"text",name:"Locked",text:"Locked words",x:40,y:320,width:300,height:80,fontSize:18,color:"#0000ff",locked:true,groupId:"pair"}),
  ];
  doc.pages[0]!.layers=doc.layers;
  await page.reload(); return fixture;
}

async function showStyleInspector(page:Page,width:number) {
  if(width<1024) {
    const button=page.getByRole("button",{name:"Inspector",exact:true});
    if(await button.getAttribute("aria-pressed")!=="true") await button.tap();
  }
}
async function hideStyleInspector(page:Page,width:number) {
  if(width<1024) {
    const button=page.getByRole("button",{name:"Inspector",exact:true});
    if(await button.getAttribute("aria-pressed")==="true") await button.tap();
  }
}

for(const width of [1440,834,390]) test.describe(`style transfer at ${width}px`,()=>{
  test.use({viewport:{width,height:1000},hasTouch:width<1024});
  test("object style preserves grouped content and locked artwork through undo save and reopen",async ({page})=>{
    const activate=(target:Locator)=>width<1024?target.tap():target.click();
    const fixture=await setupStyles(page), before=structuredClone(fixture.server().canvas!.layers);
    const source=page.locator('[data-studio-layer-id="title"]'), target=page.locator('[data-studio-layer-id="image"]');
    await activate(source); await showStyleInspector(page,width);
    await activate(page.getByRole("button",{name:"Copy style",exact:true}));
    await expect(page.getByRole("status").filter({hasText:"Style copied from Heading."})).toBeVisible();
    await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled(); expect(fixture.writes).toHaveLength(0);
    await hideStyleInspector(page,width); await activate(target); await showStyleInspector(page,width);
    const paste=page.getByRole("button",{name:"Paste style",exact:true});
    await activate(paste);
    await expect(target.locator("p")).toHaveCSS("font-size","32px"); await expect(target.locator("p")).toHaveCSS("color","rgb(255, 0, 0)");
    await expect(target.locator("p")).toHaveText("Keep these words");
    await activate(paste); // An identical paste must not create another undo entry.
    await activate(page.getByRole("button",{name:"Undo",exact:true}));
    await expect(target.locator("p")).toHaveCSS("font-size","18px");
    await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
    await activate(page.getByRole("button",{name:"Redo",exact:true}));
    await activate(page.getByRole("button",{name:"Save draft",exact:true}));
    await expect.poll(()=>fixture.server().canvas!.layers[1]!.fontSize).toBe(32);
    const saved=structuredClone(fixture.server().canvas!.layers);
    expect(saved[0]).toEqual(before[0]); expect(saved[2]).toEqual(before[2]);
    expect(saved[1]).toMatchObject({id:"image",text:"Keep these words",x:40,y:180,width:300,height:80,groupId:"pair",color:"#ff0000",fontWeight:"700"});
    expect(saved[1]!.shadowBlur).toBeUndefined();
    await page.reload(); await expect(target.locator("p")).toHaveCSS("font-size","32px");
    expect(fixture.server().canvas!.layers).toEqual(saved);
    await activate(target); await showStyleInspector(page,width);
    await page.screenshot({path:test.info().outputPath(`object-style-${width}.png`)});
    expect(fixture.errors).toEqual([]);
  });

  test("page style and background apply atomically and persist in every exported PNG",async ({page})=>{
    const activate=(target:Locator)=>width<1024?target.tap():target.click();
    const fixture=await setup(page), doc=fixture.server().canvas!, original=doc.pages[0]!;
    doc.pages=[
      {...original,name:"Cover",backgroundColor:"#123456",durationMs:1000,transitionKind:"dissolve",transitionDurationMs:700},
      {...original,id:"style-page-2",name:"Inside",backgroundColor:"#334455",durationMs:4000,transitionKind:"cut",transitionDurationMs:0,layers:original.layers.map(layer=>({...layer,id:layer.id+"2"}))},
      {...original,id:"style-page-3",name:"End",backgroundColor:"#abcdef",durationMs:7000,transitionKind:"slide",transitionDurationMs:500,layers:original.layers.map(layer=>({...layer,id:layer.id+"3"}))},
    ]; doc.backgroundColor=doc.pages[0]!.backgroundColor; doc.layers=doc.pages[0]!.layers;
    const identities=doc.pages.map(item=>({id:item.id,name:item.name,layers:structuredClone(item.layers),durationMs:item.durationMs}));
    await page.reload();
    const settings=page.getByRole("button",{name:"Page settings",exact:true});
    const switchPage=async (name:string)=>{
      await activate(page.getByRole("group",{name:"Pages",exact:true}).getByRole("button",{name,exact:true})); await activate(settings);
    };
    await activate(settings); await activate(page.getByRole("button",{name:"Copy page style",exact:true}));
    await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled(); expect(fixture.writes).toHaveLength(0);
    await switchPage("Inside"); await activate(page.getByRole("button",{name:"Paste page style",exact:true}));
    await expect(page.getByLabel("Background",{exact:true})).toHaveValue("#123456");
    await activate(page.getByRole("button",{name:"Undo",exact:true})); await expect(page.getByLabel("Background",{exact:true})).toHaveValue("#334455");
    await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
    await activate(page.getByRole("button",{name:"Redo",exact:true}));
    await switchPage("End"); await activate(page.getByRole("button",{name:"Apply background to all pages",exact:true}));
    await activate(page.getByRole("button",{name:"Undo",exact:true}));
    await activate(page.getByRole("button",{name:"Save draft",exact:true}));
    await expect.poll(()=>fixture.server().canvas!.pages.map(item=>item.backgroundColor)).toEqual(["#123456","#123456","#abcdef"]);
    await activate(page.getByRole("button",{name:"Redo",exact:true})); await activate(page.getByRole("button",{name:"Save draft",exact:true}));
    await expect.poll(()=>fixture.server().canvas!.pages.map(item=>item.backgroundColor)).toEqual(["#abcdef","#abcdef","#abcdef"]);
    expect(fixture.server().canvas!.pages.map(item=>({id:item.id,name:item.name,layers:item.layers,durationMs:item.durationMs}))).toEqual(identities);
    expect(fixture.server().canvas!.pages.map(item=>[item.transitionKind,item.transitionDurationMs])).toEqual([["dissolve",700],["dissolve",700],["slide",500]]);
    const panel=(await page.getByRole("complementary",{name:"Inspector",exact:true}).boundingBox())!;
    const header=(await page.locator("[data-studio-inspector-header]").boundingBox())!;
    expect(header.y-panel.y).toBeLessThanOrEqual(2); expect(header.y-panel.y).toBeGreaterThanOrEqual(-1);
    await page.screenshot({path:test.info().outputPath(`page-style-${width}.png`)});
    await page.reload(); await activate(page.getByText("More",{exact:true}));
    const downloaded=page.waitForEvent("download"); await activate(page.getByRole("button",{name:"Download pages ZIP",exact:true}));
    const zip=await JSZip.loadAsync(readFileSync((await (await downloaded).path())!)), files=Object.values(zip.files).filter(item=>!item.dir);
    expect(files).toHaveLength(3);
    for(const file of files) {
      const pixel=await page.evaluate(async data=>{const image=new Image();image.src="data:image/png;base64,"+data;await image.decode();const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext("2d")!;ctx.drawImage(image,0,0);return [...ctx.getImageData(600,600,1,1).data];},await file.async("base64"));
      expect(pixel).toEqual([171,205,239,255]);
    }
    expect(fixture.errors).toEqual([]);
  });
});

for (const width of [1440, 834, 390]) test.describe(`Inspector scrolling at ${width}px`, () => {
  test.use({ viewport: { width, height: 740 }, hasTouch: width < 1024 });
  test("keeps header controls reachable after scrolling without changing artwork", async ({ page }) => {
    const fixture = await setupStyles(page);
    const before = structuredClone(fixture.server().canvas);
    const activate = (target: Locator) => width < 1024 ? target.tap() : target.click();
    await activate(page.locator('[data-studio-layer-id="title"]'));
    await showStyleInspector(page, width);
    const panel = page.getByRole("complementary", { name: "Inspector", exact: true });
    const header = panel.locator("[data-studio-inspector-header]");
    await expect.poll(() => panel.evaluate(el => el.scrollHeight - el.clientHeight)).toBeGreaterThan(100);
    await panel.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBeGreaterThan(100);
    const panelBox = (await panel.boundingBox())!;
    const headerBox = (await header.boundingBox())!;
    expect(Math.abs(headerBox.y - panelBox.y)).toBeLessThanOrEqual(2);
    await activate(header.getByRole("button", { name: "animate", exact: true }));
    await expect(panel.getByRole("combobox", { name: "Entrance", exact: true })).toBeVisible();
    await activate(header.getByRole("button", { name: "design", exact: true }));
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
    expect(fixture.writes).toHaveLength(0);
    expect(fixture.server().canvas).toEqual(before);
    expect(fixture.errors).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`inspector-scrolled-${width}.png`) });
  });
});

test.describe("style viewer permissions",()=>{
  test.use({viewport:{width:390,height:1000},hasTouch:true});
  test("style transfer never gives viewers mutation controls",async ({page})=>{
    const fixture=await setupStyles(page,true);
    await page.locator('[data-studio-layer-id="title"]').tap(); await showStyleInspector(page,390);
    for(const name of ["Copy style","Paste style"]) await expect(page.getByRole("button",{name,exact:true})).toBeDisabled();
    await page.getByRole("button",{name:"Page settings",exact:true}).tap();
    for(const name of ["Copy page style","Paste page style","Apply background to all pages"]) await expect(page.getByRole("button",{name,exact:true})).toBeDisabled();
    expect(fixture.writes).toHaveLength(0); expect(fixture.errors).toEqual([]);
  });
});

test("selection rotation has a shared handle and exact control with persistent undo", async ({ page }) => {
  const fixture = await setupRotation(page);
  await page.locator('[data-studio-layer-id="title"]').click();
  await expect(page.getByRole("button",{name:"Rotate selection",exact:true})).toBeVisible();
  await page.getByLabel("Rotate selection by (°)",{exact:true}).fill("90");
  await page.getByRole("button",{name:"Apply selection rotation",exact:true}).click();
  await page.getByRole("button",{name:"Undo",exact:true}).click();
  await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"Redo",exact:true}).click();
  await page.getByRole("button",{name:"Save draft",exact:true}).click();
  await expect.poll(()=>fixture.server().canvas!.layers.map(l=>l.rotation)).toEqual([90,120]);
  expect(fixture.server().canvas!.layers[0]!.x).toBeCloseTo(280);
  expect(fixture.server().canvas!.layers[0]!.y).toBeCloseTo(110);
  expect(fixture.server().canvas!.layers[1]!.x).toBeCloseTo(140);
  expect(fixture.server().canvas!.layers[1]!.y).toBeCloseTo(250);
  await page.reload();
  await page.locator('[data-studio-layer-id="title"]').click();
  await expect(page.getByRole("button",{name:"Rotate selection",exact:true})).toBeVisible();
  await page.getByText("More",{exact:true}).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button",{name:"Download PNG",exact:true}).click();
  const png = readFileSync((await (await download).path())!);
  const pixels = await page.evaluate(async data=>{
    const image = new Image(); image.src="data:image/png;base64,"+data; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width=image.width; canvas.height=image.height;
    const context = canvas.getContext("2d")!; context.drawImage(image,0,0);
    return [[...context.getImageData(330,130,1,1).data],[...context.getImageData(170,140,1,1).data]];
  },png.toString("base64"));
  expect(pixels).toEqual([[255,0,0,255],[255,255,255,255]]);
  await page.getByText("More",{exact:true}).click();
  expect(fixture.errors).toEqual([]);
  await page.screenshot({path:test.info().outputPath("rotated-selection.png")});
});

async function setupRotation(page: Page, viewer = false) {
  const fixture = await setup(page,{viewer});
  const source = fixture.server().canvas!;
  source.layers = [
    canvasLayerSchema.parse({id:"title",name:"Title",type:"rect",x:120,y:120,width:100,height:40,rotation:0,groupId:"pair",fill:"#ff0000"}),
    canvasLayerSchema.parse({id:"image",name:"Image",type:"rect",x:300,y:240,width:80,height:100,rotation:30,groupId:"pair",fill:"#00ff00"}),
  ];
  source.pages[0]!.layers = source.layers;
  await page.reload();
  return fixture;
}

test("selection rotation pointer gesture cancels restores and commits one undo step", async ({page})=>{
  const fixture = await setupRotation(page);
  const title = page.locator('[data-studio-layer-id="title"]'); await title.click();
  const handle = page.getByRole("button",{name:"Rotate selection",exact:true});
  const drag = async ()=>{
    const start = (await handle.boundingBox())!, pivot = (await page.locator('[data-studio-selection-pivot]').boundingBox())!;
    const x = start.x+start.width/2, y = start.y+start.height/2, cx=pivot.x+pivot.width/2,cy=pivot.y+pivot.height/2;
    await page.mouse.move(x,y); await page.mouse.down(); await page.keyboard.down("Shift");
    await page.mouse.move(cx+Math.hypot(x-cx,y-cy),cy,{steps:8}); await page.keyboard.up("Shift");
  };
  await drag(); await page.keyboard.press("Escape"); await page.mouse.up();
  await expect(title).toHaveCSS("transform","matrix(1, 0, 0, 1, 0, 0)");
  await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
  expect(fixture.writes).toHaveLength(0);
  await drag(); await page.mouse.up();
  await page.getByRole("button",{name:"Undo",exact:true}).click();
  await expect(title).toHaveCSS("transform","matrix(1, 0, 0, 1, 0, 0)");
  await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"Redo",exact:true}).click();
  await handle.focus(); await handle.press("ArrowRight"); await handle.press("ArrowLeft");
  await page.getByRole("button",{name:"Save draft",exact:true}).click();
  await expect.poll(()=>fixture.server().canvas!.layers.map(l=>l.rotation)).toEqual([90,120]);
  await page.reload(); expect(fixture.server().canvas!.layers[0]!.x).toBeCloseTo(280);
  expect(fixture.errors).toEqual([]);
});

for (const width of [390,834]) test.describe(`selection rotation touch at ${width}px`,()=>{
  test.use({viewport:{width,height:1000},hasTouch:true});
  test("selection rotation touch and exact alternatives persist without native cancellation",async ({page})=>{
    const fixture = await setupRotation(page);
    const title = page.locator('[data-studio-layer-id="title"]'); await title.tap();
    const handle = page.getByRole("button",{name:"Rotate selection",exact:true});
    const client = await page.context().newCDPSession(page);
    const touch = async (cancel: boolean)=>{
      const start=(await handle.boundingBox())!, pivot=(await page.locator('[data-studio-selection-pivot]').boundingBox())!;
      const x=start.x+start.width/2,y=start.y+start.height/2,cx=pivot.x+pivot.width/2,cy=pivot.y+pivot.height/2;
      expect(start.width).toBeGreaterThanOrEqual(27.9);
      await client.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y,id:1}]});
      for(let i=1;i<=8;i++) {
        const angle=-Math.PI/2+i/8*Math.PI/2, radius=Math.hypot(x-cx,y-cy);
        await client.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:cx+Math.cos(angle)*radius,y:cy+Math.sin(angle)*radius,id:1}]});
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
      }
      await expect(page.locator('[data-studio-gesture="transform"]')).toHaveCount(1);
      await client.send("Input.dispatchTouchEvent",{type:cancel?"touchCancel":"touchEnd",touchPoints:[]});
      // A CDP receipt precedes React's actual gesture completion.
      await expect(page.locator('[data-studio-gesture="transform"]')).toHaveCount(0);
    };
    await touch(true);
    await expect(title).toHaveCSS("transform","matrix(1, 0, 0, 1, 0, 0)");
    await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
    expect(fixture.writes).toHaveLength(0);
    await touch(false); await client.detach();
    const inspector=page.getByRole("button",{name:"Inspector",exact:true});
    await inspector.tap(); await expect(inspector).toHaveAttribute("aria-pressed","true");
    await page.getByLabel("Rotate selection by (°)",{exact:true}).fill("15");
    await page.getByRole("button",{name:"Apply selection rotation",exact:true}).tap();
    await page.screenshot({path:test.info().outputPath(`selection-rotation-${width}.png`)});
    await page.getByRole("button",{name:"Inspector",exact:true}).tap();
    await handle.focus(); await handle.press("Shift+ArrowRight"); await handle.press("Shift+ArrowLeft");
    await page.getByRole("button",{name:"Save draft",exact:true}).tap();
    await expect.poll(()=>fixture.server().canvas!.layers[0]!.rotation).toBeGreaterThan(103);
    const saved = structuredClone(fixture.server().canvas!.layers);
    expect(saved[0]!.rotation).toBeLessThan(107); expect(saved[1]!.rotation-saved[0]!.rotation).toBeCloseTo(30);
    await page.reload(); await title.tap();
    expect(fixture.server().canvas!.layers).toEqual(saved);
    await expect(handle).toBeVisible();
    expect(fixture.errors).toEqual([]);
  });
});

test("selection rotation refuses out-of-range changes without a partial save or undo entry",async ({page})=>{
  const fixture = await setupRotation(page), source = fixture.server().canvas!;
  source.layers[0] = {...source.layers[0]!,x:-2000,y:-2000};
  source.layers[1] = {...source.layers[1]!,x:4000,y:4000}; source.pages[0]!.layers=source.layers;
  const before=structuredClone(source); await page.reload();
  await page.getByRole("button",{name:"Layers",exact:true}).click();
  await page.getByRole("button").filter({has:page.getByText("Title",{exact:true})}).click();
  await page.getByLabel("Rotate selection by (°)",{exact:true}).fill("45");
  await page.getByRole("button",{name:"Apply selection rotation",exact:true}).click();
  await expect(page.getByRole("alert",{name:"Selection rotation error",exact:true})).toContainText("supported canvas range");
  await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
  expect(fixture.writes).toHaveLength(0); expect(fixture.server().canvas).toEqual(before);
  await page.getByRole("button",{name:"Dismiss rotation error",exact:true}).click();
  expect(fixture.errors).toEqual([]);
});

test("selection rotation controls never grant a viewer mutation authority",async ({page})=>{
  const fixture = await setupRotation(page,true);
  await page.locator('[data-studio-layer-id="title"]').click();
  await expect(page.getByRole("button",{name:"Rotate selection",exact:true})).toBeDisabled();
  await expect(page.getByLabel("Rotate selection by (°)",{exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Apply selection rotation",exact:true})).toBeDisabled();
  expect(fixture.writes).toHaveLength(0); expect(fixture.errors).toEqual([]);
});

for (const zoom of [50,100]) test(`configurable snapping at ${zoom}% supports free movement distance and Alt bypass`, async ({page})=>{
  const fixture = await setupRotation(page);
  const source = fixture.server().canvas!;
  source.layers[0] = {...source.layers[0]!,x:100,y:100,width:100,height:40,rotation:90};
  source.layers[1] = {...source.layers[1]!,x:250,y:230,width:60,height:100,rotation:-90};
  source.pages[0]!.layers=source.layers;
  await page.reload(); await page.getByRole("slider").fill(String(zoom));
  const settings=page.getByLabel("Snapping settings",{exact:true});
  await settings.click();
  const toggle=page.getByLabel("Snap to edges and centers",{exact:true});
  const distance=page.getByLabel("Snap distance",{exact:true});
  await distance.selectOption("4");
  await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
  expect(fixture.writes).toHaveLength(0);
  await settings.click();
  const board=await sceneBox(page), scale=board.width/640;
  const title=page.locator('[data-studio-layer-id="title"]'), image=page.locator('[data-studio-layer-id="image"]');
  const before=(await title.boundingBox())!;
  const move=async (alt=false)=>{
    await page.mouse.move(before.x+before.width/2,before.y+before.height/2); await page.mouse.down();
    if(alt) await page.keyboard.down("Alt");
    await page.mouse.move(before.x+before.width/2+310*scale-6,before.y+before.height/2+13*scale,{steps:8});
  };
  const gap=async ()=>board.x+board.width-((await image.boundingBox())!.x+(await image.boundingBox())!.width);
  await move(); expect(await gap()).toBeCloseTo(6,0);
  await expect(page.locator('[data-studio-snap-guide="vertical"]')).toHaveCount(0);
  await page.keyboard.press("Escape"); await page.mouse.up();
  await settings.click(); await distance.selectOption("12"); await settings.click();
  await move(); expect(await gap()).toBeCloseTo(0,0);
  await expect(page.locator('[data-studio-snap-guide="vertical"]')).toBeVisible();
  await page.keyboard.press("Escape"); await page.mouse.up();
  await move(true); expect(await gap()).toBeCloseTo(6,0);
  await expect(page.locator('[data-studio-snap-guide]')).toHaveCount(0);
  await page.keyboard.up("Alt"); await page.keyboard.press("Escape"); await page.mouse.up();
  await settings.click(); await toggle.uncheck(); await settings.click();
  await move(); expect(await gap()).toBeCloseTo(6,0); await page.mouse.up();
  await page.getByRole("button",{name:"Save draft",exact:true}).click();
  await expect.poll(()=>fixture.server().canvas!.layers[0]!.x).toBeCloseTo(410-6/scale);
  await page.getByRole("button",{name:"Undo",exact:true}).click();
  expect((await title.boundingBox())!.x).toBeCloseTo(before.x,0);
  await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"Redo",exact:true}).click();
  await page.getByRole("button",{name:"Save draft",exact:true}).click();
  const saved=structuredClone(fixture.server().canvas!.layers);
  await page.reload(); expect(fixture.server().canvas!.layers).toEqual(saved);
  await settings.click(); await expect(toggle).toBeChecked(); await expect(distance).toHaveValue("8");
  expect(fixture.errors).toEqual([]);
});

test("canvas regains keyboard focus after toolbar use and Space pans without editing artwork",async ({page})=>{
  const fixture=await setup(page);
  const title=page.locator('[data-studio-layer-id="title"]'); await title.click();
  const copy=page.getByRole("button",{name:"Copy",exact:true}); await copy.click(); await expect(copy).toBeFocused();
  await title.click();
  await expect(page.getByRole("region",{name:"Canvas workspace",exact:true})).toBeFocused();
  const before=await sceneBox(page);
  await page.keyboard.down("Space");
  await page.mouse.move(before.x-10,before.y+10); await page.mouse.down();
  await expect(page.locator('[data-studio-gesture="pan"]')).toHaveCount(1);
  await page.mouse.move(before.x+30,before.y+40,{steps:6}); await page.mouse.up(); await page.keyboard.up("Space");
  const after=await sceneBox(page);
  expect(after.x-before.x).toBeCloseTo(40,0); expect(after.y-before.y).toBeCloseTo(30,0);
  await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
  expect(fixture.writes).toHaveLength(0); expect(fixture.errors).toEqual([]);
});

test("snapping settings support native keyboard activation dismissal and focus return",async ({page})=>{
  const fixture=await setup(page);
  const settings=page.getByRole("button",{name:"Snapping settings",exact:true});
  await settings.focus(); await settings.press("Space");
  const panel=page.getByRole("dialog",{name:"Canvas snapping",exact:true});
  await expect(panel).toBeVisible();
  const toggle=page.getByLabel("Snap to edges and centers",{exact:true});
  await toggle.focus(); await toggle.press("Space"); await expect(toggle).not.toBeChecked();
  await toggle.press("Escape"); await expect(panel).not.toBeVisible(); await expect(settings).toBeFocused();
  await settings.press("Enter"); await expect(panel).toBeVisible();
  const close=page.getByRole("button",{name:"Close snapping settings",exact:true});
  await close.focus(); await close.press("Space");
  await expect(panel).not.toBeVisible(); await expect(settings).toBeFocused();
  await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
  expect(fixture.writes).toHaveLength(0); expect(fixture.errors).toEqual([]);
});

test.describe("snapping settings on phone",()=>{
  test.use({viewport:{width:390,height:1000},hasTouch:true});
  test("snapping settings are touch accessible and do not change a viewer document",async ({page})=>{
    const fixture=await setup(page,{viewer:true});
    const before=structuredClone(fixture.server());
    await page.getByLabel("Snapping settings",{exact:true}).tap();
    await page.getByLabel("Snap to edges and centers",{exact:true}).uncheck();
    await page.getByLabel("Snap distance",{exact:true}).selectOption("24");
    const panel=page.getByRole("dialog",{name:"Canvas snapping",exact:true});
    const box=(await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x+box.width).toBeLessThanOrEqual(390);
    expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y+box.height).toBeLessThanOrEqual(1000);
    expect(await panel.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    await expect(page.getByRole("button",{name:"Close snapping settings",exact:true})).toBeVisible();
    await page.screenshot({path:test.info().outputPath("phone-snapping-settings.png")});
    await page.getByLabel("Snapping settings",{exact:true}).tap();
    expect(fixture.writes).toHaveLength(0); expect(fixture.server()).toEqual(before);
    expect(fixture.errors).toEqual([]);
  });
});

for (const width of [390,834]) test.describe(`workspace panel taps at ${width}px`,()=>{
  test.use({viewport:{width,height:1000},hasTouch:true});
  test("workspace panel taps reject cancellation and drags and activate exactly once",async ({page})=>{
    const fixture=await setup(page,{viewer:true});
    const inspector=page.getByRole("button",{name:"Inspector",exact:true});
    const box=(await inspector.boundingBox())!, x=box.x+box.width/2,y=box.y+box.height/2;
    const client=await page.context().newCDPSession(page);
    const start=()=>client.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y,id:1}]});
    await start(); await client.send("Input.dispatchTouchEvent",{type:"touchCancel",touchPoints:[]});
    await expect(inspector).toHaveAttribute("aria-pressed","false");
    await start(); await client.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:x+20,y,id:1}]});
    await client.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    await expect(inspector).toHaveAttribute("aria-pressed","false");
    await start(); await client.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    await expect(inspector).toHaveAttribute("aria-pressed","true");
    await client.detach();
    await inspector.focus(); await inspector.press("Space");
    await expect(inspector).toHaveAttribute("aria-pressed","false");
    await inspector.tap(); await expect(inspector).toHaveAttribute("aria-pressed","true");
    await inspector.tap(); await expect(inspector).toHaveAttribute("aria-pressed","false");
    const create=page.getByRole("button",{name:"Create",exact:true});
    await create.tap(); await expect(create).toHaveAttribute("aria-pressed","true");
    await create.press("Enter"); await expect(create).toHaveAttribute("aria-pressed","false");
    expect(fixture.writes).toHaveLength(0); expect(fixture.errors).toEqual([]);
  });
});

for (const zoom of [50,100]) test(`snapping rotated groups at ${zoom}% uses visible bounds and one persistent gesture`, async ({ page }) => {
  const fixture = await setup(page);
  const source = fixture.server().canvas!;
  source.layers = [
    canvasLayerSchema.parse({id:"title",type:"rect",x:100,y:100,width:100,height:40,rotation:90,groupId:"pair",fill:"#f04b32"}),
    canvasLayerSchema.parse({id:"image",type:"rect",x:250,y:230,width:60,height:100,rotation:-90,groupId:"pair",fill:"#24a07a"}),
  ];
  source.pages[0]!.layers = source.layers;
  await page.reload();
  await page.getByRole("slider").fill(String(zoom));
  const board = await sceneBox(page), scale = board.width/640;
  const title = page.locator('[data-studio-layer-id="title"]'), image = page.locator('[data-studio-layer-id="image"]');
  const beforeTitle = (await title.boundingBox())!, beforeImage = (await image.boundingBox())!;
  await page.mouse.move(beforeTitle.x+beforeTitle.width/2,beforeTitle.y+beforeTitle.height/2);
  await page.mouse.down();
  // End six screen pixels short of the visible right boundary: magnetism is zoom-independent.
  await page.mouse.move(beforeTitle.x+beforeTitle.width/2+310*scale-6,beforeTitle.y+beforeTitle.height/2+13*scale,{steps:8});
  const guide = page.locator('[data-studio-snap-guide="vertical"]');
  await expect(guide).toBeVisible();
  expect((await image.boundingBox())!.x+(await image.boundingBox())!.width).toBeCloseTo(board.x+board.width,0);
  await page.screenshot({path:test.info().outputPath(`snapped-group-${zoom}.png`)});
  await page.mouse.up();
  await expect(guide).toHaveCount(0);
  expect((await image.boundingBox())!.x-(await title.boundingBox())!.x).toBeCloseTo(beforeImage.x-beforeTitle.x,0);
  await page.getByRole("button",{name:"Undo",exact:true}).click();
  expect((await title.boundingBox())!.x).toBeCloseTo(beforeTitle.x,0);
  await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"Redo",exact:true}).click();
  await page.getByRole("button",{name:"Save draft",exact:true}).click();
  await expect.poll(()=>fixture.server().canvas!.layers[0]!.x).toBeCloseTo(410);
  expect(fixture.server().canvas!.layers[1]!.x).toBeCloseTo(560);
  expect(fixture.server().canvas!.layers.map(l=>l.rotation)).toEqual([90,-90]);
  await page.reload();
  expect((await image.boundingBox())!.x+(await image.boundingBox())!.width).toBeCloseTo((await sceneBox(page)).x+(await sceneBox(page)).width,0);
  expect(fixture.errors).toEqual([]);
});

test("snapping rotated artwork to a rotated stationary edge survives cancel undo and reopen", async ({ page }) => {
  const fixture = await setup(page);
  const source = fixture.server().canvas!;
  source.layers = [
    canvasLayerSchema.parse({id:"title",type:"rect",x:80,y:350,width:160,height:40,rotation:90,fill:"#f04b32"}),
    canvasLayerSchema.parse({id:"image",type:"rect",x:330,y:100,width:180,height:60,rotation:90,locked:true,fill:"#24a07a"}),
  ];
  source.pages[0]!.layers = source.layers;
  await page.reload();
  const board = await sceneBox(page), scale = board.width/640;
  const title = page.locator('[data-studio-layer-id="title"]'), image = page.locator('[data-studio-layer-id="image"]');
  const before = (await title.boundingBox())!, target = (await image.boundingBox())!;
  const drag = async () => {
    await page.mouse.move(before.x+before.width/2,before.y+before.height/2);
    await page.mouse.down();
    await page.mouse.move(before.x+before.width/2+267*scale,before.y+before.height/2+11*scale,{steps:8});
    await expect(page.locator('[data-studio-snap-guide="vertical"]')).toBeVisible();
    const moved = (await title.boundingBox())!;
    expect(moved.x+moved.width).toBeCloseTo(target.x+target.width,0);
  };
  await drag(); await page.keyboard.press("Escape"); await page.mouse.up();
  expect((await title.boundingBox())!.x).toBeCloseTo(before.x,0);
  await expect(page.locator('[data-studio-snap-guide]')).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
  expect(fixture.writes).toHaveLength(0);
  await drag(); await page.mouse.up();
  await page.getByRole("button",{name:"Save draft",exact:true}).click();
  await expect.poll(()=>fixture.server().canvas!.layers[0]!.x).toBeCloseTo(350);
  expect(fixture.server().canvas!.layers[1]!).toEqual(source.layers[1]);
  await page.reload();
  const reopened = (await title.boundingBox())!, stationary = (await image.boundingBox())!;
  expect(reopened.x+reopened.width).toBeCloseTo(stationary.x+stationary.width,0);
  expect(fixture.errors).toEqual([]);
});

test("arrange preserves rotated group offsets through undo save and reopen", async ({ page }) => {
  const fixture = await setup(page);
  const source = fixture.server().canvas!;
  source.layers[0] = { ...source.layers[0]!, x:100, y:100, width:180, height:50, rotation:30, groupId:"pair" };
  source.layers[1] = { ...source.layers[1]!, x:300, y:300, width:80, height:100, rotation:-30, groupId:"pair" };
  source.pages[0]!.layers = source.layers;
  await page.reload();
  const title = page.locator('[data-studio-layer-id="title"]'), image = page.locator('[data-studio-layer-id="image"]');
  const board = await sceneBox(page), beforeTitle = (await title.boundingBox())!, beforeImage = (await image.boundingBox())!;
  await title.click();
  await expect(page.getByRole("button", { name:"Distribute horizontally", exact:true })).toBeDisabled();
  await page.getByRole("button", { name:"Align left", exact:true }).click();
  const afterTitle = (await title.boundingBox())!, afterImage = (await image.boundingBox())!;
  expect(Math.min(afterTitle.x,afterImage.x)).toBeCloseTo(board.x,0);
  expect(afterImage.x-afterTitle.x).toBeCloseTo(beforeImage.x-beforeTitle.x,0);
  expect(afterImage.y-afterTitle.y).toBeCloseTo(beforeImage.y-beforeTitle.y,0);
  await page.getByRole("button", { name:"Undo", exact:true }).click();
  expect((await title.boundingBox())!.x).toBeCloseTo(beforeTitle.x,0);
  expect((await image.boundingBox())!.x).toBeCloseTo(beforeImage.x,0);
  await page.getByRole("button", { name:"Redo", exact:true }).click();
  await page.getByRole("button", { name:"Save draft", exact:true }).click();
  await expect.poll(()=>fixture.server().canvas!.layers[0]!.x).not.toBe(100);
  expect(fixture.server().canvas!.layers[1]!.x-fixture.server().canvas!.layers[0]!.x).toBeCloseTo(200);
  await page.reload();
  expect((await image.boundingBox())!.x-(await title.boundingBox())!.x).toBeCloseTo(beforeImage.x-beforeTitle.x,0);
  expect(fixture.errors).toEqual([]);
  await page.screenshot({ path:test.info().outputPath("arranged-rotated-group.png") });
});

test("arrange distributes rotated visible frames with equal gaps and persistent history", async ({ page }) => {
  const fixture = await setup(page);
  const source = fixture.server().canvas!;
  source.layers = [
    canvasLayerSchema.parse({ id:"title",type:"rect",x:50,y:100,width:100,height:40,rotation:30,fill:"#ff0000" }),
    canvasLayerSchema.parse({ id:"middle",type:"rect",x:180,y:220,width:80,height:120,rotation:-45,fill:"#00ff00" }),
    canvasLayerSchema.parse({ id:"last",type:"rect",x:450,y:350,width:70,height:90,rotation:60,fill:"#0000ff" }),
  ];
  source.pages[0]!.layers = source.layers;
  const ids = ["title","middle","last"];
  const boxes = async () => Promise.all(ids.map(async id => (await page.locator(`[data-studio-layer-id="${id}"]`).boundingBox())!));
  await page.reload();
  await expect(page.locator('[data-studio-layer-id="last"]')).toBeVisible();
  const before = await boxes();
  await dragMarquee(page,[2,2],[620,620]);
  await page.getByRole("button", { name:"Distribute horizontally", exact:true }).click();
  const after = await boxes();
  expect(after[1]!.x-after[0]!.x-after[0]!.width).toBeCloseTo(after[2]!.x-after[1]!.x-after[1]!.width,0);
  expect(after[0]!.x).toBeCloseTo(before[0]!.x,0);
  expect(after[2]!.x+after[2]!.width).toBeCloseTo(before[2]!.x+before[2]!.width,0);
  await page.getByRole("button", { name:"Undo", exact:true }).click();
  expect((await boxes())[1]!.x).toBeCloseTo(before[1]!.x,0);
  await page.getByRole("button", { name:"Redo", exact:true }).click();
  await page.getByRole("button", { name:"Save draft", exact:true }).click();
  await expect.poll(()=>fixture.server().canvas!.layers[1]!.x).not.toBe(180);
  expect(fixture.server().canvas!.layers.map(l=>[l.y,l.rotation])).toEqual([[100,30],[220,-45],[350,60]]);
  await page.reload();
  const reopened = await boxes();
  expect(reopened[1]!.x-reopened[0]!.x-reopened[0]!.width).toBeCloseTo(reopened[2]!.x-reopened[1]!.x-reopened[1]!.width,0);
  expect(fixture.errors).toEqual([]);
  await page.screenshot({ path:test.info().outputPath("distributed-rotated-frames.png") });
});

test("arrange rejects out-of-range group movement without losing artwork or history", async ({ page }) => {
  const fixture = await setup(page);
  const source = fixture.server().canvas!;
  source.layers[0] = {...source.layers[0]!,x:-2000,groupId:"wide"};
  source.layers[1] = {...source.layers[1]!,x:4000,groupId:"wide"};
  source.pages[0]!.layers = source.layers;
  const before = structuredClone(source);
  await page.reload();
  await page.getByRole("button", { name:"Layers", exact:true }).click();
  await page.getByRole("button").filter({has:page.getByText("Title",{exact:true})}).click();
  await page.getByRole("button", { name:"Align left", exact:true }).click();
  await expect(page.getByRole("alert", {name:"Arrange error",exact:true})).toContainText("supported canvas range");
  await expect(page.getByRole("button", { name:"Undo", exact:true })).toBeDisabled();
  expect(fixture.writes).toHaveLength(0);
  expect(fixture.server().canvas).toEqual(before);
  await page.getByRole("button", { name:"Dismiss", exact:true }).click();
  await expect(page.getByRole("alert", {name:"Arrange error",exact:true})).toHaveCount(0);
  expect(fixture.errors).toEqual([]);
});

test("page settings rename reorder restore and export the saved page order", async ({ page }) => {
  const fixture = await setup(page, { twoPages: true });
  const second = fixture.server().canvas!.pages[1]!;
  second.width = 800; second.height = 400; second.layers[0]!.text = "Second content";
  await page.reload();
  await page.getByRole("button", { name: "Page settings", exact: true }).click();
  await expect(page.getByRole("button", { name: "Move page earlier", exact: true })).toBeDisabled();
  await page.getByLabel("Page name", { exact: true }).fill("Cover");
  expect(fixture.writes).toHaveLength(0);
  await page.getByRole("button", { name: "Rename page", exact: true }).click();
  await page.getByRole("button", { name: "Move page later", exact: true }).click();
  await expect(page.getByRole("button", { name: "Move page later", exact: true })).toBeDisabled();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.server().canvas!.pages.map(p => p.name)).toEqual(["Second", "Cover"]);
  expect(fixture.server().canvas!.layers[0]!.text).toBe("Original");
  await page.reload();
  await expect(page.locator('[data-studio-layer-id="title"]')).toContainText("Second content");
  await page.getByRole("button", { name: "Cover", exact: true }).click();
  await expect(page.locator('[data-studio-layer-id="title"]')).toContainText("Original");
  await page.getByText("More", { exact: true }).click();
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const pdf = await PDFDocument.load(readFileSync((await (await pdfDownload).path())!));
  expect(pdf.getPages().map(p => p.getSize())).toEqual([{ width: 600, height: 300 }, { width: 480, height: 480 }]);
  const zipDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download pages ZIP", exact: true }).click();
  const zip = await JSZip.loadAsync(readFileSync((await (await zipDownload).path())!));
  expect(Object.keys(zip.files).filter(n => n.endsWith(".png"))).toEqual(["01-Second.png", "02-Cover.png"]);
  await page.getByText("More", { exact: true }).click();
  await page.getByRole("button", { name: "Delete page", exact: true }).click();
  await expect(page.locator('[data-studio-layer-id="title"]')).toContainText("Second content");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Cover", exact: true }).click();
  await expect(page.locator('[data-studio-layer-id="title"]')).toContainText("Original");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.server().canvas!.pages.length).toBe(2);
  await page.reload();
  await expect(page.getByRole("button", { name: "Cover", exact: true })).toBeVisible();
  expect(fixture.errors).toEqual([]);
  await page.getByRole("button", { name: "Page settings", exact: true }).click();
  await page.screenshot({ path: test.info().outputPath("page-settings-desktop.png") });
});

for (const width of [390, 834]) test(`page settings at ${width}px preserve renamed reordered pages`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const fixture = await setup(page, { twoPages: true });
  await page.getByRole("button", { name: "Page settings", exact: true }).click();
  const name = page.getByLabel("Page name", { exact: true });
  await expect(name).toBeFocused();
  await name.fill("Phone cover"); await name.press("Enter");
  await page.getByRole("button", { name: "Move page later", exact: true }).click();
  await expect(page.getByRole("button", { name: "Move page earlier", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Move page later", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Phone cover", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: test.info().outputPath(`page-settings-${width}.png`) });
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.server().canvas!.pages.map(p => p.name)).toEqual(["Second", "Phone cover"]);
  await page.reload();
  await page.getByRole("button", { name: "Phone cover", exact: true }).click();
  await page.getByRole("button", { name: "Page settings", exact: true }).click();
  await expect(page.getByLabel("Page name", { exact: true })).toHaveValue("Phone cover");
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test("page settings do not give viewers page mutation controls", async ({ page }) => {
  const fixture = await setup(page, { twoPages: true, viewer: true });
  await page.getByRole("button", { name: "Page settings", exact: true }).click();
  await expect(page.getByLabel("Page name", { exact: true })).toBeDisabled();
  for (const name of ["Rename page", "Move page earlier", "Move page later", "Add page", "Duplicate page", "Delete page"])
    await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
  expect(fixture.writes).toHaveLength(0);
  expect(fixture.errors).toEqual([]);
});

test("duplicated groups move independently through undo save and reload", async ({ page }) => {
  const fixture = await setup(page);
  await dragMarquee(page, [2, 2], [340, 250]);
  await page.keyboard.press("Control+g");
  await page.keyboard.press("Control+d");
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.server().canvas!.layers.length).toBe(4);
  const saved = structuredClone(fixture.server().canvas!);
  expect(saved.layers[0]!.x).toBe(20);
  expect(saved.layers[1]!.x).toBe(20);
  expect(saved.layers[2]!.x).toBe(45);
  expect(saved.layers[3]!.x).toBe(45);
  expect(saved.layers[2]!.groupId).toBe(saved.layers[3]!.groupId);
  expect(saved.layers[2]!.groupId).not.toBe(saved.layers[0]!.groupId);
  await page.getByRole("button", { name: "Undo", exact: true }).first().click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.server().canvas!.layers[2]!.x).toBe(44);
  expect(fixture.server().canvas!.layers[0]!.x).toBe(20);
  await page.reload();
  await page.locator(`[data-studio-layer-id="${saved.layers[2]!.id}"]`).click();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.server().canvas!.layers[2]!.x).toBe(45);
  expect(fixture.server().canvas!.layers[3]!.x).toBe(45);
  expect(fixture.server().canvas!.layers.slice(0, 2).map(l => l.x)).toEqual([20, 20]);
  expect(fixture.errors).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("independent-duplicate-groups.png") });
});

test("marquee selects visible layers without changing the saved document", async ({ page }) => {
  const fixture = await setup(page);
  const title = page.locator('[data-studio-layer-id="title"]');
  const artboard = title.locator("..").locator("..");
  const box = (await artboard.boundingBox())!;
  await page.mouse.move(box.x + 2, box.y + 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.4, { steps: 8 });
  await expect(page.locator("[data-studio-marquee]")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("marquee-drag.png") });
  await page.mouse.up();
  await expect(page.getByText("2 layers selected.", { exact: false })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("marquee-selected.png") });
  expect(fixture.writes).toHaveLength(0);
  expect(fixture.errors).toEqual([]);
});
function canvas(missing = false) {
  const doc = emptyCanvasDocument({ width: 640, height: 640 });
  const text = canvasLayerSchema.parse({ id: "title", type: "text", name: "Title", text: "Original", x: 20, y: 20, width: 300, height: 70, fontSize: 32, color: "#111111" });
  const image = canvasLayerSchema.parse({ id: "image", type: "image", x: 20, y: 120, width: 100, height: 100, imageUrl: missing ? "http://127.0.0.1:38416/missing-image.png" : "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#00ff00"/></svg>').toString("base64") });
  doc.pages[0]!.layers = [text, image]; doc.layers = [text, image];
  doc.pages[0]!.backgroundColor = "#ffffff";
  return doc;
}

async function sceneBox(page: Page) {
  const title = page.locator('[data-studio-layer-id="title"]');
  await expect(title).toBeVisible();
  return (await title.locator("..").locator("..").boundingBox())!;
}

async function dragMarquee(page: Page, from: [number, number], to: [number, number], finish = true) {
  const box = await sceneBox(page);
  await page.mouse.move(box.x + from[0] * box.width / 640, box.y + from[1] * box.height / 640);
  await page.mouse.down();
  await page.mouse.move(box.x + to[0] * box.width / 640, box.y + to[1] * box.height / 640, { steps: 8 });
  if (finish) await page.mouse.up();
  return box;
}

test("marquee drawn backward selects both layers and a subsequent empty click clears selection", async ({ page }) => {
  const fixture = await setup(page);
  const box = await dragMarquee(page, [340, 250], [2, 2]);
  await expect(page.getByText("2 layers selected.", { exact: false })).toBeVisible();
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height * 0.9);
  for (const id of ["title", "image"]) await expect(page.locator(`[data-studio-layer-id="${id}"]`)).not.toHaveClass(/outline-orange-600/);
  expect(fixture.writes).toHaveLength(0);
  expect(fixture.errors).toEqual([]);
});

test("marquee Shift-addition preserves the previous selection", async ({ page }) => {
  const fixture = await setup(page);
  await page.locator('[data-studio-layer-id="image"]').click();
  await page.keyboard.down("Shift");
  await dragMarquee(page, [2, 2], [340, 100]);
  await page.keyboard.up("Shift");
  await expect(page.getByText("2 layers selected.", { exact: false })).toBeVisible();
  expect(fixture.writes).toHaveLength(0);
  expect(fixture.errors).toEqual([]);
});

test("marquee Escape cancellation preserves the selection and history", async ({ page }) => {
  const fixture = await setup(page);
  const image = page.locator('[data-studio-layer-id="image"]');
  await image.click();
  await dragMarquee(page, [2, 2], [340, 100], false);
  await expect(page.locator("[data-studio-marquee]")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator("[data-studio-marquee]")).toHaveCount(0);
  await expect(image).toHaveClass(/outline-orange-600/);
  await expect(page.locator('[data-studio-layer-id="title"]')).not.toHaveClass(/outline-orange-600/);
  await expect(page.getByRole("button", { name: "Undo", exact: true }).first()).toBeDisabled();
  expect(fixture.writes).toHaveLength(0);
  expect(fixture.errors).toEqual([]);
});

test("marquee expands visible group members and excludes locked or invisible layers", async ({ page }) => {
  const fixture = await setup(page);
  const source = fixture.server().canvas!;
  const title = { ...source.layers[0]!, width: 100, groupId: "pair" };
  const image = { ...source.layers[1]!, x: 400, y: 400, groupId: "pair" };
  source.layers = [title, image,
    canvasLayerSchema.parse({ id: "locked", type: "rect", x: 30, y: 30, width: 50, height: 50, locked: true, groupId: "pair" }),
    canvasLayerSchema.parse({ id: "invisible", type: "rect", x: 30, y: 30, width: 50, height: 50, opacity: 0, groupId: "pair" }),
  ];
  source.pages[0]!.layers = source.layers;
  await page.reload();
  await dragMarquee(page, [2, 2], [130, 100]);
  for (const id of ["title", "image"]) await expect(page.locator(`[data-studio-layer-id="${id}"]`)).toHaveClass(/outline-orange-600/);
  for (const id of ["locked", "invisible"]) await expect(page.locator(`[data-studio-layer-id="${id}"]`)).not.toHaveClass(/outline-orange-600/);
  expect(fixture.writes).toHaveLength(0);
  expect(fixture.errors).toEqual([]);
});

test("marquee lets a viewer inspect a selection without granting edit authority", async ({ page }) => {
  const fixture = await setup(page, { viewer: true });
  await dragMarquee(page, [2, 2], [340, 250]);
  for (const id of ["title", "image"]) await expect(page.locator(`[data-studio-layer-id="${id}"]`)).toHaveClass(/outline-orange-600/);
  await expect(page.getByRole("button", { name: "Undo", exact: true }).first()).toBeDisabled();
  expect(fixture.writes).toHaveLength(0);
  expect(fixture.errors).toEqual([]);
});

for (const width of [390, 834]) test.describe(`marquee touch at ${width}px`, () => {
  test.use({ viewport: { width, height: 1000 }, hasTouch: true });
  test("marquee uses real touch without native cancellation or document writes", async ({ page }) => {
    const fixture = await setup(page);
    const box = await sceneBox(page);
    const client = await page.context().newCDPSession(page);
    await page.evaluate(() => {
      (window as Window & { marqueeCanceled?: boolean }).marqueeCanceled = false;
      document.addEventListener("pointercancel", () => { (window as Window & { marqueeCanceled?: boolean }).marqueeCanceled = true; }, { once: true });
    });
    // Begin well inside empty canvas: near-edge touch adjustment can target a
    // nearby text layer even when the same mouse coordinate hits background.
    const x = box.x + box.width * 0.86, y = box.y + box.height * 0.55;
    const endX = box.x + 2, endY = box.y + 2;
    await page.evaluate(() => {
      (window as Window & { marqueeStartLayer?: string | null }).marqueeStartLayer = undefined;
      document.addEventListener("pointerdown", event => {
        (window as Window & { marqueeStartLayer?: string | null }).marqueeStartLayer = (event.target as Element).closest("[data-studio-layer-id]")?.getAttribute("data-studio-layer-id") ?? null;
      }, { once: true, capture: true });
    });
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    expect(await page.evaluate(() => (window as Window & { marqueeStartLayer?: string | null }).marqueeStartLayer)).toBeNull();
    for (let i = 1; i <= 6; i++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (endX - x) * i / 6, y: y + (endY - y) * i / 6, id: 1 }] });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    }
    await expect(page.locator("[data-studio-marquee]")).toBeVisible();
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await client.detach();
    for (const id of ["title", "image"]) await expect(page.locator(`[data-studio-layer-id="${id}"]`)).toHaveClass(/outline-orange-600/);
    expect(await page.evaluate(() => (window as Window & { marqueeCanceled?: boolean }).marqueeCanceled)).toBe(false);
    await page.screenshot({ path: test.info().outputPath(`marquee-${width}.png`) });
    expect(fixture.writes).toHaveLength(0);
    expect(fixture.errors).toEqual([]);
  });
});

test.describe("marquee touch interruption", () => {
  test.use({ viewport: { width: 390, height: 1000 }, hasTouch: true });
  test("marquee ignores a second finger and cancels without changing the previous selection", async ({ page }) => {
    const fixture = await setup(page);
    const image = page.locator('[data-studio-layer-id="image"]');
    await image.tap();
    const box = await sceneBox(page), imageBox = (await image.boundingBox())!;
    const client = await page.context().newCDPSession(page);
    const start = { x: box.x + box.width * 0.86, y: box.y + box.height * 0.55, id: 1 };
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
    const primary = { x: box.x + box.width * 0.55, y: box.y + box.height * 0.16, id: 1 };
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [primary] });
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [primary, { x: imageBox.x + imageBox.width / 2, y: imageBox.y + imageBox.height / 2, id: 2 }] });
    await expect(page.locator("[data-studio-marquee]")).toBeVisible();
    await client.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await client.detach();
    await expect(page.locator("[data-studio-marquee]")).toHaveCount(0);
    await expect(image).toHaveClass(/outline-orange-600/);
    await expect(page.locator('[data-studio-layer-id="title"]')).not.toHaveClass(/outline-orange-600/);
    expect(fixture.writes).toHaveLength(0);
    expect(fixture.errors).toEqual([]);
  });
  test("canceled touch transform restores its frame without an undo entry or save", async ({ page }) => {
    const fixture = await setup(page);
    const image = page.locator('[data-studio-layer-id="image"]');
    await image.tap();
    const before = (await image.boundingBox())!;
    const handle = (await image.getByRole("button", { name: "Resize right", exact: true }).boundingBox())!;
    const client = await page.context().newCDPSession(page);
    const x = handle.x + handle.width / 2, y = handle.y + handle.height / 2;
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= 4; i++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + i * 5, y }] });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    }
    expect((await image.boundingBox())!.width).toBeGreaterThan(before.width + 10);
    await client.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await client.detach();
    await expect.poll(async () => (await image.boundingBox())!.width).toBeCloseTo(before.width, 1);
    await expect(page.getByRole("button", { name: "Undo", exact: true }).first()).toBeDisabled();
    await page.waitForTimeout(800);
    expect(fixture.writes).toHaveLength(0);
    expect(fixture.errors).toEqual([]);
  });
});
function composition(audio = false) {
  const c = emptyStudioComposition({ width: 640, height: 640 });
  c.tracks.push({ id: "overlay", kind: "overlay", name: "Title", order: 5, muted: false, solo: false, volume: 1, locked: false });
  c.clips = [compositionClipSchema.parse({ id: "text", trackId: "overlay", startMs: 0, durationMs: 700, name: "Original", designLayer: { type: "text", text: "Original", fontSize: 64, color: "#ffffff" } })];
  if (audio) {
    c.tracks.push({ id: "sound", kind: "audio", name: "Tone", order: 6, muted: false, solo: false, volume: 1, locked: false });
    c.clips.push(compositionClipSchema.parse({ id: "tone", trackId: "sound", startMs: 0, durationMs: 1000, sourceUrl: "http://127.0.0.1:38416/tone.wav", name: "Tone" }));
  }
  return c;
}
async function cached(page: Page, video = false) {
  return page.evaluate(async ({ owner, id, video }) => new Promise<Record<string, unknown> | null>((resolve, reject) => {
    const req = indexedDB.open(video ? "kebu-studio-video-offline" : "kebu-studio-offline");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("drafts")) { db.close(); resolve(null); return; }
      const tx = db.transaction("drafts", "readonly"), row = tx.objectStore("drafts").get(`${owner}:${id}`);
      row.onsuccess = () => { resolve(row.result ?? null); db.close(); };
      row.onerror = () => reject(row.error);
    };
  }), { owner, id, video });
}
async function setup(page: Page, options: { video?: boolean; socialPost?: boolean; missing?: boolean; delay?: boolean; malformed?: boolean; conflict?: boolean; twoPages?: boolean; audio?: boolean; missingAudio?: boolean; history?: boolean; designSoundtrack?: boolean; sharing?: "offline" | "malformed"; viewer?: boolean; delayedRestore?: boolean; failedHistory?: boolean; customFonts?: { family: string; fileUrl: string }[] } = {}) {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const doc = canvas(options.missing); if(options.socialPost){doc.width=1080;doc.height=1080;doc.pages[0]!.width=1080;doc.pages[0]!.height=1080;} if (options.twoPages) doc.pages.push({ ...structuredClone(doc.pages[0]!), id: "second", name: "Second" });
  if (options.designSoundtrack) doc.soundtrack = { url: "http://127.0.0.1:38416/tone.wav", durationMs: 1000, bpm: null, beatsMs: [], snapToBeats: true };
  let server: { id: string; title: string; updated_at: string; business_id: null; source_design_id?: null; design_type?: string; canvas?: ReturnType<typeof canvas>; composition?: ReturnType<typeof composition> } = options.video ? { id, title: "Original video", composition: composition(options.audio), updated_at: rev(1), business_id: null, source_design_id: null } : { id, title: "QA design", design_type: options.socialPost?"instagram_post":"poster", canvas: doc, updated_at: rev(1), business_id: null };
  const writes: Record<string, unknown>[] = []; let release: (() => void) | undefined;
  const barrier = new Promise<void>(done => { release = done; });
  let releaseSecond!: () => void; const secondBarrier = new Promise<void>(done => { releaseSecond = done; });
  const api = options.video ? `/api/studio/video/${id}` : `/api/create/designs/${id}`;
  await page.route("**/api/**", async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (options.sharing && pathname.startsWith(`${api}/collaborators`)) {
      if (route.request().method() === "GET") { await route.fulfill({ json: { collaborators: [] } }); return; }
      if (options.sharing === "offline") { await route.abort("failed"); return; }
      await route.fulfill({ json: { collaborator: { id: "bad", email: "wrong@example.test", status: "active" } } }); return;
    }
    if (options.history && pathname.startsWith(`${api}/versions`)) {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: { versions: [{ id: "11111111-1111-4111-8111-111111111111", label: "Original checkpoint", source: "manual", created_at: rev(1) }] } }); return;
      }
      const body = route.request().postDataJSON(); writes.push({ ...body, history: true });
      if (pathname.endsWith("/restore")) {
        if (options.delayedRestore) await barrier;
        if (options.failedHistory) { await route.fulfill({ status: 503, json: { error: "Could not preserve your current canvas. Restore was cancelled." } }); return; }
        if (!("canvas" in server)) throw new Error("History fixture requires a design.");
        server = { ...server, canvas: doc, updated_at: rev(20) };
        await route.fulfill({ json: { design: server } }); return;
      }
      await route.fulfill({ status: 201, json: { versionId: "receipt" } }); return;
    }
    if (options.customFonts && pathname === "/api/studio/creative-assets/library") {
      await route.fulfill({ json: { items: options.customFonts.map((f, i) => ({ id: `asset-${i}`, acquiredAt: rev(1), asset: { id: `font-${i}`, kind: "font", name: f.family, fileUrl: f.fileUrl, previewUrl: null, licenseNote: null } })) } });
      return;
    }
    if (pathname !== api) { await route.fulfill({ json: { projects: [], businesses: [], profile: null } }); return; }
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON(); writes.push(body);
      if (writes.length === 1 && options.delay) await barrier;
      if (writes.length === 2 && options.delay) await secondBarrier;
      if (options.conflict || body.expectedUpdatedAt !== server.updated_at) { await route.fulfill({ status: 409, json: { code: options.video ? "studio_video_version_conflict" : "studio_version_conflict" } }); return; }
      server = { ...server, ...body, updated_at: rev(writes.length + 1) };
      await route.fulfill({ json: { [options.video ? "project" : "design"]: options.malformed ? { id: "wrong", updated_at: "invalid" } : server } }); return;
    }
    await route.fulfill({ json: { [options.video ? "project" : "design"]: server, userId: owner, access: { role: options.viewer ? "viewer" : "owner", canEdit: !options.viewer, canDelete: !options.viewer, canShare: !options.viewer } } });
  });
  await page.route("**/tone.wav", route => {
    const rate = 22050, samples = rate, bytes = Buffer.alloc(44 + samples * 2);
    bytes.write("RIFF",0); bytes.writeUInt32LE(bytes.length - 8,4); bytes.write("WAVEfmt ",8); bytes.writeUInt32LE(16,16);
    bytes.writeUInt16LE(1,20); bytes.writeUInt16LE(1,22); bytes.writeUInt32LE(rate,24); bytes.writeUInt32LE(rate * 2,28); bytes.writeUInt16LE(2,32); bytes.writeUInt16LE(16,34); bytes.write("data",36); bytes.writeUInt32LE(samples * 2,40);
    for(let i=0;i<samples;i++) bytes.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/rate)*6000),44+i*2);
    return route.fulfill(options.missingAudio ? { status:404, body:"Missing fixture audio" } : {contentType:"audio/wav",body:bytes});
  });
  await page.route("**/missing-image.png", route => route.fulfill({ status: 404, body: "Missing fixture media" }));
  // Fake session is confined to the loopback Auth fixture, never a hosted account.
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const token = [Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: owner, exp: expiry })).toString("base64url"), "fixture"].join(".");
  const session = { access_token: token, refresh_token: "local-fixture", expires_at: expiry, expires_in: 3600, token_type: "bearer", user: { id: owner, email: "qa@example.test", app_metadata: {}, user_metadata: {} } };
  await page.context().addCookies([{ name: "sb-127-auth-token", value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"), url: "http://127.0.0.1:38416", sameSite: "Lax" }]);
  const response = await page.goto(options.video ? `/studio/video/${id}` : `/studio/${id}`);
  expect(response?.headers()["content-security-policy"]).toContain("media-src 'self' https: blob:");
  if (options.video) await expect(page.getByLabel("Video title")).toHaveValue("Original video");
  else if (options.viewer) await expect(page.getByRole("heading", { name: "QA design", exact: true })).toBeVisible();
  else await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeVisible();
  return { writes, errors, release: () => release!(), releaseSecond, server: () => server };
}
async function editText(page: Page, text: string, initial = false) {
  if (initial) await page.getByText("Original", { exact: true }).first().locator("..").dblclick();
  await page.getByRole("textbox", { name: "Text", exact: true }).fill(text);
}

test("social-post template edits save reopen and export a real 1080-square image",async({page})=>{
  const fixture=await setup(page,{socialPost:true});
  await editText(page,'Yaw Laa Taan — May Lècor',true);
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect.poll(()=>fixture.server().canvas!.layers[0]!.text).toBe('Yaw Laa Taan — May Lècor');
  await page.reload();
  await expect(page.locator('[data-studio-layer-id="title"]')).toContainText('Yaw Laa Taan — May Lècor');
  await page.getByText('More',{exact:true}).click();
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download PNG',exact:true}).click();
  const png=readFileSync((await(await download).path())!);
  const dimensions=await page.evaluate(async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();return[image.width,image.height];},png.toString('base64'));
  expect(dimensions).toEqual([1080,1080]);
  const jpgDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download JPG',exact:true}).click();
  const jpg=readFileSync((await(await jpgDownload).path())!);
  expect([...jpg.subarray(0,3)]).toEqual([255,216,255]);
  const jpgDimensions=await page.evaluate(async data=>{const image=new Image();image.src='data:image/jpeg;base64,'+data;await image.decode();return[image.width,image.height];},jpg.toString('base64'));
  expect(jpgDimensions).toEqual([1080,1080]);
  expect(fixture.errors).toEqual([]);
});

test("artist footage can be trimmed saved reopened and exported with real video and audio",async({page})=>{
  const fixture=await setup(page,{video:true});
  const composition=fixture.server().composition!;
  const track=composition.tracks.find(t=>t.kind==='video')!;
  composition.clips.unshift(compositionClipSchema.parse({id:'artist-footage',trackId:track.id,name:'May supplied footage',sourceUrl:'http://127.0.0.1:38416/may-design-draft/artist/yaw-laa-taan-preview.mp4',startMs:0,durationMs:1000,sourceInMs:0}));
  await page.reload();
  const clip=page.getByRole('button').filter({has:page.getByText('May supplied footage',{exact:true})}).first();
  await clip.click();
  await page.getByLabel('Duration (ms)',{exact:true}).fill('600');
  await page.getByLabel('Source in (ms)',{exact:true}).fill('1000');
  await expect.poll(()=>fixture.server().composition!.clips.find(c=>c.id==='artist-footage')?.sourceInMs).toBe(1000);
  await expect.poll(()=>fixture.server().composition!.clips.find(c=>c.id==='artist-footage')?.durationMs).toBe(600);
  await page.reload();await clip.click();
  await expect(page.getByLabel('Source in (ms)',{exact:true})).toHaveValue('1000');
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export video',exact:true}).click();
  const file=await download;await file.saveAs(test.info().outputPath('artist-trimmed.webm'));
  const bytes=readFileSync((await file.path())!);
  const result=await page.evaluate(async data=>{
    const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0)),context=new AudioContext();
    const url=URL.createObjectURL(new Blob([bytes],{type:'video/webm'}));
    try{
      const decoded=await context.decodeAudioData(bytes.buffer);let sum=0;for(const sample of decoded.getChannelData(0))sum+=sample*sample;
      const video=document.createElement('video');video.src=url;await new Promise<void>((done,fail)=>{video.onloadeddata=()=>done();video.onerror=()=>fail(Error('Could not decode artist export'));});
      // loadeddata alone can precede Chromium's drawable video frame. Observe a
      // presented frame, as a visitor playing the downloaded file would.
      const presented=new Promise<void>(done=>video.requestVideoFrameCallback(()=>done()));
      video.muted=true;await video.play();await presented;video.pause();
      const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;const ctx=canvas.getContext('2d')!;ctx.drawImage(video,0,0);
      const colors=new Set<string>();for(let y=20;y<canvas.height;y+=40)for(let x=20;x<canvas.width;x+=40)colors.add([...ctx.getImageData(x,y,1,1).data].join(','));
      return{rms:Math.sqrt(sum/decoded.length),colors:colors.size};
    }finally{await context.close();URL.revokeObjectURL(url);}
  },bytes.toString('base64'));
  expect(result.rms).toBeGreaterThan(.001);expect(result.colors).toBeGreaterThan(5);expect(fixture.errors).toEqual([]);
});

test("design saves serialize and keep the newest IndexedDB draft dirty until acknowledged", async ({ page }) => {
  const fixture = await setup(page, { delay: true });
  await editText(page, "First edit", true); await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBe(1);
  await editText(page, "Newest edit"); await page.getByRole("button", { name: "Save draft", exact: true }).click();
  expect(fixture.writes).toHaveLength(1);
  await expect.poll(async () => JSON.stringify((await cached(page))?.canvas)).toContain("Newest edit");
  expect((await cached(page))?.dirty).toBe(true); fixture.release();
  await expect.poll(() => fixture.writes.length).toBe(2);
  expect(fixture.writes.map(x => x.expectedUpdatedAt)).toEqual([rev(1), rev(2)]);
  expect((await cached(page))?.dirty).toBe(true);
  expect(JSON.stringify((await cached(page))?.canvas)).toContain("Newest edit");
  fixture.releaseSecond();
  await expect.poll(async () => (await cached(page))?.dirty).toBe(false);
  const local = await cached(page); expect(JSON.stringify(local?.canvas)).toContain("Newest edit");
  await page.reload(); await expect(page.getByText("Newest edit", { exact: true }).first()).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test("video title saves serialize on mobile and preserve the newest local title", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); const fixture = await setup(page, { video: true, delay: true });
  await page.getByLabel("Video title").fill("First title"); await page.getByLabel("Video title").blur();
  await expect.poll(() => fixture.writes.length).toBe(1);
  await page.getByLabel("Video title").fill("Newest title"); await page.getByLabel("Video title").blur();
  expect(fixture.writes).toHaveLength(1);
  await expect.poll(async () => (await cached(page, true))?.title).toBe("Newest title");
  expect((await cached(page, true))?.dirty).toBe(true); fixture.release();
  await expect.poll(() => fixture.writes.length).toBe(2);
  expect(fixture.writes.map(x => x.expectedUpdatedAt)).toEqual([rev(1), rev(2)]);
  expect((await cached(page, true))?.dirty).toBe(true);
  expect((await cached(page, true))?.title).toBe("Newest title");
  fixture.releaseSecond();
  await expect.poll(async () => (await cached(page, true))?.dirty).toBe(false);
  expect((await cached(page, true))?.title).toBe("Newest title");
  expect(fixture.errors).toEqual([]);
});

test("a malformed receipt leaves the current draft dirty and stops further network writes", async ({ page }) => {
  const fixture = await setup(page, { malformed: true }); await editText(page, "Do not lose this", true);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Save failed", { exact: true })).toBeVisible();
  expect((await cached(page))?.dirty).toBe(true);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  expect(fixture.writes).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole("button", { name: "Keep my version", exact: true })).toBeEnabled();
  expect(fixture.writes).toHaveLength(1); expect(fixture.errors).toEqual([]);
});

test("a conflict retains local edits and does not silently overwrite the server", async ({ page }) => {
  const fixture = await setup(page, { conflict: true }); await editText(page, "Local conflict", true);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("button", { name: "Use server version", exact: true })).toBeEnabled();
  expect((await cached(page))?.dirty).toBe(true); expect(fixture.writes).toHaveLength(1);
  await page.getByRole("button", { name: "Use server version", exact: true }).click();
  await expect(page.getByText("Original", { exact: true }).first()).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test("PNG, PDF and ZIP are real rendered downloads including supplied imagery", async ({ page }) => {
  const fixture = await setup(page, { twoPages: true }); await page.getByText("More", { exact: true }).click();
  const pngDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "Download PNG", exact: true }).click();
  const png = readFileSync((await (await pngDownload).path())!); expect([...png.subarray(0, 8)]).toEqual([137,80,78,71,13,10,26,10]);
  const pixel = await page.evaluate(async data => { const image = new Image(); image.src = "data:image/png;base64," + data; await image.decode(); const c = document.createElement("canvas"); c.width = image.width; c.height = image.height; const ctx = c.getContext("2d")!; ctx.drawImage(image, 0, 0); return { width: image.width, height: image.height, pixel: [...ctx.getImageData(70,170,1,1).data] }; }, png.toString("base64"));
  expect(pixel).toEqual({ width: 640, height: 640, pixel: [0,255,0,255] });
  const pdfDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const pdf = await PDFDocument.load(readFileSync((await (await pdfDownload).path())!)); expect(pdf.getPageCount()).toBe(2);
  const zipDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "Download pages ZIP", exact: true }).click();
  const zip = await JSZip.loadAsync(readFileSync((await (await zipDownload).path())!)); expect(Object.keys(zip.files).filter(x => x.endsWith(".png"))).toHaveLength(2);
  expect(fixture.errors).toEqual([]);
});

test("missing media blocks PNG export instead of downloading a placeholder", async ({ page }) => {
  const fixture = await setup(page, { missing: true }); const downloads: string[] = []; page.on("download", x => downloads.push(x.suggestedFilename()));
  await page.getByText("More", { exact: true }).click(); await page.getByRole("button", { name: "Download PNG", exact: true }).click();
  await expect(page.getByText("Could not render PNG.", { exact: true })).toBeVisible(); expect(downloads).toEqual([]); expect(fixture.errors).toEqual([]);
});

test("video export produces decodable WebM frames", async ({ page }) => {
  const fixture = await setup(page, { video: true }); const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  const bytes = readFileSync((await (await download).path())!); expect([...bytes.subarray(0,4)]).toEqual([26,69,223,163]);
  const info = await page.evaluate(async data => { const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0)); const url = URL.createObjectURL(new Blob([bytes], { type: "video/webm" })); const video = document.createElement("video"); video.src = url; await new Promise<void>((done, fail) => { video.onloadeddata = () => done(); video.onerror = () => fail(Error("Cannot decode export")); }); const info = { width: video.videoWidth, height: video.videoHeight }; URL.revokeObjectURL(url); return info; }, bytes.toString("base64"));
  expect(info).toEqual({ width: 320, height: 320 }); expect(fixture.errors).toEqual([]);
});

test("offline design edits cache locally and sync through the current revision on reconnect", async ({ page }) => {
  const fixture = await setup(page); await editText(page, "Offline latest", true);
  await page.context().setOffline(true); await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Offline · changes not synced", { exact: true })).toBeVisible();
  await expect.poll(async () => (await cached(page))?.dirty).toBe(true); expect(fixture.writes).toEqual([]);
  await page.context().setOffline(false); await expect.poll(() => fixture.writes.length).toBe(1);
  await expect.poll(async () => (await cached(page))?.dirty).toBe(false);
  expect(fixture.writes[0]?.expectedUpdatedAt).toBe(rev(1)); expect(fixture.errors).toEqual([]);
});

test("storage failure while offline leaves the editor visible and does not claim a local save", async ({ page }) => {
  const fixture = await setup(page); await editText(page, "Keep this tab open", true);
  await page.evaluate(() => { indexedDB.open = () => { throw new DOMException("Local test quota", "QuotaExceededError"); }; });
  await page.context().setOffline(true); await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Save failed", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Text", exact: true })).toHaveValue("Keep this tab open");
  await expect(page.getByRole("alert").filter({ hasText: "Could not save this draft on your device" })).toBeVisible();
  expect(fixture.writes).toEqual([]); expect(fixture.errors).toEqual([]);
});

test("video export includes decodable audible samples", async ({ page }) => {
  const fixture = await setup(page, { video: true, audio: true }); const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  const bytes = readFileSync((await (await download).path())!);
  const rms = await page.evaluate(async data => {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0)), context = new AudioContext();
    try { const decoded = await context.decodeAudioData(bytes.buffer); const samples = decoded.getChannelData(0); let sum = 0; for (const sample of samples) sum += sample * sample; return Math.sqrt(sum / samples.length); }
    finally { await context.close(); }
  }, bytes.toString("base64"));
  expect(rms).toBeGreaterThan(0.001);
  const wavDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download WAV audio',exact:true}).click();
  const wav=readFileSync((await(await wavDownload).path())!);
  expect(wav.subarray(0,4).toString()).toBe('RIFF');expect(wav.subarray(8,12).toString()).toBe('WAVE');
  const wavRms=await page.evaluate(async data=>{const context=new AudioContext();try{const buffer=Uint8Array.from(atob(data),c=>c.charCodeAt(0));const decoded=await context.decodeAudioData(buffer.buffer);let sum=0;for(const sample of decoded.getChannelData(0))sum+=sample*sample;return Math.sqrt(sum/decoded.length);}finally{await context.close();}},wav.toString('base64'));
  expect(wavRms).toBeGreaterThan(.001);expect(fixture.errors).toEqual([]);
});

test("unavailable audio blocks video export instead of producing a silent success", async ({ page }) => {
  const fixture = await setup(page, { video: true, audio: true, missingAudio: true }); const downloads: string[] = []; page.on("download", x => downloads.push(x.suggestedFilename()));
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  await expect(page.getByText("One or more audio files could not be loaded for export.", { exact: true })).toBeVisible();
  expect(downloads).toEqual([]); expect(fixture.errors).toEqual([]);
});

test("the design page timeline exports a decodable WebM", async ({ page }) => {
  const fixture = await setup(page); await page.getByText("More", { exact: true }).click();
  const download = page.waitForEvent("download", { timeout: 20000 });
  await page.getByRole("button", { name: "Export timeline", exact: true }).click();
  const bytes = readFileSync((await (await download).path())!);
  expect([...bytes.subarray(0,4)]).toEqual([26,69,223,163]);
  const size = await page.evaluate(async data => {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0)), url = URL.createObjectURL(new Blob([bytes], { type: "video/webm" }));
    try { const video = document.createElement("video"); video.src = url; await new Promise<void>((done, fail) => { video.onloadeddata = () => done(); video.onerror = () => fail(Error("Cannot decode timeline")); }); return [video.videoWidth, video.videoHeight]; }
    finally { URL.revokeObjectURL(url); }
  }, bytes.toString("base64"));
  expect(size).toEqual([320,320]); expect(fixture.errors).toEqual([]);
});

async function openHistory(page: Page) {
  await page.getByText("More", { exact: true }).click();
  await page.getByRole("button", { name: "Versions", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Version history" })).toBeVisible();
  await page.getByText("More", { exact: true }).click();
}
test("named history saves the latest draft before capturing a version", async ({ page }) => {
  const fixture = await setup(page, { history: true });
  await editText(page, "Named latest", true); await openHistory(page);
  await page.getByPlaceholder("Name this version").fill("My checkpoint");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => fixture.writes.some(x => x.history)).toBe(true);
  const named = fixture.writes.findIndex(x => x.history);
  expect(named).toBeGreaterThan(0); expect(JSON.stringify(fixture.writes[named - 1]?.canvas)).toContain("Named latest");
  expect(fixture.writes[named]?.expectedUpdatedAt).toBe(fixture.server().updated_at);
  expect(fixture.errors).toEqual([]);
});
test("history restore preserves edits made during a delayed response", async ({ page }) => {
  const fixture = await setup(page, { history: true, delayedRestore: true });
  await editText(page, "Before restore", true); await openHistory(page);
  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect.poll(() => fixture.writes.some(x => x.versionId)).toBe(true);
  await editText(page, "Newer local edit"); fixture.release();
  await expect(page.getByRole("button", { name: "Keep my version" })).toBeVisible();
  await expect(page.getByText("Newer local edit", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Keep my version" }).click();
  await expect.poll(() => JSON.stringify(fixture.server())).toContain("Newer local edit");
  expect(fixture.writes.at(-1)?.expectedUpdatedAt).toBe(rev(20)); expect(fixture.errors).toEqual([]);
});
test("failed restore leaves the editor and saved draft intact", async ({ page }) => {
  const fixture = await setup(page, { history: true, failedHistory: true });
  await editText(page, "Keep this draft", true); await openHistory(page);
  page.on("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Restore was cancelled" })).toContainText("Restore was cancelled");
  await expect(page.getByText("Keep this draft", { exact: true }).first()).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

for (const failure of ["offline", "malformed"] as const) {
  test(`sharing ${failure} failure is visible and does not claim an invitation`, async ({ page }) => {
    const fixture = await setup(page, { sharing: failure });
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("colleague@example.test");
    await page.getByRole("button", { name: "Invite", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: failure === "offline" ? "Could not invite" : "Could not confirm" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reload share list" })).toBeVisible();
    await expect(page.getByText(/^Invited /)).toHaveCount(0); expect(fixture.errors).toEqual([]);
  });
}
test("viewers cannot save or invite collaborators in the editor", async ({ page }) => {
  const fixture = await setup(page, { viewer: true });
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("paragraph").filter({ hasText: /^View only$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Invite", exact: true })).toHaveCount(0);
  expect(fixture.writes).toHaveLength(0); expect(fixture.errors).toEqual([]);
});

test("design timeline export includes the saved soundtrack as audible samples", async ({ page }) => {
  const fixture = await setup(page, { designSoundtrack: true });
  await expect(page.getByRole("spinbutton", { name: "Scene duration", exact: true })).toBeVisible(); await page.getByText("More", { exact: true }).click();
  const download = page.waitForEvent("download", { timeout: 20000 }); await page.getByRole("button", { name: "Export timeline", exact: true }).click();
  const bytes = readFileSync((await (await download).path())!);
  const rms = await page.evaluate(async base64 => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0)); const context = new AudioContext();
    try { const audio = await context.decodeAudioData(bytes.buffer); const channel = audio.getChannelData(0); return Math.sqrt(channel.reduce((sum,v) => sum + v*v,0) / channel.length); }
    finally { await context.close(); }
  }, bytes.toString("base64"));
  expect(rms).toBeGreaterThan(0.001); expect(fixture.errors).toEqual([]);
});
test("missing design soundtrack blocks timeline download with an honest error", async ({ page }) => {
  const fixture = await setup(page, { designSoundtrack: true, missingAudio: true }); const downloads: string[]=[]; page.on("download", item => downloads.push(item.suggestedFilename()));
  await page.getByText("More", { exact: true }).click(); await page.getByRole("button", { name: "Export timeline", exact: true }).click();
  await expect(page.getByText("Could not load the soundtrack for export. No file was exported.", { exact: true })).toBeVisible();
  expect(downloads).toEqual([]); expect(fixture.errors).toEqual([]);
});


test("eight resize handles support ratio, centered dragging, undo and persistent geometry", async ({ page }) => {
  const fixture = await setup(page);
  const layer = page.locator('[data-studio-layer-id="title"]');
  await layer.click();
  await expect(layer.getByRole("button", { name: /^Resize / })).toHaveCount(8);
  const before = await layer.boundingBox(); expect(before).not.toBeNull();
  const handle = layer.getByRole("button", { name: "Resize right", exact: true });
  const bounds = await handle.boundingBox(); expect(bounds).not.toBeNull();
  await page.keyboard.down("Alt"); await page.keyboard.down("Shift");
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.down(); await page.mouse.move(bounds!.x + bounds!.width / 2 + 30, bounds!.y + bounds!.height / 2, { steps: 5 }); await page.mouse.up();
  await page.keyboard.up("Shift"); await page.keyboard.up("Alt");
  await expect(layer.getByRole("button", { name: /^Resize / })).toHaveCount(8);
  await expect(page.getByRole("status")).toHaveText("Unsaved changes");
  const after = await layer.boundingBox(); expect(after!.width).toBeGreaterThan(before!.width + 50);
  expect(after!.width / after!.height).toBeCloseTo(300 / 70, 3);
  expect(after!.x + after!.width / 2).toBeCloseTo(before!.x + before!.width / 2, 0);
  expect(after!.y + after!.height / 2).toBeCloseTo(before!.y + before!.height / 2, 0);
  await page.getByRole("button", { name: "Undo", exact: true }).first().click();
  await expect.poll(async () => (await layer.boundingBox())!.width).toBeCloseTo(before!.width, 0);
  await page.getByRole("button", { name: "Redo", exact: true }).first().click();
  await expect.poll(async () => (await layer.boundingBox())!.width).toBeCloseTo(after!.width, 0);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBeGreaterThan(0);
  const saved = fixture.server().canvas!.pages[0]!.layers.find(x => x.id === "title")!;
  expect(saved.width).toBeGreaterThan(300); expect(saved.width / saved.height).toBeCloseTo(300 / 70, 5);
  expect(saved.x + saved.width / 2).toBeCloseTo(170, 5);
  await expect.poll(async () => (await cached(page))?.dirty).toBe(false);
  await page.reload(); await expect(layer).toBeVisible();
  await expect.poll(async () => (await layer.boundingBox())!.width).toBeCloseTo(after!.width, 0);
  expect(fixture.errors).toEqual([]);
});

test("edge handles resize with keyboard without moving the opposite edge", async ({ page }) => {
  const fixture = await setup(page);
  const layer = page.locator('[data-studio-layer-id="image"]'); await layer.click();
  const before = await layer.boundingBox();
  const handle = layer.getByRole("button", { name: "Resize right", exact: true });
  await handle.focus(); await handle.press("ArrowRight");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.server().canvas!.pages[0]!.layers.find(x => x.id === "image")!.width).toBe(101);
  const saved = fixture.server().canvas!.pages[0]!.layers.find(x => x.id === "image")!;
  expect(saved.x).toBe(20); expect(saved.y).toBe(120); expect(saved.height).toBe(100);
  expect((await layer.boundingBox())!.x).toBeCloseTo(before!.x, 3);
  expect(fixture.errors).toEqual([]);
});


test("the first text edit can undo, redo, and branch history without losing the document", async ({ page }) => {
  const fixture = await setup(page);
  await editText(page, "First edit", true);
  const undo = page.getByRole("button", { name: "Undo", exact: true }).first();
  const redo = page.getByRole("button", { name: "Redo", exact: true }).first();
  const text = page.getByRole("textbox", { name: "Text", exact: true });
  await undo.click(); await expect(text).toHaveValue("Original");
  await redo.click(); await expect(text).toHaveValue("First edit");
  await undo.click(); await text.fill("Branched edit"); await expect(redo).toBeDisabled();
  await undo.click(); await expect(text).toHaveValue("Original");
  await redo.click(); await expect(text).toHaveValue("Branched edit");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => JSON.stringify(fixture.server().canvas)).toContain("Branched edit");
  await page.reload(); await expect(page.getByText("Branched edit", { exact: true }).first()).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test("video composition history preserves distinct undo and redo snapshots", async ({ page }) => {
  const fixture = await setup(page, { video: true });
  const volume = page.getByRole("slider", { name: "Master volume", exact: true });
  const undo = page.getByRole("button", { name: "Undo", exact: true });
  const redo = page.getByRole("button", { name: "Redo", exact: true });
  await volume.focus(); await volume.press("ArrowLeft"); await expect(volume).toHaveValue("0.95");
  await undo.click(); await expect(volume).toHaveValue("1");
  await redo.click(); await expect(volume).toHaveValue("0.95");
  await undo.click(); await volume.focus(); await volume.press("ArrowRight");
  await expect(volume).toHaveValue("1.05"); await expect(redo).toBeDisabled();
  await undo.click(); await expect(volume).toHaveValue("1");
  await redo.click(); await expect(volume).toHaveValue("1.05");
  await expect.poll(() => fixture.server().composition?.masterVolume).toBe(1.05);
  await page.reload(); await expect(volume).toHaveValue("1.05");
  expect(fixture.errors).toEqual([]);
});


test("dragging an ungrouped multi-selection moves every selected layer and undoes once", async ({ page }) => {
  const fixture = await setup(page);
  const title = page.locator('[data-studio-layer-id="title"]');
  const image = page.locator('[data-studio-layer-id="image"]');
  await title.click(); await image.click({ modifiers: ["Shift"] });
  await expect(page.getByText("2 layers selected.", { exact: false })).toBeVisible();
  const beforeTitle = (await title.boundingBox())!, beforeImage = (await image.boundingBox())!;
  await page.evaluate(() => {
    const events: string[] = [];
    (window as Window & { nativeManipulationEvents?: string[] }).nativeManipulationEvents = events;
    for (const type of ["dragstart", "pointercancel"]) document.addEventListener(type, () => events.push(type), { once: true, capture: true });
  });
  await page.mouse.move(beforeTitle.x + beforeTitle.width / 2, beforeTitle.y + beforeTitle.height / 2);
  await page.mouse.down(); await page.mouse.move(beforeTitle.x + beforeTitle.width / 2 + 45, beforeTitle.y + beforeTitle.height / 2 + 45, { steps: 5 }); await page.mouse.up();
  await expect(page.getByText("2 layers selected.", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { nativeManipulationEvents?: string[] }).nativeManipulationEvents)).toEqual([]);
  const afterTitle = (await title.boundingBox())!, afterImage = (await image.boundingBox())!;
  expect(afterTitle.x - beforeTitle.x).toBeGreaterThan(30);
  expect(afterImage.x - beforeImage.x).toBeCloseTo(afterTitle.x - beforeTitle.x, 1);
  expect(afterImage.y - beforeImage.y).toBeCloseTo(afterTitle.y - beforeTitle.y, 1);
  await page.getByRole("button", { name: "Undo", exact: true }).first().click();
  await expect.poll(async () => (await title.boundingBox())!.x).toBeCloseTo(beforeTitle.x, 1);
  expect((await image.boundingBox())!.x).toBeCloseTo(beforeImage.x, 1);
  await page.getByRole("button", { name: "Redo", exact: true }).first().click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBeGreaterThan(0);
  const saved = fixture.server().canvas!.pages[0]!.layers;
  expect(saved[0]!.x - 20).toBeCloseTo(saved[1]!.x - 20, 5);
  expect(saved[0]!.y - 20).toBeCloseTo(saved[1]!.y - 120, 5);
  await expect.poll(async () => (await cached(page))?.dirty).toBe(false);
  await page.reload(); await expect(title).toBeVisible();
  expect((await image.boundingBox())!.x).toBeCloseTo(afterImage.x, 1);
  expect(fixture.errors).toEqual([]);
});


for (const width of [390, 834]) test.describe(`touch transforms at ${width}px`, () => {
  test.use({ viewport: { width, height: 1000 }, hasTouch: true });
  test("resizes with touch and exact inspector fields, saves and reopens", async ({ page }) => {
    const fixture = await setup(page);
    const save = page.getByRole("button", { name: "Save draft", exact: true });
    await expect(save).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
    const layer = page.locator('[data-studio-layer-id="image"]'); await layer.tap();
    const handle = layer.getByRole("button", { name: "Resize right", exact: true });
    const box = (await handle.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(23.9); expect(box.height).toBeGreaterThanOrEqual(23.9);
    const client = await page.context().newCDPSession(page);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.getAttribute("aria-label"), { x, y })).toBe("Resize right");
    await page.evaluate(() => {
      const events: string[] = [];
      (window as Window & { touchManipulationEvents?: string[] }).touchManipulationEvents = events;
      for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "click"]) document.addEventListener(type, event => {
        const target = event.target as HTMLElement, pointer = event as PointerEvent;
        const button = target.closest("button");
        events.push(`${type}:${button?.getAttribute("aria-label") ?? button?.textContent}:${pointer.clientX}:${target.closest<HTMLElement>("[data-studio-layer-id]")?.style.width}`);
      }, { capture: true });
    });
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    const board = page.locator('[data-studio-gesture="transform"]');
    await expect(board).toHaveCount(1);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    for (let i = 1; i <= 5; i++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + i * 6, y }] });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    // Observe actual React gesture completion, rather than treating a CDP
    // command receipt as the authority to start a different touch sequence.
    await expect(board).toHaveCount(0);
    await expect.poll(() => layer.evaluate(el => Number.parseFloat(el.style.width))).toBeGreaterThan(100);
    await client.detach();
    const events = await page.evaluate(() => (window as Window & { touchManipulationEvents?: string[] }).touchManipulationEvents);
    await expect(layer, { message: JSON.stringify(events) }).toHaveClass(/outline-orange-600/);
    const inspector = page.getByRole("button", { name: "Inspector", exact: true });
    await expect(inspector).toHaveAttribute("aria-pressed", "false");
    await inspector.tap();
    const panelEvents = await page.evaluate(() => (window as Window & { touchManipulationEvents?: string[] }).touchManipulationEvents);
    await test.info().attach("touch-events", { body: JSON.stringify(panelEvents), contentType: "application/json" });
    await expect(inspector, { message: JSON.stringify(panelEvents) }).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "position", exact: true }).tap();
    await expect.poll(async () => Number(await page.getByRole("spinbutton", { name: "Width", exact: true }).inputValue()), { message: JSON.stringify(events) }).toBeGreaterThan(100);
    await page.getByRole("spinbutton", { name: "Width", exact: true }).fill("180");
    await page.getByRole("spinbutton", { name: "Height", exact: true }).fill("90");
    await page.getByRole("spinbutton", { name: "Rotate", exact: true }).fill("25");
    await page.getByRole("button", { name: "Inspector", exact: true }).tap();
    await page.screenshot({ path: test.info().outputPath("touch-editor.png"), fullPage: true });
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => fixture.server().canvas!.pages[0]!.layers.find(x => x.id === "image")!.rotation).toBe(25);
    const saved = fixture.server().canvas!.pages[0]!.layers.find(x => x.id === "image")!;
    expect(saved.width).toBe(180); expect(saved.height).toBe(90);
    await page.getByText("More", { exact: true }).tap();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PNG", exact: true }).tap();
    const png = readFileSync((await (await download).path())!);
    const pixels = await page.evaluate(async data => {
      const image = new Image(); image.src = "data:image/png;base64," + data; await image.decode();
      const output = document.createElement("canvas"); output.width = image.width; output.height = image.height;
      const ctx = output.getContext("2d")!; ctx.drawImage(image, 0, 0);
      return [[...ctx.getImageData(110,165,1,1).data], [...ctx.getImageData(240,165,1,1).data]];
    }, png.toString("base64"));
    expect(pixels).toEqual([[0,255,0,255], [255,255,255,255]]);
    await expect.poll(async () => (await cached(page))?.dirty).toBe(false);
    await page.reload(); await layer.tap();
    await page.getByRole("button", { name: "Inspector", exact: true }).tap();
    await page.getByRole("button", { name: "position", exact: true }).tap();
    await expect(page.getByRole("spinbutton", { name: "Width", exact: true })).toHaveValue("180");
    await expect(page.getByRole("spinbutton", { name: "Rotate", exact: true })).toHaveValue("25");
    expect(fixture.errors).toEqual([]);
  });
});


test("static design opens a quiet workspace and can explicitly reveal its timeline", async ({ page }) => {
  const fixture = await setup(page);
  await expect(page.getByRole("spinbutton", { name: "Scene duration", exact: true })).toHaveCount(0);
  await page.getByText("More", { exact: true }).click();
  await page.getByRole("button", { name: "Show timeline", exact: true }).click();
  await page.getByText("More", { exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Scene duration", exact: true })).toBeVisible();
  await page.getByText("More", { exact: true }).click();
  await page.getByRole("button", { name: "Hide timeline", exact: true }).click();
  await page.getByText("More", { exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Scene duration", exact: true })).toHaveCount(0);
  expect(fixture.errors).toEqual([]);
});


test("direct text editing focuses immediately, preserves the caret, and shares history and persistence", async ({ page }) => {
  const fixture = await setup(page);
  const layer = page.locator('[data-studio-layer-id="title"]');
  await layer.dblclick();
  const editor = layer.getByRole("textbox", { name: "Edit Title", exact: true });
  await expect(editor).toBeFocused();
  await editor.press("End"); await editor.pressSequentially(" café");
  await expect(editor).toHaveText("Original café");
  await editor.press("Home"); await editor.press("ArrowRight"); await editor.pressSequentially("X");
  await expect(editor).toHaveText("OXriginal café");
  await page.screenshot({ path: test.info().outputPath("direct-text.png"), caret: "initial" });
  await editor.press("Control+Enter"); await expect(layer.getByRole("textbox", { name: "Edit Title", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await expect(layer).toContainText("Original");
  await page.getByRole("button", { name: "Redo", exact: true }).click(); await expect(layer).toContainText("OXriginal café");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.server().canvas!.pages[0]!.layers[0]!.text).toBe("OXriginal café");
  await expect.poll(async () => (await cached(page))?.dirty).toBe(false);
  await page.reload(); await expect(layer).toContainText("OXriginal café");
  expect(fixture.errors).toEqual([]);
});

test("Escape cancels an on-canvas text edit without deleting its layer or adding an undo step", async ({ page }) => {
  const fixture = await setup(page);
  const layer = page.locator('[data-studio-layer-id="title"]'); await layer.dblclick();
  const editor = layer.getByRole("textbox", { name: "Edit Title", exact: true });
  await expect(editor).toBeFocused(); await editor.press("Control+A"); await editor.pressSequentially("Cancelled draft");
  await editor.press("Escape"); await expect(layer).toContainText("Original");
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.server().canvas!.pages[0]!.layers[0]!.text).toBe("Original");
  expect(fixture.errors).toEqual([]);
});


test("native IME composition stays focused and does not save an unfinished composition", async ({ page }) => {
  const fixture = await setup(page);
  const layer = page.locator('[data-studio-layer-id="title"]'); await layer.dblclick();
  const editor = layer.getByRole("textbox", { name: "Edit Title", exact: true });
  await expect(editor).toBeFocused(); await editor.press("Control+A");
  await page.clock.install();
  const client = await page.context().newCDPSession(page);
  await client.send("Input.imeSetComposition", { text: "にほん", selectionStart: 3, selectionEnd: 3 });
  await expect(editor).toBeFocused(); await page.clock.fastForward(1600);
  expect(fixture.writes).toHaveLength(0);
  await client.send("Input.insertText", { text: "日本語" }); await client.detach();
  await expect(editor).toHaveText("日本語");
  await editor.press("Control+Enter"); await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.server().canvas!.pages[0]!.layers[0]!.text).toBe("日本語");
  await expect.poll(async () => (await cached(page))?.dirty).toBe(false);
  await page.reload(); await expect(layer).toContainText("日本語"); expect(fixture.errors).toEqual([]);
});

test("direct text preserves authored whitespace and newlines through reopening", async ({ page }) => {
  const fixture = await setup(page);
  const layer = page.locator('[data-studio-layer-id="title"]'); await layer.dblclick();
  const editor = layer.getByRole("textbox", { name: "Edit Title", exact: true });
  await expect(editor).toBeFocused(); await editor.press("Control+A");
  await editor.pressSequentially("  First line  "); await editor.press("Enter"); await editor.pressSequentially("  Second line  ");
  await editor.press("Control+Enter"); await page.getByRole("button", { name: "Save draft", exact: true }).click();
  const expected = "  First line  \n  Second line  ";
  await expect.poll(() => fixture.server().canvas!.pages[0]!.layers[0]!.text).toBe(expected);
  await page.getByText("More", { exact: true }).click();
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download PNG", exact: true }).click();
  const bytes = readFileSync((await (await download).path())!);
  const leftmostInk = await page.evaluate(async data => {
    const image = new Image(); image.src = "data:image/png;base64," + data; await image.decode();
    const output = document.createElement("canvas"); output.width = image.width; output.height = image.height;
    const ctx = output.getContext("2d")!; ctx.drawImage(image,0,0);
    const pixels = ctx.getImageData(0,20,640,60).data; let left = 640;
    for (let y=0;y<60;y++) for(let x=0;x<640;x++){const i=(y*640+x)*4;if(pixels[i]!<80&&pixels[i+1]!<80&&pixels[i+2]!<80&&pixels[i+3]!>200)left=Math.min(left,x);}
    return left;
  }, bytes.toString("base64"));
  expect(leftmostInk).toBeGreaterThan(30); expect(leftmostInk).toBeLessThan(100);
  await expect.poll(async () => (await cached(page))?.dirty).toBe(false);
  await page.reload(); await expect(layer).toBeVisible(); expect(await layer.locator("p").textContent()).toBe(expected);
  expect(fixture.errors).toEqual([]);
});


test("dark editor inspector labels and primary Save meet readable text contrast", async ({ page }) => {
  const fixture = await setup(page); await page.locator('[data-studio-layer-id="title"]').click();
  const summary = page.getByText("Typography", { exact: true }).locator("..");
  const save = page.getByRole("button", { name: "Save draft", exact: true });
  const layer = page.locator('[data-studio-layer-id="title"]');
  for (const [locator, property, minimum] of [[summary,"color",4.5],[save,"color",4.5],[layer,"outlineColor",3]] as const) {
    const ratio = await locator.evaluate((element, property) => {
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d")!;
      const parse = (color: string) => {
        context.clearRect(0,0,1,1); context.fillStyle=color; context.fillRect(0,0,1,1);
        const [r,g,b,a] = context.getImageData(0,0,1,1).data; return [r!,g!,b!,a!/255];
      };
      let parent: Element | null = element, background = [255,255,255,1];
      while (parent) { const color = parse(getComputedStyle(parent).backgroundColor); if (color.length >= 3 && (color[3] ?? 1) === 1) { background = color; break; } parent = parent.parentElement; }
      const foreground = parse(getComputedStyle(element)[property]), alpha = foreground[3] ?? 1;
      const blended = foreground.slice(0,3).map((value,i) => value * alpha + background[i]! * (1-alpha));
      const luminance = (rgb: number[]) => rgb.slice(0,3).map(value => {const s=value/255;return s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4)}).reduce((sum,value,i)=>sum+value*[.2126,.7152,.0722][i]!,0);
      const a=luminance(blended), b=luminance(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    }, property);
    expect(ratio).toBeGreaterThanOrEqual(minimum);
  }
  await page.screenshot({ path: test.info().outputPath("dark-inspector.png") });
  expect(fixture.errors).toEqual([]);
});

test("a marketplace custom font actually loads in the browser and renders on a text layer", async ({ page }) => {
  // A real, valid .woff2 binary fixture, not a fabricated/invalid one — proves the FontFace
  // API genuinely parses and loads real font data, not just a URL.
  const realFontFile = readFileSync(join(__dirname, "fixtures/kente-display.woff2"));
  await page.route("**/fonts/kente-display.woff2", (route) => route.fulfill({ contentType: "font/woff2", body: realFontFile }));
  const fixture = await setup(page, { customFonts: [{ family: "Kente Display", fileUrl: "http://127.0.0.1:38416/fonts/kente-display.woff2" }] });
  await expect.poll(() => page.evaluate(() => document.fonts.check('32px "Kente Display"'))).toBe(true);
  const layer = page.locator('[data-studio-layer-id="title"]'); await layer.click();
  await expect(page.getByText("Typography", { exact: true })).toBeVisible();
  const fontSelect = page.getByRole("combobox", { name: "Font", exact: true });
  await expect(fontSelect.locator("option", { hasText: "Kente Display" })).toHaveCount(1);
  expect(await page.evaluate(() => document.querySelector("optgroup[label='Your fonts'] option")?.textContent)).toBe("Kente Display");
  await fontSelect.selectOption("Kente Display");
  await expect(page.getByText("Original", { exact: true }).first()).toHaveCSS("font-family", /Kente Display/);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.server().canvas!.pages[0]!.layers[0]!.fontFamily).toBe("Kente Display");
  expect(fixture.errors).toEqual([]);
});
