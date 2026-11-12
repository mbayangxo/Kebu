"use client";
import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import { COLLAGE_TEXT_FONTS, type CollageText } from "@/lib/create/collage-text";
import { cutoutScrollTransform } from "@/lib/create/maylecor-cutout-motion";

export function CollageTextLayer({ layer, progress, travel, editing, onMove }: { layer: CollageText; progress: number; travel?: {x:number;y:number}; editing: boolean; onMove: (leftPct:number,topPct:number)=>void }) {
  const activeGesture=useRef<(()=>void)|null>(null);
  useEffect(()=>()=>activeGesture.current?.(),[]);
  const style: CSSProperties = { position:'absolute',left:`${layer.leftPct}%`,top:`${layer.topPct}%`,width:`${layer.widthPct}%`,margin:0,zIndex:layer.zIndex??20,fontFamily:COLLAGE_TEXT_FONTS[layer.fontFamily??'editorial'],fontSize:`clamp(12px,${(layer.fontSize??96)/12}cqw,${layer.fontSize??96}px)`,fontWeight:700,lineHeight:1.05,color:layer.textColor??'#e9006b',WebkitTextStroke:`${layer.outlineWidth??0}px ${layer.outlineColor??'#ffffff'}`,paintOrder:'stroke fill',textAlign:layer.textAlign??'left',whiteSpace:'pre-wrap',overflowWrap:'anywhere',transform:cutoutScrollTransform(layer.id,editing?0:progress,layer.rotate??0,travel),touchAction:editing?'none':'auto',cursor:editing?'move':undefined };
  function drag(event: PointerEvent<HTMLHeadingElement>) {
    if(!editing||event.button!==0)return;
    const node=event.currentTarget, parent=node.offsetParent as HTMLElement|null;
    if(!parent)return;
    activeGesture.current?.();event.preventDefault();const rect=parent.getBoundingClientRect(),startX=event.clientX,startY=event.clientY,id=event.pointerId;
    if(!rect.width||!rect.height)return;
    let left=layer.leftPct,top=layer.topPct;
    node.setPointerCapture(id);
    const move=(e: globalThis.PointerEvent)=>{if(e.pointerId!==id)return;left=Math.max(-20,Math.min(110,layer.leftPct+(e.clientX-startX)/rect.width*100));top=Math.max(-20,Math.min(110,layer.topPct+(e.clientY-startY)/rect.height*100));node.style.left=`${left}%`;node.style.top=`${top}%`;};
    const clean=()=>{node.removeEventListener('pointermove',move);node.removeEventListener('pointerup',up);node.removeEventListener('pointercancel',cancel);node.removeEventListener('lostpointercapture',cancel);activeGesture.current=null;};
    const up=(e:globalThis.PointerEvent)=>{if(e.pointerId!==id)return;clean();onMove(left,top);};
    const cancel=()=>{clean();node.style.left=`${layer.leftPct}%`;node.style.top=`${layer.topPct}%`;};
    node.addEventListener('pointermove',move);node.addEventListener('pointerup',up);node.addEventListener('pointercancel',cancel);node.addEventListener('lostpointercapture',cancel);
    activeGesture.current=cancel;
  }
  return <h2 data-collage-text={layer.id} style={style} tabIndex={editing?0:undefined} aria-label={editing?`Move text: ${layer.text??''}`:undefined} onPointerDown={drag} onKeyDown={editing?event=>{const moves:{[key:string]:[number,number]}={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};const delta=moves[event.key];if(delta){event.preventDefault();onMove(Math.max(-20,Math.min(110,layer.leftPct+delta[0]*(event.shiftKey?5:1))),Math.max(-20,Math.min(110,layer.topPct+delta[1]*(event.shiftKey?5:1))));}}:undefined}>{layer.text}</h2>;
}
