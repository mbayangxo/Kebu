import { describe, expect, it } from 'vitest';
import { collageVideoSchema, collageVideosSchema, collageMediaUrlSchema, collageVideoProgress, collageVideoTransform } from '@/lib/create/collage-video';
import { validateWebsiteDefinition } from '@/lib/create/website-schema';
import { defaultCutoutCollageProps } from '@/lib/create/legally-blonde-defaults';
import { websiteV1ToDocument, documentToWebsiteV1 } from '@/lib/create/kcd-adapter';
import type { WebsiteDefinition } from '@/lib/create/website-schema';

describe('ordinary collage video settings',()=>{
  it('rejects executable/credentialed/ambiguous URLs, duplicate ids and invalid scroll ranges',()=>{
    for(const src of ['javascript:alert(1)','//evil.test/v.mp4','/\\evil.test/v.mp4','https://user:secret@example.test/video.mp4','data:video/mp4;base64,aaa'])expect(collageMediaUrlSchema.safeParse(src).success,src).toBe(false);
    const layer=collageVideoSchema.parse({id:'film'});
    expect(collageVideosSchema.safeParse([layer,layer]).success).toBe(false);
    expect(collageVideoSchema.safeParse({...layer,scrollStart:.8,scrollEnd:.2}).success).toBe(false);
  });
  it('bounds timing and composes independent translation, rotation and scale with a still motion-off fallback',()=>{
    const layer=collageVideoSchema.parse({id:'film',scrollStart:.2,scrollEnd:.8,travelX:200,travelY:-100,rotate:40,endScale:1.4});
    expect(collageVideoProgress(layer,0)).toBe(0);expect(collageVideoProgress(layer,1)).toBe(1);
    expect(collageVideoProgress(layer,.5)).toBeCloseTo(.5);
    expect(collageVideoTransform(layer,1)).toBe('translate3d(200px, -100px, 0) rotate(40deg) scale(1.4)');
    expect(collageVideoTransform(layer,1,false)).toBe('translate3d(0px, 0px, 0) rotate(0deg) scale(1)');
  });
  it('preserves complete base and phone video data through validation and the canonical document adapter',()=>{
    const layer=collageVideoSchema.parse({id:'film',src:'https://example.test/film.webm',href:'/music',mode:'scrub',travelX:180});
    const site={schemaVersion:'website-v1',title:'Artist',theme:{primary:'#111111',accent:'#E9006B',background:'#ffffff',text:'#111111',fontDisplay:'Oswald',fontBody:'Manrope',spacing:'comfortable'},pages:[{slug:'home',title:'Home',sections:[{id:'scene',type:'legally-blonde-hero',props:{...defaultCutoutCollageProps(),sceneVideos:[layer],deviceOverrides:{mobile:{sceneVideos:[{...layer,widthPct:80,travelX:20}]}}}}]}]} as WebsiteDefinition;
    expect(validateWebsiteDefinition(site).ok).toBe(true);
    const saved=documentToWebsiteV1(websiteV1ToDocument(site,{id:'11111111-1111-4111-8111-111111111111'}).document) as WebsiteDefinition;
    expect(saved.pages[0].sections[0].props.sceneVideos).toEqual([layer]);
    expect(saved.pages[0].sections[0].props.deviceOverrides).toEqual(site.pages[0].sections[0].props.deviceOverrides);
  });
});
