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
  "objectFit"|"cropX"|"cropY"|"cropW"|"cropH"|"brightness"|"contrast"|"saturation"|"grayscale"|"blur"|"iconKey"|"frameStyle"
>;

function payload(layer: CanvasLayer): DesignLayerPayload {
  const { type,text,fontSize,fontFamily,fontWeight,fontStyle,color,textAlign,letterSpacing,lineHeight,textDecoration,textTransform,fill,stroke,strokeWidth,cornerRadius,shadowColor,shadowBlur,shadowX,shadowY,imageUrl,videoUrl,flipX,flipY,objectFit,cropX,cropY,cropW,cropH,brightness,contrast,saturation,grayscale,blur,iconKey,frameStyle }=layer;
  return {type,text,fontSize,fontFamily,fontWeight,fontStyle,color,textAlign,letterSpacing,lineHeight,textDecoration,textTransform,fill,stroke,strokeWidth,cornerRadius,shadowColor,shadowBlur,shadowX,shadowY,imageUrl,videoUrl,flipX,flipY,objectFit,cropX,cropY,cropW,cropH,brightness,contrast,saturation,grayscale,blur,iconKey,frameStyle};
}

export function designDocumentToComposition(doc: CanvasDocument): StudioComposition {
  const first=doc.pages[0]!;
  let c=emptyStudioComposition({width:first.width,height:first.height,editMode:"smart_edit"});
  const visualTrack=c.tracks.find(t=>t.kind==="overlay")!;
  const textTrack=c.tracks.find(t=>t.kind==="caption")!;
  let cursor=0;
  const clips: CompositionClip[]=[];
  const storyboard=[] as StudioComposition["storyboard"];
  for (let pi=0;pi<doc.pages.length;pi+=1) {
    const page=doc.pages[pi]!, duration=page.durationMs??3000, sceneId=newCompositionId("scene");
    storyboard.push({id:sceneId,name:page.name||`Scene ${pi+1}`,intent:"Editable Kebu design scene",durationMs:duration,order:pi});
    for (let li=0;li<page.layers.length;li+=1) {
      const layer=page.layers[li]!;
      const trackId=layer.type==="text"?textTrack.id:visualTrack.id;
      clips.push({
        id:newCompositionId("cl"),trackId,name:layer.name,startMs:cursor,durationMs:layer.trimDurationMs?Math.min(duration,layer.trimDurationMs):duration,
        sourceInMs:layer.trimStartMs??0,speed:1,volume:1,opacity:layer.opacity,fadeInMs:0,fadeOutMs:0,x:layer.x,y:layer.y,scale:1,rotation:layer.rotation,
        sourceUrl:layer.videoUrl||layer.imageUrl||"",sceneId,sourceDesignPageId:page.id,sourceDesignLayerId:layer.id,designLayer:payload(layer),
        chromaEnabled:false,chromaColor:"#00FF00",chromaSimilarity:.4,brightness:0,contrast:0,saturation:0,nestedProjectId:null,
      });
    }
    cursor+=duration;
  }
  c={...c,clips,storyboard,music:doc.soundtrack?{bpm:doc.soundtrack.bpm,beatsMs:doc.soundtrack.beatsMs,downbeatsMs:[],sections:[],confidence:doc.soundtrack.confidence,method:"design",soundtrackUrl:doc.soundtrack.url,fileName:doc.soundtrack.fileName,durationMs:doc.soundtrack.durationMs,peaks:[],energyMs:[],energyValues:[],analyzedAt:doc.soundtrack.analyzedAt}:null,snapToBeats:doc.soundtrack?.snapToBeats??true};
  return studioCompositionSchema.parse(c);
}
