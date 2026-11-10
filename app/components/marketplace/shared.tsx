"use client";
import { useEffect,useState } from "react";
export const mainButton="inline-flex min-h-11 items-center justify-center rounded-full bg-[#ff5500] px-4 py-2 text-sm font-semibold text-black hover:bg-[#ff7733] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40";
export const altButton="inline-flex min-h-11 items-center justify-center rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:bg-[#fff8f2] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40";
export const field="min-h-11 w-full rounded-xl border border-black/20 bg-white px-3 py-2 text-base";
export async function request<T>(url:string,body?:object,method="POST"):Promise<T>{
  const res=await fetch(url,body?{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{cache:"no-store"});
  const data=await res.json().catch(()=>null);
  if(!data)throw new Error("Could not read the server response. Your changes are kept; try again.");
  if(!res.ok)throw new Error(data.error??"Something went wrong. Try again.");
  return data as T;
}
export function Notice({message}:{message:string}){
  return message ? <p role="status" className="rounded-xl border border-black/15 bg-white p-4 text-sm">{message}</p>:null;
}
export function useLoad<T>(url:string){
  const [value,setValue]=useState<T>();
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let active=true;
    request<T>(url).then(data=>{if(active){setValue(data);setError("");}})
      .catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[url]);
  return {value,setValue,error,setError,loading};
}
