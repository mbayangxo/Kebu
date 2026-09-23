import type { BuilderSectionCategory } from "./builder-section-catalog";
export type BuilderBlockCapability = "content" | "media" | "commerce" | "engagement" | "integration";
export type BuilderBlockDefinition = { type: string; label: string; description: string; category: BuilderSectionCategory; capabilities: readonly BuilderBlockCapability[]; app?: { id: string; provider: "kebu" | "external"; requiresConnection?: boolean } };
/** Apps use the same validated section, autosave, responsive and publishing pipeline as native blocks. */
export const BUILDER_APP_BLOCKS: readonly BuilderBlockDefinition[] = [
 { type:"newsletter",label:"Email signup",description:"Collect subscribers with Kebu Email.",category:"apps",capabilities:["engagement","integration"],app:{id:"kebu-email",provider:"kebu"}},
 { type:"form",label:"Forms",description:"Collect structured responses into your Kebu site.",category:"apps",capabilities:["engagement","integration"],app:{id:"kebu-forms",provider:"kebu"}},
 { type:"map",label:"Map",description:"Add a location block.",category:"apps",capabilities:["content","integration"],app:{id:"maps",provider:"external"}},
 { type:"whatsapp",label:"WhatsApp",description:"Add a direct chat or order action.",category:"apps",capabilities:["commerce","integration"],app:{id:"whatsapp",provider:"external"}},
 { type:"joko",label:"Joko",description:"Add a Joko payment action.",category:"apps",capabilities:["commerce","integration"],app:{id:"joko",provider:"kebu"}},
 { type:"audio",label:"Music player",description:"Add uploaded audio or a supported music source.",category:"apps",capabilities:["media","integration"],app:{id:"audio",provider:"kebu"}},
 { type:"video",label:"Video",description:"Add uploaded video or supported video links.",category:"apps",capabilities:["media","integration"],app:{id:"video",provider:"kebu"}},
] as const;
export function builderAppForSection(type:string){return BUILDER_APP_BLOCKS.find((block)=>block.type===type);}
