"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { CollageVideoInspector } from "@/app/components/create/collage-video-inspector";
import { defaultCutoutCollageProps } from "@/lib/create/legally-blonde-defaults";
import type { CollageVideo } from "@/lib/create/collage-video";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

/** Controlled local renderer fixture, never a hosted or actual May content claim. */
export default function VideoSceneProbe() {
  const path=usePathname();const slug=path.split('/')[2] || 'home';
  const [layers,setLayers]=useState<CollageVideo[]>([]), [preview,setPreview]=useState(false);
  const [message,setMessage]=useState('');
  const props={...defaultCutoutCollageProps(),title:'VIDEO SCENE',brandLabel:'VIDEO SCENE',titleAsText:true,showNavigation:false,socialLinks:[],backgroundHidden:true,hiddenLayers:['titleLogo','cutoutLeft','cutoutAccent','cutoutRight','cutoutSparkle','heroPhoto','macbook','sparkleGif'],extraCutouts:[],sceneVideos:layers,sectionMinHeightPx:620};
  const definition: WebsiteDefinition={schemaVersion:'website-v1',title:'Video scene fixture',theme:{primary:'#111111',accent:'#E9006B',background:'#ffffff',text:'#111111',fontDisplay:'Oswald',fontBody:'Manrope',spacing:'comfortable'},pages:['home','music','photos'].map(slug=>({slug,title:slug,sections:[{id:`scene-${slug}`,type:'legally-blonde-hero',props}]}))};
  return <>
    <div data-testid="video-fixture-ready" ref={element=>{if(element)element.dataset.ready="true";}} className="relative z-[100] bg-white p-3 text-black">
      <h1 data-testid="fixture-page">{slug}</h1>
      <button onClick={()=>setPreview(!preview)}>{preview?'Edit video scene':'Preview video scene'}</button>
      <button onClick={()=>{localStorage.setItem('video-scene-test',JSON.stringify(layers));setMessage('Saved local fixture');}}>Save local fixture</button>
      <button onClick={()=>{const saved=localStorage.getItem('video-scene-test');if(saved)setLayers(JSON.parse(saved));}}>Load local fixture</button>
      <output>{message}</output>
      {!preview?<CollageVideoInspector value={layers} projectId="11111111-1111-4111-8111-111111111111" onChange={setLayers}/>:null}
    </div>
    <SiteRenderer definition={definition} pageSlug={slug} siteBase="/video-scene-local-probe" mode={preview?'live':'preview'} editor={preview?undefined:{onPatchSection:()=>undefined}} />
    <section style={{minHeight:"100vh"}}>Following chapter — local video visibility test</section>
  </>;
}
