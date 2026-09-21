import type { BuilderSectionCategory } from "./builder-section-catalog";

export type BuilderBlockCapability = "content" | "media" | "commerce" | "engagement" | "integration";
export type BuilderBlockDefinition = {
  type: string;
  label: string;
  description: string;
  category: BuilderSectionCategory;
  capabilities: readonly BuilderBlockCapability[];
  group: "Engage" | "Social" | "Media" | "Trust" | "Utility";
  extension: { id: string; provider: "kebu" | "connection"; requiresConnection?: boolean };
};

/**
 * Extensions are real site capabilities, not downloadable fake apps.
 * They use the same validated section/autosave/responsive/publish pipeline as native Builder content.
 */
export const BUILDER_APP_BLOCKS: readonly BuilderBlockDefinition[] = [
  { type:"newsletter",label:"Email signup",description:"Collect subscribers into Kebu Mail.",category:"apps",capabilities:["engagement","integration"],group:"Engage",extension:{id:"kebu-email-signup",provider:"kebu"} },
  { type:"form",label:"Form",description:"Collect applications, RSVPs, questions or leads.",category:"apps",capabilities:["engagement"],group:"Engage",extension:{id:"kebu-form",provider:"kebu"} },
  { type:"floating-cta",label:"Floating action",description:"Keep an important action visible while people browse.",category:"apps",capabilities:["engagement"],group:"Engage",extension:{id:"floating-cta",provider:"kebu"} },
  { type:"countdown",label:"Countdown",description:"Countdown to a launch, event, drop or deadline.",category:"apps",capabilities:["engagement"],group:"Engage",extension:{id:"countdown",provider:"kebu"} },
  { type:"social-proof",label:"Social proof",description:"Show activity, community or momentum on the page.",category:"apps",capabilities:["engagement"],group:"Social",extension:{id:"social-proof",provider:"kebu"} },
  { type:"reviews",label:"Reviews",description:"Add customer or community reviews.",category:"apps",capabilities:["engagement"],group:"Trust",extension:{id:"reviews",provider:"kebu"} },
  { type:"testimonials",label:"Testimonials",description:"Feature quotes and stories from people.",category:"apps",capabilities:["content","engagement"],group:"Trust",extension:{id:"testimonials",provider:"kebu"} },
  { type:"trust-badges",label:"Trust badges",description:"Show delivery, payment or trust signals.",category:"apps",capabilities:["commerce"],group:"Trust",extension:{id:"trust-badges",provider:"kebu"} },
  { type:"before-after",label:"Before / after",description:"Interactive visual comparison.",category:"apps",capabilities:["media","engagement"],group:"Media",extension:{id:"before-after",provider:"kebu"} },
  { type:"hotspot-image",label:"Hotspot image",description:"Turn an image into an interactive story or product map.",category:"apps",capabilities:["media","engagement"],group:"Media",extension:{id:"hotspot-image",provider:"kebu"} },
  { type:"gallery",label:"Gallery",description:"Add a reusable visual gallery.",category:"apps",capabilities:["media"],group:"Media",extension:{id:"gallery",provider:"kebu"} },
  { type:"audio",label:"Music player",description:"Play uploaded audio or a supported music source.",category:"apps",capabilities:["media","integration"],group:"Media",extension:{id:"audio",provider:"kebu"} },
  { type:"video",label:"Video",description:"Add uploaded video or supported video links.",category:"apps",capabilities:["media","integration"],group:"Media",extension:{id:"video",provider:"kebu"} },
  { type:"map",label:"Map",description:"Add a location or destination block.",category:"apps",capabilities:["content","integration"],group:"Utility",extension:{id:"maps",provider:"connection",requiresConnection:false} },
  { type:"whatsapp",label:"WhatsApp action",description:"Add a direct chat or order action.",category:"apps",capabilities:["commerce","integration"],group:"Utility",extension:{id:"whatsapp",provider:"connection",requiresConnection:true} },
  { type:"joko",label:"Joko payment",description:"Add a Joko payment action.",category:"apps",capabilities:["commerce","integration"],group:"Utility",extension:{id:"joko",provider:"kebu"} },
] as const;

export function builderAppForSection(type:string){
  return BUILDER_APP_BLOCKS.find((block)=>block.type===type);
}
