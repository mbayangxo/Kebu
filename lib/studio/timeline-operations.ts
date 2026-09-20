import { studioCompositionSchema, type CompositionClip, type StudioComposition } from "@/lib/studio/composition";

function trackFor(c:StudioComposition,clip:CompositionClip){return c.tracks.find(t=>t.id===clip.trackId)}
export function moveClipSafely(c:StudioComposition,clipId:string,startMs:number):StudioComposition|{error:string}{
 const clip=c.clips.find(x=>x.id===clipId);if(!clip)return{error:"Clip not found."};if(trackFor(c,clip)?.locked)return{error:"Track is locked."};
 return studioCompositionSchema.parse({...c,clips:c.clips.map(x=>x.id===clipId?{...x,startMs:Math.max(0,Math.round(startMs))}:x)});
}
export function trimClipEdge(c:StudioComposition,clipId:string,edge:"left"|"right",deltaMs:number):StudioComposition|{error:string}{
 const clip=c.clips.find(x=>x.id===clipId);if(!clip)return{error:"Clip not found."};if(trackFor(c,clip)?.locked)return{error:"Track is locked."};
 const delta=Math.round(deltaMs),min=200;
 if(edge==="right"){return studioCompositionSchema.parse({...c,clips:c.clips.map(x=>x.id===clipId?{...x,durationMs:Math.max(min,x.durationMs+delta)}:x)})}
 const maxDelta=clip.durationMs-min, applied=Math.max(-clip.startMs,Math.min(maxDelta,delta));
 return studioCompositionSchema.parse({...c,clips:c.clips.map(x=>x.id===clipId?{...x,startMs:x.startMs+applied,durationMs:x.durationMs-applied,sourceInMs:Math.max(0,x.sourceInMs+Math.round(applied*x.speed))}:x)});
}
export function setTrackState(c:StudioComposition,trackId:string,patch:{locked?:boolean;muted?:boolean}):StudioComposition{
 return studioCompositionSchema.parse({...c,tracks:c.tracks.map(t=>t.id===trackId?{...t,...patch}:t)});
}
export function clipIsAudible(c:StudioComposition,clip:CompositionClip){return !trackFor(c,clip)?.muted}
