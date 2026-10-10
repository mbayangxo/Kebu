"use client";
import {useState} from "react";
import {type KcdDocument,type NodeId,type Op,isSpatialLocked} from "@/lib/creative-core";
import {DECOMPOSABLE_SECTIONS,decomposeLegacySection} from "@/lib/create/kcd-section-decomposition";
import {BUILDER} from "@/lib/create/builder-ui";
export function KcdSectionConversion({document,id,submit,disabled=false}:{document:KcdDocument;id:NodeId;submit:(label:string,ops:Op[])=>Promise<unknown>;disabled?:boolean}){
 const [review,setReview]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState<string|null>(null),node=document.nodes[id];
 if(!node || !DECOMPOSABLE_SECTIONS.has(node.type.replace(/^legacy-section:/,"")))return null;
 const convert=async()=>{setPending(true);setError(null);try{const plan=decomposeLegacySection(document,id);await submit("Convert section to editable elements",plan.ops);setReview(false);}catch(error){setError(error instanceof Error?error.message:"This section could not be converted. Your original section is preserved.");}finally{setPending(false);}};
 return <section aria-label="Editable section conversion" className="space-y-2 border-b p-3" style={{borderColor:BUILDER.border,color:BUILDER.ink}}>
  <p className="text-[12px] font-semibold">Edit individual elements</p>
  <p className="text-[11px]" style={{color:BUILDER.muted}}>Convert this section into text, media and containers you can select, move and style.</p>
  {error ? <p role="alert" className="text-[12px] text-red-700">{error}</p> : null}
  <fieldset disabled={disabled||pending||isSpatialLocked(document,id)} className="min-w-0 space-y-2">
   {review ? <><p className="text-[11px]">The layout becomes an editable composition. Copy, media, links and device settings are preserved when supported. Compare the preview after converting; Undo restores the original section.</p><div className="flex gap-2"><button type="button" className="rounded-lg border px-2.5 py-1.5 text-[12px]" onClick={()=>void convert()}>{pending?"Converting…":"Convert to editable elements"}</button><button type="button" className="text-[12px] underline" onClick={()=>{setReview(false);setError(null);}}>Cancel conversion</button></div></> : <button type="button" className="rounded-lg border px-2.5 py-1.5 text-[12px]" onClick={()=>setReview(true)}>Review section conversion</button>}
  </fieldset>
  {isSpatialLocked(document,id)?<p className="text-[11px]">Unlock this section before converting.</p>:null}
 </section>;
}
