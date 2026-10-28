/** Apply artist-supplied media to a private native draft; never writes hosted data. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mayDraftDefinition} from './build-may-reference-draft.mjs';
export const artistMediaBase='/may-design-draft/artist/';
export function integrateMayArtistMedia(input){
  const draft=structuredClone(input),pages=new Map(draft.pages.map(p=>[p.slug,p]));
  if(['home','music','videos','audio','photos'].some(slug=>!pages.has(slug)))throw Error('Expected the recovered May site pages.');
  const media=artistMediaBase,video=media+'yaw-laa-taan-preview.mp4',cover=media+'yaw-laa-taan-cover.jpeg';
  const replacePortraits=value=>typeof value==='string'?(value==='/templates/maylecor/portrait.jpg'?media+'pink-portrait.jpeg':value):Array.isArray(value)?value.map(replacePortraits):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replacePortraits(v)])):value;
  draft.sections=draft.sections.map(s=>({...s,props:replacePortraits(s.props)}));
  const set=(slug,id,type,props,order=1)=>{
    const next={id,page_id:pages.get(slug).id,section_type:type,sort_order:order,props};
    const index=draft.sections.findIndex(s=>s.id===id);if(index<0)draft.sections.push(next);else draft.sections[index]=next;
  };
  for(const slug of ['videos','audio'])draft.sections=draft.sections.filter(s=>!(s.page_id===pages.get(slug).id&&s.section_type==='text'&&/^No (videos|audio) (?:has|have) been published/.test(String(s.props.body??''))));
  set('videos','may-artist-video','video',{heading:'Yaw Laa Taan',src:video,title:'Yaw Laa Taan — design demo preview',caption:'Artist-supplied 16-second design demo. Play to hear the audio.',thumbnail:cover,layout:'single'});
  set('audio','may-artist-audio','audio',{heading:'Yaw Laa Taan — preview',src:media+'yaw-laa-taan-preview.m4a',title:'16-second design demo preview',artist:'May Lècor Diallo'});
  set('music','may-artist-listen','audio',{heading:'Yaw Laa Taan',src:media+'yaw-laa-taan-preview.m4a',title:'Design demo preview · 16 seconds',artist:'May Lècor Diallo'});
  for(const section of draft.sections){
    if(section.page_id===pages.get('music').id&&section.section_type==='hero'&&section.props.heading==='Listen to May')Object.assign(section.props,{heading:'Yaw Laa Taan',subheading:'Listen to the artist-supplied design demo preview.',buttonLabel:'Watch the preview',buttonHref:'/videos'});
    if(section.props.backgroundLayer==='/may-design-draft/notebook.svg'){
      section.props.extraCutouts=section.props.extraCutouts.map((layer,index)=>({...layer,src:media+(index?'pink-portrait.jpeg':'gold-portraits.jpeg'),alt:index?'May Lècor in pink':'May Lècor gold portrait collection'}));
      if(section.props.deviceOverrides?.mobile?.extraCutouts)section.props.deviceOverrides.mobile.extraCutouts=section.props.deviceOverrides.mobile.extraCutouts.map((layer,index)=>({...layer,src:section.props.extraCutouts[index].src,alt:section.props.extraCutouts[index].alt}));
    }
  }
  set('photos','may-artist-gallery','gallery',{heading:'Yaw Laa Taan — visual world',items:[{src:cover,alt:'Yaw Laa Taan cover artwork'},{src:media+'yaw-laa-taan-storyboard.jpeg',alt:'Yaw Laa Taan visual storyboard'}]},2);
  if(pages.has('mayjor-good')){
    draft.sections=draft.sections.filter(s=>!(s.page_id===pages.get('mayjor-good').id&&s.section_type==='text'&&s.props.body==='No photos have been published in this collection yet.'));
    for(const section of draft.sections.filter(s=>s.page_id===pages.get('mayjor-good').id)){
      if(section.section_type==='features')section.props.items=(section.props.items??[]).map(item=>({...item,href:'/contact'}));
      if(typeof section.props.body==='string')section.props.body=section.props.body.replace(/ Full foundation site:.*$/,'').replace('For enquiries, use May’s published social links.','For enquiries, use the Contact page.');
    }
    set('mayjor-good','may-foundation-enquiry','form',{heading:'Support For The Mayjor Good',subheading:'Ask about volunteering, school supplies, care days or a partnership.',buttonLabel:'Send foundation enquiry',successMessage:'Your foundation enquiry has been received.',fields:[{id:'name',label:'Your name',type:'text',required:true},{id:'email',label:'Email address',type:'email',required:true},{id:'message',label:'How would you like to help?',type:'textarea',required:true}]},20);
  }
  const scene=draft.sections.find(s=>s.id==='may-reference-title-videos');
  if(scene){
    const layer={id:'yaw-preview-scene',label:'Yaw Laa Taan silent scroll preview',src:video,poster:cover,mode:'scrub',leftPct:64,topPct:12,widthPct:24,aspectRatio:512/910,frameShape:'torn',frameWidth:7,frameColor:'#ffffff',rotate:4,travelY:-70};
    scene.props.extraCutouts=scene.props.extraCutouts.filter(l=>l.id!=='page-photo-videos');
    scene.props.sceneVideos=[layer];
    const mobile=scene.props.deviceOverrides?.mobile;
    if(mobile){mobile.extraCutouts=mobile.extraCutouts.filter(l=>l.id!=='page-photo-videos');mobile.sceneVideos=[{...layer,leftPct:34,topPct:51,widthPct:48,travelY:-20}];}
  }
  const base=draft.sections.find(s=>s.id==='may-reference-title-about');
  if(base){
    const chapter=(id,title,note,photo,order)=>{
      const props=structuredClone(base.props);
      props.title=title;props.subtitle=note;
      props.extraCutouts=props.extraCutouts.map(layer=>layer.kind==='text'?{...layer,text:layer.id.startsWith('page-title-')?title:note}:{...layer,src:media+photo,alt:'May Lècor — artist-supplied portrait'});
      props.layerScroll=Object.fromEntries(props.extraCutouts.map((layer,index)=>[layer.id,{x:index===2?70:-70,y:index===2?-90:-25}]));
      if(props.deviceOverrides?.mobile){props.deviceOverrides.mobile.extraCutouts=props.deviceOverrides.mobile.extraCutouts.map(layer=>layer.kind==='text'?{...layer,text:layer.id.startsWith('page-title-')?title:note}:{...layer,src:media+photo,alt:'May Lècor — artist-supplied portrait'});}
      set('home',id,'legally-blonde-hero',props,order);return props;
    };
    chapter('may-home-artist','THE ARTIST','Singer · songwriter · performer.','pink-portrait.jpeg',5);
    const notebook=draft.sections.find(s=>s.props.backgroundLayer==='/may-design-draft/notebook.svg');
    if(notebook)set('home','may-home-notebook','legally-blonde-hero',structuredClone(notebook.props),10);
    const cinema=chapter('may-home-cinema','YAW LAA TAAN','A glimpse into May’s visual world.','yaw-laa-taan-cover.jpeg',15);
    cinema.extraCutouts=cinema.extraCutouts.filter(l=>l.kind==='text');
    cinema.sceneVideos=[{id:'home-yaw-preview',label:'Yaw Laa Taan silent preview',src:video,poster:cover,mode:'loop',leftPct:63,topPct:10,widthPct:24,aspectRatio:512/910,frameShape:'torn',frameWidth:7,frameColor:'#ffffff',rotate:-4,travelX:30,travelY:-70}];
    if(cinema.deviceOverrides?.mobile){cinema.deviceOverrides.mobile.extraCutouts=cinema.deviceOverrides.mobile.extraCutouts.filter(l=>l.kind==='text');cinema.deviceOverrides.mobile.sceneVideos=[{...cinema.sceneVideos[0],leftPct:34,topPct:50,widthPct:49,travelX:0,travelY:-15}];}
    set('home','may-home-cinema','legally-blonde-hero',cinema,15);
    set('home','may-home-watch','hero',{heading:'Hear the story',subheading:'Yaw Laa Taan — the artist-supplied design demo preview.',buttonLabel:'Watch and listen',buttonHref:'/videos',background:'#e9006b',align:'center'},20);
    chapter('may-home-connect','LET’S CONNECT','Press · bookings · partnerships.','gold-portraits.jpeg',55);
    set('home','may-home-contact','hero',{heading:'Contact May',subheading:'Start a conversation with May’s team.',buttonLabel:'Send an enquiry',buttonHref:'/contact',background:'#e9006b',align:'center'},60);
    for(const section of draft.sections)if(section.page_id===pages.get('home').id&&section.section_type==='hero'&&section.props.heading==='For The Mayjor Good')section.sort_order=50;
  }
  return draft;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [input,output]=process.argv.slice(2);if(!input||!output||resolve(input)===resolve(output))throw Error('Provide separate input and output paths.');
  const draft=integrateMayArtistMedia(JSON.parse(readFileSync(input,'utf8')));
  writeFileSync(output,JSON.stringify(draft,null,2),{mode:0o600});writeFileSync(output+'.website.json',JSON.stringify(mayDraftDefinition(draft),null,2),{mode:0o600});
  console.log('Integrated artist-supplied photos, real video and its original audio into the native local draft.');
}
