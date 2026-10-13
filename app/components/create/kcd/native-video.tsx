"use client";
import { useState, type CSSProperties } from "react";

/** Native controls, explicit play and no speculative media download. */
export function KcdNativeVideo({src,poster,captionsSrc,captionsLanguage="en",label="Video",style,appearanceId}:{src:string;poster?:string;captionsSrc?:string;captionsLanguage?:string;label?:string;style:CSSProperties;appearanceId:string}) {
 const [failed,setFailed]=useState(false);
 if(!src)return <div role="status" className="p-4 text-sm">No video selected. Choose a video in the element settings.</div>;
 return <><video data-kcd-appearance-for={appearanceId} aria-label={label} src={src} controls playsInline preload="none" poster={poster||undefined} style={style} onError={()=>setFailed(true)}>
  {captionsSrc ? <track kind="captions" src={captionsSrc} srcLang={captionsLanguage} label={captionsLanguage} /> : null}
  Your browser cannot play this video. <a href={src}>Open video</a>
 </video>{failed ? <p role="alert" className="p-2 text-sm">This video could not be loaded. Check the address or try again. <a href={src}>Open video</a></p> : null}</>;
}
