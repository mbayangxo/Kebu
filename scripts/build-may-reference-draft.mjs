/** Local, non-mutating design application. Never writes to Supabase or deploys. */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const mediaSources = JSON.parse(readFileSync(new URL('../public/may-design-draft/media-sources.json', import.meta.url), 'utf8'));
const localizeMedia = value => typeof value === 'string' ? (mediaSources[value] ?? value) : Array.isArray(value) ? value.map(localizeMedia) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key,item])=>[key,localizeMedia(item)])) : value;

const scope = '[data-kebu-aesthetic="may-reference"]';
export const mayReferenceCss = `
@font-face{font-family:MayEditorial;src:url('/fonts/kebu-display/KebuDisplay-Bold.woff2') format('woff2');font-display:swap;font-weight:700;}
${scope}{background:#ed0873 url('/templates/legally-blonde/background.png') center/cover!important;color:#fff!important;font-family:Arial,sans-serif;}
${scope} .kebu-section{padding-block:clamp(40px,7vw,100px);position:relative;}
${scope} .kebu-section h2{font-family:MayEditorial,'Arial Narrow',sans-serif!important;font-size:clamp(38px,6vw,88px);line-height:1;letter-spacing:-.025em;text-transform:uppercase;max-width:100%;overflow-wrap:anywhere;}
${scope} .kebu-section p{font-size:clamp(16px,1.4vw,20px);line-height:1.7;opacity:1;}
${scope} .kebu-section a:focus-visible,${scope} button:focus-visible{outline:3px solid #fff;outline-offset:5px;}
${scope} .kebu-section img{border:5px solid #fff;box-shadow:10px 12px 0 #9d064b;}
${scope} [data-hero-height]{border-bottom:8px solid #fff;}
${scope} [data-hero-height] h1{font-family:MayEditorial,'Arial Narrow',sans-serif!important;font-size:clamp(58px,10vw,150px)!important;line-height:.95;letter-spacing:-.035em;text-transform:uppercase;}
${scope} [data-hero-height]>img{left:50%;width:50%;object-fit:contain;object-position:center bottom;}
${scope}[data-kebu-page="home"] .lb-editor-scroll-scene{border:clamp(8px,2vw,28px) solid #ed0873;}
${scope} .kebu-section .grid{gap:clamp(20px,4vw,56px);}
${scope} .kebu-section .grid>div:nth-child(even) img{transform:rotate(2deg);}
${scope} .kebu-section .grid>div:nth-child(odd) img{transform:rotate(-2deg);}
${scope} [data-kebu-layer^="page-photo-"],${scope} [data-kebu-layer^="memory-photo-"]{box-shadow:0 0 0 7px #fff,12px 14px 0 #a0054c;}
@media(max-width:640px){${scope} .kebu-section{padding-inline:22px;} ${scope} .kebu-section img{box-shadow:5px 7px 0 #9d064b;} ${scope} [data-hero-height]>img{left:0;width:100%;height:65%;object-position:center top;}}
@media(prefers-reduced-motion:reduce){${scope} *,${scope} *::before,${scope} *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}}
`;

export function buildMayReferenceDraft(source) {
  if (!source?.project || !Array.isArray(source.pages) || !Array.isArray(source.sections)) throw new Error('Expected a saved project snapshot.');
  const draft = structuredClone(source);
  const hero = draft.sections.find(s => s.section_type === 'legally-blonde-hero');
  if (!hero || !/may/i.test(String(hero.props.brandLabel ?? hero.props.title))) throw new Error('This design is only for the May project.');
  if (!draft.pages.some(p=>p.slug==='contact')) {
    draft.pages.push({id:'may-reference-contact',slug:'contact',title:'Contact',sort_order:Math.max(...draft.pages.map(p=>p.sort_order))+1});
    draft.sections.push({id:'may-reference-contact-form',page_id:'may-reference-contact',section_type:'form',sort_order:0,props:{heading:'Contact May',subheading:'Press, bookings, partnerships and other enquiries.',buttonLabel:'Send enquiry',successMessage:'Thank you. Your enquiry has been received.',fields:[{id:'name',label:'Your name',type:'text',required:true},{id:'email',label:'Email address',type:'email',required:true},{id:'message',label:'Your message',type:'textarea',required:true}]}});
  }
  if (!(hero.props.navLinks??[]).some(l=>l.href==='/contact')) hero.props.navLinks=[...(hero.props.navLinks??[]),{label:'Contact',href:'/contact'}];
  hero.props.deviceOverrides={...hero.props.deviceOverrides,mobile:{...hero.props.deviceOverrides?.mobile,sectionMinHeightPx:800,layerPositions:{...hero.props.layerPositions,...hero.props.deviceOverrides?.mobile?.layerPositions,cutoutAccent:{leftPct:-35,topPct:20},titleLogo:{leftPct:46,topPct:32}},layerScales:{...hero.props.layerScales,...hero.props.deviceOverrides?.mobile?.layerScales,cutoutAccent:2.4,titleLogo:1.3}}};
  draft.project.theme = { ...draft.project.theme, aestheticId:'may-reference', motion:'expressive', fontDisplay:'Oswald', text:'#ffffff', background:'#ed0873', primary:'#b30757', accent:'#ffb9d5', customCss: mayReferenceCss };
  const descriptions = {music:'Music by May Lècor.',photos:'Portraits, moments, and May’s world.',videos:'Visual stories by May Lècor.', 'mays-world':'Music, film, stories, and the world around May.',shop:'Music and merchandise.',updates:'Notes and news from May.',about:'A New York African love story.',press:'May Lècor — press and enquiries.',audio:'Sound and voice from May’s world.',maygazine:'Stories, looks, and culture.', 'may-by-may':'In the kitchen with May.', 'mayjor-good':'For The Mayjor Good.'};
  for (const page of draft.pages) {
    if (page.slug === 'home') continue;
    const id = `may-reference-title-${page.slug}`;
    const existing=draft.sections.find(s=>s.id===id);
    if(existing?.section_type==='legally-blonde-hero')continue;
    const photoId=`page-photo-${page.slug}`,titleId=`page-title-${page.slug}`,noteId=`page-note-${page.slug}`;
    const scene={id,page_id:page.id,section_type:'legally-blonde-hero',sort_order:-1,props:{title:page.title,subtitle:descriptions[page.slug]??'',brandLabel:'MAY LÈCOR',backgroundLayer:'/templates/legally-blonde/background.png',backgroundHidden:false,titleLogo:'',cutoutLeft:'',cutoutRight:'',cutoutAccent:'',heroPhoto:'',macbook:'',cutoutSparkle:'',sparkleGif:'',hiddenLayers:['titleLogo','cutoutLeft','cutoutRight','cutoutAccent','heroPhoto','macbook','cutoutSparkle','sparkleGif'],showNavigation:false,showChromeLogo:false,socialLinks:[],socialRailVisible:false,navLinks:[],motionEnabled:true,scrollMode:'parallax',showExtras:false,accentColor:'#e9006b',sectionMinHeightPx:720,extraCutouts:[{id:titleId,kind:'text',src:'',text:page.title.toUpperCase(),leftPct:6,topPct:20,widthPct:54,fontSize:144,fontFamily:'editorial',textColor:'#e9006b',outlineColor:'#ffffff',outlineWidth:6,zIndex:20},{id:noteId,kind:'text',src:'',text:descriptions[page.slug]??'',leftPct:8,topPct:60,widthPct:42,fontSize:30,fontFamily:'sans',textColor:'#ffffff',outlineWidth:0,zIndex:20},{id:photoId,src:'/templates/maylecor/portrait.jpg',alt:'May Lècor portrait',leftPct:63,topPct:12,widthPct:28,rotate:-4,zIndex:10}],layerFrameAspectRatio:{[photoId]:.8},layerFrameFit:{[photoId]:'cover'},layerScroll:{[titleId]:{x:-90,y:-30},[noteId]:{x:-30,y:-20},[photoId]:{x:50,y:-80}},deviceOverrides:{mobile:{sectionMinHeightPx:780,extraCutouts:[{id:titleId,kind:'text',src:'',text:page.title.toUpperCase(),leftPct:8,topPct:24,widthPct:80,fontSize:180,fontFamily:'editorial',textColor:'#e9006b',outlineColor:'#ffffff',outlineWidth:3,zIndex:20},{id:noteId,kind:'text',src:'',text:descriptions[page.slug]??'',leftPct:8,topPct:42,widthPct:80,fontSize:48,fontFamily:'sans',textColor:'#ffffff',outlineWidth:0,zIndex:20},{id:photoId,src:'/templates/maylecor/portrait.jpg',alt:'May Lècor portrait',leftPct:35,topPct:52,widthPct:54,rotate:4,zIndex:10}],layerScroll:{[titleId]:{x:-20,y:-15},[noteId]:{x:-10,y:-10},[photoId]:{x:20,y:-30}}}}}};
    if(existing)Object.assign(existing,scene);else draft.sections.push(scene);
  }
  const pageById = new Map(draft.pages.map(p=>[p.id,p.slug]));
  const empty = (s,heading,body) => {s.section_type='text';s.props={heading,body};};
  for (const section of draft.sections) {
    const slug=pageById.get(section.page_id), p=section.props;
    if (typeof p.body==='string') {
      p.body=p.body.replace('Edit this page in your Kebu site editor.','').replace('Add issues and articles here.','').replace('Upload tracks or paste stream links in the editor.','').trim();
      if(slug==='shop' && /later Kebu slice|add or edit products/.test(p.body)) p.body='Music and merchandise from May.';
    }
    if (section.section_type==='gallery' && Array.isArray(p.items)) {
      p.items=p.items.filter(item=>String(item.src??'').trim()&&!String(item.src).includes('/media/11062b_')&&!/^https?:\/\/[^/]+\/?$/.test(String(item.src)));
      if(!p.items.length)empty(section,'Photos','No photos have been published in this collection yet.');
    }
    if(section.section_type==='gallery' && slug==='photos') {
      const photos=[...new Map((p.items??[]).filter(item=>!String(item.src).includes('.png')).map(item=>[item.src,item])).values(), {src:'/templates/maylecor/portrait.jpg',alt:'May Lècor portrait'}].slice(0,2);
      section.section_type='legally-blonde-hero';
      const layers=photos.map((photo,index)=>({id:`memory-photo-${index}`,src:photo.src,alt:photo.alt,leftPct:14+index*43,topPct:20+index*6,widthPct:29,rotate:index?5:-5,zIndex:10}));
      section.props={...hero.props,backgroundLayer:'/may-design-draft/notebook.svg',backgroundHidden:false,hiddenLayers:['titleLogo','cutoutLeft','cutoutRight','cutoutAccent','heroPhoto','macbook','cutoutSparkle','sparkleGif'],showNavigation:false,showChromeLogo:false,socialRailVisible:false,socialLinks:[],navLinks:[],sectionMinHeightPx:800,extraCutouts:layers,layerMotions:{},layerPositions:{},layerScales:{},layerScroll:Object.fromEntries(layers.map((layer,index)=>[layer.id,{x:index?35:-35,y:-50}])),layerFrameAspectRatio:Object.fromEntries(layers.map(layer=>[layer.id,.8])),layerFrameFit:Object.fromEntries(layers.map(layer=>[layer.id,'contain'])),deviceOverrides:{mobile:{sectionMinHeightPx:1050,extraCutouts:layers.map((layer,index)=>({...layer,leftPct:index?36:10,topPct:index?53:12,widthPct:52})),layerScroll:Object.fromEntries(layers.map(layer=>[layer.id,{x:0,y:-15}]))}}};
    }
    if(section.section_type==='maylecor-music' && !(p.tracks??[]).length){section.section_type='hero';section.props={heading:'Listen to May',subheading:'Verified listening links will be published here.',buttonLabel:'Contact May',buttonHref:'/contact',background:'#e9006b',align:'center'};}
    if(section.section_type==='hero' && slug==='may-by-may') p.subheading=String(p.subheading??'').replace(/ Add clips.*$/,'');
    if(slug==='mayjor-good' && typeof p.body==='string') p.body=p.body.replace(/ Update donation links.*$/,'');
    if (Array.isArray(p.socialLinks)) p.socialLinks=p.socialLinks.filter(link=>!/^https:\/\/(music\.apple\.com|open\.spotify\.com)\/?$/.test(String(link.href??'')));
    if (section.section_type==='whatsapp' && p.phone==='+221770000000') empty(section,'Enquiries','For enquiries, use May’s published social links.');
    if (section.section_type==='products' && p.items?.some(i=>i.name==='May Lecor — Digital Album')) empty(section,'Shop updates','No products are available to order here yet.');
    if (section.section_type==='video' && !p.src && !(p.items??[]).some(i=>i.src)) empty(section,'Videos','No videos have been published here yet.');
    if (section.section_type==='audio' && !p.src) empty(section,'Audio','No audio has been published here yet.');
    if (section.section_type==='features' && ['updates','press','maygazine'].includes(slug) && JSON.stringify(p).match(/Replace this|add outlet|edit this cover/)) empty(section,slug==='press'?'Press':slug==='maygazine'?'Maygazine':'Updates','No entries have been published here yet.');
    if (section.section_type!=='legally-blonde-hero') section.props={...section.props,builderMotion:{preset:'fade-up',durationMs:650,delayMs:0,trigger:'scroll'}};
  }
  const localFoundation = value => typeof value === 'string' ? (/^https:\/\/(forthemayjorgood\.com|mayjorgood\.kebu\.africa)(?:\/|$)/.test(value) ? '/mayjor-good' : value) : Array.isArray(value) ? value.map(localFoundation) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key,item])=>[key,localFoundation(item)])) : value;
  draft.sections=draft.sections.filter(section=>!(section.section_type==='image' && String(section.props.src??'').includes('0380b3_4c2757d9c5b84f7eb202847162b48432')));
  return localizeMedia(localFoundation(draft));
}

/** Standard website-v1 companion for the existing native definition workflow. */
export function mayDraftDefinition(draft) {
  return {schemaVersion:'website-v1',title:draft.project.title,theme:draft.project.theme,seo:draft.project.seo??undefined,pages:[...draft.pages].sort((a,b)=>a.sort_order-b.sort_order).map(page=>({slug:page.slug,title:page.title,deviceLayouts:page.device_layouts??undefined,sections:draft.sections.filter(s=>s.page_id===page.id).sort((a,b)=>a.sort_order-b.sort_order).map(s=>({id:s.id,type:s.section_type,props:s.props}))}))};
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [input,output]=process.argv.slice(2);
  if (!input||!output) throw new Error('Provide input and output snapshot paths.');
  const companion=output+'.website.json';
  if ([output,companion].some(path=>resolve(path)===resolve(input))) throw new Error('Output must not overwrite the recovery snapshot.');
  const draft=buildMayReferenceDraft(JSON.parse(readFileSync(input,'utf8')));
  writeFileSync(output,JSON.stringify(draft,null,2),{mode:0o600});
  writeFileSync(companion,JSON.stringify(mayDraftDefinition(draft),null,2),{mode:0o600});
  console.log('Created a local editable design draft; no remote writes.');
}
