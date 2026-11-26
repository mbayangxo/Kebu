import { describe, expect, it } from "vitest";
import { canvasLayerSchema, duplicateCanvasPage, emptyCanvasDocument, type CanvasLayer } from "@/lib/studio/canvas-document";
import { applyBackgroundToAllPages, applyLayerStyle, applyPageStyle, captureLayerStyle, capturePageStyle } from "@/lib/studio/style-transfer";

const layer = (id:string, patch:Partial<CanvasLayer> = {})=>canvasLayerSchema.parse({id,type:"text",x:30,y:40,width:200,height:80,text:id,fontSize:24,color:"#112233",...patch});
const pages = ()=>{
  const doc = emptyCanvasDocument({width:640,height:640});
  doc.pages[0]!.layers=[layer("original")]; doc.layers=doc.pages[0]!.layers;
  return duplicateCanvasPage(doc,doc.pages[0]!.id)!.doc;
};

describe("content-preserving Studio style transfer",()=>{
  it("copies text appearance without replacing content, transforms, identity or animation",()=>{
    const source=layer("source",{name:"Heading",fontSize:60,fontFamily:"Georgia",color:"#ff0000",fontWeight:"700",opacity:0.7});
    const target=layer("target",{x:200,y:300,rotation:30,text:"Keep these words",animationPreset:"fade",animationDelayMs:200});
    const [next]=applyLayerStyle([target],[target.id],captureLayerStyle(source));
    expect(next).toMatchObject({id:"target",x:200,y:300,rotation:30,text:"Keep these words",animationPreset:"fade",animationDelayMs:200,fontSize:60,fontFamily:"Georgia",color:"#ff0000",fontWeight:"700",opacity:0.7});
    expect(target.color).toBe("#112233");
  });

  it("transfers shape paint between compatible shapes without changing their kinds",()=>{
    const source=layer("source",{type:"rect",fillType:"linear_gradient",gradientFrom:"#ff0000",gradientTo:"#0000ff",gradientAngle:45,stroke:"#ffffff",strokeWidth:4});
    const target=layer("target",{type:"ellipse",fill:"#00ff00"});
    const [next]=applyLayerStyle([target],[target.id],captureLayerStyle(source));
    expect(next).toMatchObject({type:"ellipse",gradientFrom:"#ff0000",gradientTo:"#0000ff",gradientAngle:45,strokeWidth:4});
  });

  it("applies shared effects across families without inventing typography or paint conversions",()=>{
    const source=layer("source",{fontSize:72,color:"#ff0000",shadowBlur:10,opacity:0.4});
    const target=layer("target",{type:"rect",fill:"#00ff00",fontSize:15});
    expect(applyLayerStyle([target],[target.id],captureLayerStyle(source))[0]).toMatchObject({fill:"#00ff00",fontSize:15,shadowBlur:10,opacity:0.4});
  });

  it("clears optional style overrides absent from the copied style",()=>{
    const source=layer("source",{type:"rect",fill:"#123456"});
    const target=layer("target",{type:"rect",fillType:"linear_gradient",gradientFrom:"#ff0000",shadowBlur:20});
    const next=applyLayerStyle([target],[target.id],captureLayerStyle(source))[0]!;
    expect(next.fill).toBe("#123456"); expect(next.fillType).toBeUndefined(); expect(next.gradientFrom).toBeUndefined(); expect(next.shadowBlur).toBeUndefined();
  });

  it("expands target groups while preserving locked and unrelated objects",()=>{
    const source=layer("source",{color:"#ff0000"});
    const targets=[layer("a",{groupId:"pair"}),layer("b",{groupId:"pair"}),layer("locked",{groupId:"pair",locked:true}),layer("other")];
    const next=applyLayerStyle(targets,["a"],captureLayerStyle(source));
    expect(next.slice(0,2).map(item=>item.color)).toEqual(["#ff0000","#ff0000"]);
    expect(next[2]).toBe(targets[2]); expect(next[3]).toBe(targets[3]);
  });

  it("copies media filters without copying files, crop, trim or provenance",()=>{
    const source=layer("source",{type:"image",imageUrl:"https://example.test/a.png",brightness:1.5,contrast:0.8,blur:2});
    const target=layer("target",{type:"video",videoUrl:"https://example.test/b.mp4",cropX:0.1,cropW:0.6,trimStartMs:500,sourceAssetId:"owned-asset"});
    const next=applyLayerStyle([target],[target.id],captureLayerStyle(source))[0]!;
    expect(next).toMatchObject({videoUrl:target.videoUrl,cropX:0.1,cropW:0.6,trimStartMs:500,sourceAssetId:"owned-asset",brightness:1.5,contrast:0.8,blur:2});
    expect(next.imageUrl).toBeUndefined();
  });

  it("copies icon appearance without replacing its glyph or vector",()=>{
    const source=layer("source",{type:"icon",text:"★",fontSize:70,color:"#ff0000"});
    const target=layer("target",{type:"icon",text:"♥",iconSvgPath:"M0 0 L10 10",iconViewBox:"0 0 10 10"});
    expect(applyLayerStyle([target],[target.id],captureLayerStyle(source))[0]).toMatchObject({text:"♥",iconSvgPath:target.iconSvgPath,fontSize:70,color:"#ff0000"});
  });

  it("keeps copied snapshots independent and ignores forged non-style fields",()=>{
    const source=layer("source",{color:"#ff0000"}), style=captureLayerStyle(source);
    source.color="#0000ff";
    Object.assign(style.values,{id:"stolen",text:"replaced",x:999,imageUrl:"https://example.test/forged.png"});
    const target=layer("target"), next=applyLayerStyle([target],[target.id],style)[0]!;
    expect(next).toMatchObject({id:"target",text:"target",x:30,color:"#ff0000"}); expect(next.imageUrl).toBeUndefined();
  });

  it("preserves no-op identity and rejects malformed styles without a partial mutation",()=>{
    const targets=[layer("a"),layer("b")], before=structuredClone(targets), style=captureLayerStyle(targets[0]!);
    expect(applyLayerStyle(targets,["a","b"],style)).toBe(targets);
    expect(applyLayerStyle(targets,[],style)).toBe(targets);
    style.values.opacity=2;
    expect(()=>applyLayerStyle(targets,["a","b"],style)).toThrow(/could not be applied/);
    expect(targets).toEqual(before);
    const mixed=[layer("shape",{type:"rect"}),targets[1]!], original=structuredClone(mixed);
    style.values.opacity=0.5; style.values.fontSize=400;
    // The shape is valid; the later text object must still reject the whole paste.
    expect(()=>applyLayerStyle(mixed,["shape","b"],style)).toThrow(/could not be applied/);
    expect(mixed).toEqual(original);
  });

  it("copies page appearance and transitions while preserving content and scene timing",()=>{
    const doc=pages(), source=doc.pages[0]!, target=doc.pages[1]!;
    Object.assign(source,{backgroundColor:"#123456",transitionKind:"dissolve",transitionDurationMs:900,durationMs:1000});
    Object.assign(target,{name:"My scene",width:800,durationMs:7000});
    const next=applyPageStyle(doc,target.id,capturePageStyle(source));
    expect(next.pages[1]).toMatchObject({id:target.id,name:"My scene",width:800,durationMs:7000,backgroundColor:"#123456",transitionKind:"dissolve",transitionDurationMs:900,layers:target.layers});
    expect(next.layers).toEqual(target.layers); expect(next.backgroundColor).toBe("#123456"); expect(next.width).toBe(800);
    expect(doc.pages[1]!.backgroundColor).not.toBe("#123456");
  });

  it("applies only background across pages, preserving order, layers and transitions",()=>{
    const doc=pages(), source=doc.pages[1]!;
    source.backgroundColor="#aabbcc"; doc.pages[0]!.transitionKind="slide";
    const before=structuredClone(doc), next=applyBackgroundToAllPages(doc,source.id);
    expect(next.pages.map(page=>page.backgroundColor)).toEqual(["#aabbcc","#aabbcc"]);
    expect(next.pages.map(page=>({...page,backgroundColor:undefined}))).toEqual(before.pages.map(page=>({...page,backgroundColor:undefined})));
    expect(next.layers).toEqual(source.layers); expect(next.backgroundColor).toBe("#aabbcc");
    expect(doc).toEqual(before);
  });

  it("clears old transition overrides when copying a page with default transition styling",()=>{
    const doc=pages(), source=doc.pages[0]!, target=doc.pages[1]!;
    Object.assign(target,{transitionKind:"fade",transitionDurationMs:800,durationMs:4000});
    const next=applyPageStyle(doc,target.id,capturePageStyle(source));
    expect(next.pages[1]!.transitionKind).toBeUndefined(); expect(next.pages[1]!.transitionDurationMs).toBeUndefined();
    expect(next.pages[1]!.durationMs).toBe(4000);
  });

  it("does not write history for matching/missing pages and rejects invalid page style atomically",()=>{
    const doc=pages(), page=doc.pages[0]!, style=capturePageStyle(page);
    expect(applyPageStyle(doc,page.id,style)).toBe(doc);
    expect(applyPageStyle(doc,"missing",style)).toBe(doc);
    expect(applyBackgroundToAllPages(doc,page.id)).toBe(doc);
    expect(applyBackgroundToAllPages(doc,"missing")).toBe(doc);
    style.values.transitionDurationMs=4000;
    const before=structuredClone(doc);
    expect(()=>applyPageStyle(doc,page.id,style)).toThrow(/could not be applied/); expect(doc).toEqual(before);
  });
});
