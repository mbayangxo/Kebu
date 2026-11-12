"use client";
import { useId, useRef, useState } from "react";
import { editRichText, richTextValue, formatRichRange, type RichMark, type RichRun, type KcdNode, type Device, type Op } from "@/lib/creative-core";
import { primitivePropertyOperations } from "@/lib/create/kcd-primitive-operations";
import { BUILDER_PANEL as BUILDER } from "@/lib/create/builder-panel-appearance";

/** Plain textarea owns keyboard/selection/IME; structured runs own semantic formatting. */
export function KcdRichTextControls({node,device,values,submit}:{node:KcdNode;device:Device;values:Record<string,unknown>;submit:(label:string,make:()=>Op[])=>void}) {
 const text=String(values.text??"");
 const id=useId(),ref=useRef<HTMLTextAreaElement>(null),[buffer,setBuffer]=useState({source:text,draft:text}),[href,setHref]=useState(""),[selection,setSelection]=useState({start:0,end:0});
 if(buffer.source!==text)setBuffer({source:text,draft:text});
 const draft=buffer.source===text?buffer.draft:text;
 const runs=values.runs as RichRun[]|undefined;
 const fields=(nextText:string,nextRuns:RichRun[]|undefined)=>{
  const ops=primitivePropertyOperations(node,device,"text",nextText);
  if(nextRuns)ops.push(...primitivePropertyOperations(node,device,"runs",nextRuns));
  else if(device==="desktop")ops.push({op:"unsetProp",id:node.id,path:"runs"});
  else ops.push(...primitivePropertyOperations(node,device,"runs",nextText?[{text:nextText}]:[]));
  if(device==="desktop")for(const target of ["tablet","mobile"] as const){const bucket=node.overrides[target];if(bucket && typeof bucket.text==="string" && bucket.runs===undefined && bucket.text!==nextText){const preserved=runs && richTextValue(runs)===bucket.text?runs:bucket.text?[{text:bucket.text}]:[];ops.push(...primitivePropertyOperations(node,target,"runs",preserved));}}
  return ops;
 };
 const commit=()=>{if(draft!==text)submit("Edit rich text",()=>fields(draft,editRichText(text,draft,runs)));};
 const format=(mark:RichMark,value:boolean|string)=>submit("Format selected text",()=>{if(values.href && mark==="href" && value)throw new Error("Remove the whole-element link before linking selected text.");const edited=editRichText(text,draft,runs);return fields(draft,formatRichRange(draft,edited,selection.start,selection.end,mark,value));});
 const style={borderColor:BUILDER.border,background:BUILDER.surface,color:BUILDER.ink,colorScheme:BUILDER.colorScheme},button="rounded-lg border px-2 py-1 text-[12px] disabled:opacity-40";
 return <div className="space-y-2">
  <label htmlFor={id} className="block text-[12px] font-medium">Text</label>
  <textarea id={id} ref={ref} rows={4} maxLength={5000} className="w-full rounded-lg border px-2.5 py-2 text-[12px]" style={style} value={draft} onChange={event=>setBuffer({source:text,draft:event.target.value})} onSelect={event=>setSelection({start:event.currentTarget.selectionStart,end:event.currentTarget.selectionEnd})} onBlur={commit} />
  <p className="text-[11px]" style={{color:BUILDER.muted}}>Select text to format it. Formatting stays editable and follows your device settings.</p>
  <div role="group" aria-label="Selected text formatting" className="flex flex-wrap gap-1">
   {(["bold","italic","underline"] as const).map(mark=><button key={mark} type="button" className={button} style={style} disabled={selection.start===selection.end} onMouseDown={event=>event.preventDefault()} onClick={()=>format(mark,true)}>{mark[0].toUpperCase()+mark.slice(1)}</button>)}
   <button type="button" className={button} style={style} disabled={selection.start===selection.end} onMouseDown={event=>event.preventDefault()} onClick={()=>submit("Clear selected formatting",()=>{let next=editRichText(text,draft,runs);for(const mark of ["bold","italic","underline","href"] as const)next=formatRichRange(draft,next,selection.start,selection.end,mark,false);return fields(draft,next);})}>Clear formatting</button>
  </div>
  <label className="block space-y-1 text-[12px]">Selected text link<input className="w-full rounded-lg border px-2 py-1.5" style={style} value={href} maxLength={300} onChange={event=>setHref(event.target.value)} /></label>
  <button type="button" className={button} style={style} disabled={selection.start===selection.end} onClick={()=>format("href",href)}>Apply link to selection</button>
 </div>;
}
