import type{AudioCatalogItem,AudioCatalogProvider}from"@/lib/studio/audio-engine";
export class RectSoundProvider implements AudioCatalogProvider{id="rect_sound" as const;async search(_query:string):Promise<AudioCatalogItem[]>{return[]}}
export const rectSoundAvailability={available:false as const,reason:"RECT Sound catalog is not connected yet. Uploaded and licensed local audio remain available."};
