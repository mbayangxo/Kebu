import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { BRAND_BRAIN_SELECT, brandBrainFromRow, compileBrandBrain } from "@/lib/create/brand-brain";
import { bindingFromRow } from "@/lib/create/brand-brain-binding";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
const input=z.strictObject({profileId:z.string().uuid().nullable(),expectedRevision:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)});
export async function GET(_req:Request,context:Context) {
  const auth=await requireUser();if("error" in auth)return auth.error;
  const {id}=await context.params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"Invalid site."},{status:400});
  // Private direction is owner-only; never use the support/team service client.
  const project=await auth.supabase.from("projects").select("id").eq("id",id).eq("owner_id",auth.user.id).maybeSingle();
  if(project.error)return NextResponse.json({error:"Could not load site direction. Retry."},{status:503});
  if(!project.data)return NextResponse.json({error:"Only the site owner can manage private Brand Brain direction."},{status:404});
  const result=await auth.supabase.from("project_brand_brains").select("profile_id,revision").eq("project_id",id).maybeSingle();
  if(result.error)return NextResponse.json({error:"Could not load site direction. Retry."},{status:503});
  try {
    const binding=bindingFromRow(id,result.data);let record=null,unavailable=false;
    if(binding.profileId){
      const profile=await auth.supabase.from("business_brand_kits").select(BRAND_BRAIN_SELECT).eq("id",binding.profileId).eq("owner_id",auth.user.id).maybeSingle();
      if(profile.error)return NextResponse.json({error:"Could not load attached profile. Retry."},{status:503});
      try{record=brandBrainFromRow(profile.data as Record<string,unknown>);}catch{unavailable=true;}
    }
    return NextResponse.json({binding,record,unavailable,direction:record?compileBrandBrain(record.profile):null});
  }catch{return NextResponse.json({error:"Site direction data is incompatible. Reload before changing it."},{status:503});}
}
export async function PUT(req:Request,context:Context) {
  const limited=builderRateLimit(req);if(limited)return limited;
  const auth=await requireUser();if("error" in auth)return auth.error;
  const {id}=await context.params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"Invalid site."},{status:400});
  const parsed=input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Choose a saved profile and valid attachment revision."},{status:400});
  const {profileId,expectedRevision}=parsed.data;
  if(profileId){
    const profile=await auth.supabase.from("business_brand_kits").select(BRAND_BRAIN_SELECT).eq("id",profileId).eq("owner_id",auth.user.id).maybeSingle();
    if(profile.error)return NextResponse.json({error:"Could not check this profile. Reload direction before retrying."},{status:503});
    if(!profile.data)return NextResponse.json({error:"Profile not found."},{status:404});
    try{brandBrainFromRow(profile.data as Record<string,unknown>);}catch{return NextResponse.json({error:"This profile is incompatible. Review Brand Brain before attaching."},{status:422});}
  }
  const {data,error}=await auth.supabase.rpc("save_project_brand_brain",{p_project:id,p_profile:profileId,p_expected:expectedRevision});
  if(error){const status=error.code==="40001"?409:["42501","P0002"].includes(error.code)?404:503;return NextResponse.json({error:status===409?"Site direction changed elsewhere. Reload the saved attachment before retrying.":status===404?"Site or profile not found.":"Attachment could not be confirmed. Reload the saved attachment before retrying."},{status});}
  try{
    const binding=bindingFromRow(id,data);
    if(data?.project_id!==id||binding.profileId!==profileId||binding.revision!==expectedRevision+1)throw new Error("Invalid acknowledgement");
    return NextResponse.json({binding});
  }catch{return NextResponse.json({error:"Attachment acknowledgement was invalid. Reload the saved attachment before retrying."},{status:503});}
}
