import {expect,it} from 'vitest';
import {buildMayReferenceDraft,mayDraftDefinition} from '../../scripts/build-may-reference-draft.mjs';
import {integrateMayArtistMedia} from '../../scripts/integrate-may-artist-media.mjs';
import {defaultMaylecorKsendrProps} from '@/lib/create/maylecor-ksendr-defaults';
import {validateWebsiteDefinition} from '@/lib/create/website-schema';
it('preserves the private input and produces an editable, repeatable artist-media draft',()=>{
 const source=buildMayReferenceDraft({project:{title:'May Lècor',theme:{}},pages:['home','music','videos','audio','about','photos'].map((slug,index)=>({id:slug,slug,title:slug,sort_order:index})),sections:[{id:'scene',page_id:'home',section_type:'legally-blonde-hero',sort_order:0,props:defaultMaylecorKsendrProps()},{id:'biography',page_id:'about',section_type:'text',sort_order:0,props:{heading:'About',body:'The supplied biography remains unchanged.'}}]});
 const original=structuredClone(source),draft=integrateMayArtistMedia(source);
 expect(source).toEqual(original);
 expect(draft.sections.find((s:{id:string;props:Record<string,unknown>})=>s.id==='biography').props.body).toBe('The supplied biography remains unchanged.');
 expect(validateWebsiteDefinition(mayDraftDefinition(draft))).toMatchObject({ok:true});
 expect(integrateMayArtistMedia(draft)).toEqual(draft);
 expect(draft.sections.find((s:{id:string;props:Record<string,unknown>})=>s.id==='may-artist-audio').props.src).toMatch(/preview\.m4a$/);
 expect(draft.sections.find((s:{id:string;props:Record<string,unknown>})=>s.id==='may-artist-video').props.title).toContain('design demo preview');
});
