import type { CanvasDocument, CanvasLayer } from "@/lib/studio/canvas-document";
import {
  emptyStudioComposition,
  newCompositionId,
  studioCompositionSchema,
  type CompositionClip,
  type StudioComposition,
} from "@/lib/studio/composition";

export type DesignLayerPayload = Pick<CanvasLayer,
  "type"|"text"|"fontSize"|"fontFamily"|"fontWeight"|"fontStyle"|"color"|"textAlign"|"letterSpacing"|"lineHeight"|"textDecoration"|"textTransform"|
  "fill"|"stroke"|"strokeWidth"|"cornerRadius"|"shadowColor"|"shadowBlur"|"shadowX"|"shadowY"|"imageUrl"|"videoUrl"|"flipX"|"flipY"|
  "objectFit"|"cropX"|"cropY"|"cropW"|"cropH"|"brightness"|"contrast"|"saturation"|"grayscale"|"blur"|"iconKey"|"frameStyle"|
  "animationPreset"|"animationDurationMs"|"animationDelayMs"
>;

function payload(layer: CanvasLayer): DesignLayerPayload {
  const { type,text,fontSize,fontFamily,fontWeight,fontStyle,color,textAlign,letterSpacing,lineHeight,textDecoration,textTransform,fill,stroke,strokeWidth,cornerRadius,shadowColor,shadowBlur,shadowX,shadowY,imageUrl,videoUrl,flipX,flipY,objectFit,cropX,cropY,cropW,cropH,brightness,contrast,saturation,grayscale,blur,iconKey,frameStyle,animationPreset,animationDurationMs,animationDelayMs }=layer;
  return {type,text,fontSize,fontFamily,fontWeight,fontStyle,color,textAlign,letterSpacing,lineHeight,textDecoration,textTransform,fill,stroke,strokeWidth,cornerRadius,shadowColor,shadowBlur,shadowX,shadowY,imageUrl,videoUrl,flipX,flipY,objectFit,cropX,cropY,cropW,cropH,brightness,contrast,saturation,grayscale,blur,iconKey,frameStyle,animationPreset,animationDurationMs,animationDelayMs};
}

function designMotionKeyframes(layer: CanvasLayer, clipId: string, clipStartMs: number) {
  const preset = layer.animationPreset ?? "none";
  if (preset === "none") return [];
  const delay = Math.max(0, layer.animationDelayMs ?? 0);
  const duration = Math.max(100, layer.animationDurationMs ?? 600);
  const start = clipStartMs + delay;
  const end = start + duration;
  const easing = "ease_out" as const;
  const kf = (property: "opacity"|"x"|"y"|"scale", timeMs: number, value: number) => ({
    id: newCompositionId("kf"), clipId, property, timeMs, value, easing,
  });

  if (preset === "fade") return [kf("opacity", start, 0), kf("opacity", end, layer.opacity)];
  if (preset === "fade_up") return [
    kf("opacity", start, 0), kf("opacity", end, layer.opacity),
    kf("y", start, layer.y + 36), kf("y", end, layer.y),
  ];
  if (preset === "slide_left") return [
    kf("opacity", start, 0), kf("opacity", end, layer.opacity),
    kf("x", start, layer.x - 56), kf("x", end, layer.x),
  ];
  if (preset === "slide_right") return [
    kf("opacity", start, 0), kf("opacity", end, layer.opacity),
    kf("x", start, layer.x + 56), kf("x", end, layer.x),
  ];
  if (preset === "scale") return [
    kf("opacity", start, 0), kf("opacity", end, layer.opacity),
    kf("scale", start, 0.82), kf("scale", end, 1),
  ];
  return [
    kf("opacity", start, 0),
    kf("opacity", start + Math.round(duration * 0.35), layer.opacity),
    kf("scale", start, 0.78),
    kf("scale", start + Math.round(duration * 0.75), 1.08),
    kf("scale", end, 1),
  ];
}

export function designDocumentToComposition(doc: CanvasDocument): StudioComposition {
  const first=doc.pages[0]!;
  let c=emptyStudioComposition({width:first.width,height:first.height,editMode:"smart_edit"});
  const visualTrack=c.tracks.find(t=>t.kind==="overlay")!;
  const textTrack=c.tracks.find(t=>t.kind==="caption")!;
  let cursor=0;
  const clips: CompositionClip[]=[];
  const keyframes: StudioComposition["keyframes"]=[];
  const transitions: StudioComposition["transitions"]=[];
  const storyboard=[] as StudioComposition["storyboard"];
  const sceneRepresentativeClipIds: Array<string | null>=[];
  for (let pi=0;pi<doc.pages.length;pi+=1) {
    const page=doc.pages[pi]!, duration=page.durationMs??3000, sceneId=newCompositionId("scene");
    storyboard.push({id:sceneId,name:page.name||`Scene ${pi+1}`,intent:"Editable Kebu design scene",durationMs:duration,order:pi});
    let representativeClipId: string | null = null;
    for (let li=0;li<page.layers.length;li+=1) {
      const layer=page.layers[li]!;
      const trackId=layer.type==="text"?textTrack.id:visualTrack.id;
      const clipId=newCompositionId("cl");
      clips.push({
        id:clipId,trackId,name:layer.name,startMs:cursor,durationMs:layer.trimDurationMs?Math.min(duration,layer.trimDurationMs):duration,
        sourceInMs:layer.trimStartMs??0,speed:1,volume:1,opacity:layer.opacity,fadeInMs:0,fadeOutMs:0,x:layer.x,y:layer.y,scale:1,rotation:layer.rotation,designWidth:layer.width,designHeight:layer.height,
        sourceUrl:layer.videoUrl||layer.imageUrl||"",sceneId,sourceDesignPageId:page.id,sourceDesignLayerId:layer.id,designLayer:payload(layer),
        chromaEnabled:false,chromaColor:"#00FF00",chromaSimilarity:.4,brightness:0,contrast:0,saturation:0,nestedProjectId:null,
      });
      keyframes.push(...designMotionKeyframes(layer,clipId,cursor));
      if (!representativeClipId) representativeClipId = clipId;
    }
    sceneRepresentativeClipIds.push(representativeClipId);
    cursor+=duration;
  }

  for (let pi=1;pi<doc.pages.length;pi+=1) {
    const page=doc.pages[pi]!;
    const kind=page.transitionKind??"cut";
    const fromClipId=sceneRepresentativeClipIds[pi-1];
    const toClipId=sceneRepresentativeClipIds[pi];
    if (kind==="cut"||!fromClipId||!toClipId) continue;
    transitions.push({
      id:newCompositionId("trn"),
      fromClipId,
      toClipId,
      kind,
      durationMs:Math.max(100,Math.min(3000,page.transitionDurationMs??400)),
    });
  }

  c={...c,clips,keyframes,transitions,storyboard,music:doc.soundtrack?{bpm:doc.soundtrack.bpm,beatsMs:doc.soundtrack.beatsMs,downbeatsMs:[],sections:[],confidence:doc.soundtrack.confidence,method:"design",soundtrackUrl:doc.soundtrack.url,fileName:doc.soundtrack.fileName,durationMs:doc.soundtrack.durationMs,peaks:[],energyMs:[],energyValues:[],analyzedAt:doc.soundtrack.analyzedAt}:null,snapToBeats:doc.soundtrack?.snapToBeats??true};
  return studioCompositionSchema.parse(c);
}
