"use client";
import {useEffect,useRef,useState} from "react";
import Image from "next/image";
import {z} from "zod";
import {brandBrainSchema,type BrandBrain} from "@/lib/create/brand-brain";
import {KEBU} from "@/lib/kebu-brand";
type Images=BrandBrain["brand"]["approvedImagery"];
const imageSchema=brandBrainSchema.shape.brand.shape.approvedImagery.element;
const button="rounded-lg border px-3 py-2 text-[12px] font-semibold disabled:opacity-50";
const field="mt-1 w-full rounded-lg border px-3 py-2 text-[12px]";
const style={borderColor:KEBU.border,background:KEBU.white,color:KEBU.black};
const uploadSchema=z.object({url:imageSchema.shape.url,kind:z.literal("image")});
const librarySchema=z.object({uploads:z.array(z.object({id:z.string().uuid(),kind:z.enum(["image","video"]),url:z.string(),file_name:z.string().nullable()})).max(100)});
export function BrandBrainAssets({images,onChange,onUploading}:{images:Images;onChange:(images:Images)=>void;onUploading:(busy:boolean)=>void}){
  const [error,setError]=useState<string|null>(null),[uploading,setUploading]=useState(false);
  const [library,setLibrary]=useState<z.infer<typeof librarySchema>["uploads"]|null>(null),[loading,setLoading]=useState(false),[failed,setFailed]=useState<string[]>([]);
  const running=useRef(false),mounted=useRef(true),controller=useRef<AbortController|null>(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);
  function add(image:Images[number]){
    const checked=imageSchema.safeParse(image);
    if(!checked.success){setError("This image address is incompatible. Use a safe HTTPS image address.");return;}
    if(images.some(item=>item.url===checked.data.url)){setError("This image is already approved.");return;}
    onChange([...images,checked.data]);setError(null);
  }
  async function upload(file?:File){
    if(!file||running.current||images.length>=24)return;
    if(!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)||!file.size||file.size>5*1024*1024){setError("Choose JPG, PNG, WebP or GIF up to 5 MB.");return;}
    running.current=true;setUploading(true);onUploading(true);setError(null);controller.current=new AbortController();
    try{
      const form=new FormData();form.set("file",file);
      const response=await fetch("/api/studio/upload",{method:"POST",credentials:"include",body:form,signal:controller.current.signal}),body=await response.json().catch(()=>null);
      if(!mounted.current)return;
      if(!response.ok)throw new Error(typeof body?.error==="string"?body.error:"Upload failed. Your approved images are kept.");
      const parsed=uploadSchema.safeParse(body);
      if(!parsed.success)throw new Error("Upload could not be confirmed. Check your Studio uploads before retrying.");
      add({url:parsed.data.url,label:file.name.slice(0,80)});
    }catch(failure){if(mounted.current)setError(failure instanceof Error?failure.message:"Upload could not be confirmed. Your draft is kept.");}
    finally{running.current=false;if(mounted.current){setUploading(false);onUploading(false);}}
  }
  async function loadLibrary(){
    setLoading(true);setError(null);
    try{
      const response=await fetch("/api/studio/uploads",{credentials:"include"}),body=await response.json().catch(()=>null);
      if(!mounted.current)return;
      if(!response.ok)throw new Error("Could not load Studio uploads. Retry.");
      const parsed=librarySchema.safeParse(body);if(!parsed.success)throw new Error("Studio upload data is incompatible. Retry.");
      setLibrary(parsed.data.uploads.filter(item=>item.kind==="image"));
    }catch(failure){if(mounted.current)setError(failure instanceof Error?failure.message:"Could not load uploads.");}
    finally{if(mounted.current)setLoading(false);}
  }
  return <section aria-label="Approved brand images" className="space-y-3 border-t pt-3">
    <p className="text-[12px] font-semibold">Approved images · {images.length}/24</p>
    <p className="text-[11px]">Curate images for this direction. Uploads are public assets. Save Brand Brain to keep approval; removing approval leaves the original file intact.</p>
    {error?<p role="alert" className="text-[12px]" style={{color:KEBU.red}}>{error}</p>:null}
    {images.map((image,index)=><fieldset key={index} className="min-w-0 space-y-2 rounded-lg border p-3" style={style}>
      <legend className="text-[12px]">Approved image {index+1}</legend>
      {imageSchema.safeParse(image).success?<div className="flex items-center gap-3"><Image unoptimized src={image.url} alt={image.label||`Approved image ${index+1}`} width={64} height={64} className="h-16 w-16 rounded object-cover" onError={()=>setFailed(previous=>previous.includes(image.url)?previous:[...previous,image.url])}/><a href={image.url} target="_blank" rel="noopener noreferrer" className="text-[12px] underline">Open image {index+1}</a>{failed.includes(image.url)?<span className="text-[11px]">Preview unavailable; check the address.</span>:null}</div>:null}
      <label className="block text-[12px]">Image address {index+1}<input className={field} style={style} maxLength={500} value={image.url} onChange={event=>onChange(images.map((item,i)=>i===index?{...item,url:event.target.value}:item))}/></label>
      <label className="block text-[12px]">Image label {index+1}<input className={field} style={style} maxLength={80} value={image.label??""} onChange={event=>onChange(images.map((item,i)=>i===index?{...item,label:event.target.value}:item))}/></label>
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={index===0} onClick={()=>{const next=[...images];[next[index-1],next[index]]=[next[index],next[index-1]];onChange(next);}}>Move image {index+1} up</button><button type="button" className={button} onClick={()=>onChange(images.filter((_,i)=>i!==index))}>Remove image {index+1}</button></div>
    </fieldset>)}
    <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={images.length>=24||uploading} onClick={()=>onChange([...images,{url:"",label:""}])}>Add image address</button><button type="button" className={button} disabled={loading||uploading} onClick={()=>void loadLibrary()}>{loading?"Loading uploads…":"Choose Studio upload"}</button></div>
    <label className="block text-[12px]">Upload approved image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="mt-1 block w-full text-[12px]" disabled={uploading||images.length>=24} onChange={event=>{const file=event.target.files?.[0];event.target.value="";void upload(file);}}/></label>
    {uploading?<p role="status" className="text-[12px]">Uploading image…</p>:null}
    {library?<div className="space-y-2"><p className="text-[11px]">{library.length?"Choose an existing upload to approve.":"No image uploads yet. Upload an image above."}</p>{library.map(item=><button key={item.id} type="button" className={`${button} block max-w-full truncate`} disabled={images.length>=24||images.some(image=>image.url===item.url)} onClick={()=>add({url:item.url,label:(item.file_name??"Studio image").slice(0,80)})}>Approve {item.file_name??"Studio image"}</button>)}</div>:null}
  </section>;
}
