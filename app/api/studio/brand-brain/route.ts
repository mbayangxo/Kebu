import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { BRAND_BRAIN_SELECT, brandBrainFromRow, brandBrainSchema, brandBrainStoredFields } from "@/lib/create/brand-brain";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const id = new URL(req.url).searchParams.get("id");
  if (id && !z.string().uuid().safeParse(id).success) return NextResponse.json({error:"Invalid profile ID."},{status:400});
  let query = auth.supabase.from("business_brand_kits").select(BRAND_BRAIN_SELECT).eq("owner_id",auth.user.id).order("updated_at",{ascending:false}).limit(100);
  if (id) query = query.eq("id",id);
  const {data,error} = await query;
  if (error) return NextResponse.json({error:"Could not load Brand Brain. Your profiles have not been changed."},{status:503});
  const profiles:ReturnType<typeof brandBrainFromRow>[]=[],unavailable:{id:string;name:string}[]=[];
  for (const row of data??[]) {
    try { profiles.push(brandBrainFromRow(row as Record<string,unknown>)); }
    catch { unavailable.push({id:String(row.id),name:String(row.name).slice(0,120)}); }
  }
  if (id && unavailable.length) return NextResponse.json({error:"This profile has unsupported settings. Correct them in the original Brand DNA editor; the saved data is unchanged."},{status:422});
  if (id && !profiles.length) return NextResponse.json({error:"Profile not found."},{status:404});
  return NextResponse.json({profiles,unavailable});
}
export const saveBrandBrainSchema = z.strictObject({id:z.string().uuid(),expectedRevision:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),profile:brandBrainSchema});
export async function PUT(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  let body:unknown;
  try { body=await req.json(); } catch { return NextResponse.json({error:"Invalid JSON."},{status:400}); }
  const parsed=saveBrandBrainSchema.safeParse(body);
  if (!parsed.success) {
    const issue=parsed.error.issues[0];
    return NextResponse.json({error:`${issue.path.join(" → ")}: ${issue.message}`},{status:400});
  }
  const {id,expectedRevision,profile}=parsed.data;
  const {data,error}=await auth.supabase.rpc("save_brand_brain",{p_id:id,p_expected:expectedRevision,p_fields:brandBrainStoredFields(profile)});
  if (error) {
    const status=error.code==="40001"?409:error.code==="42501"||error.code==="P0002"?404:503;
    return NextResponse.json({error:status===409?"This profile changed elsewhere. Your draft is kept; reload the saved profile before saving again.":status===404?"Profile or business not found.":"Save could not be confirmed. Your draft is kept. Reload the saved profile to check before trying again."},{status});
  }
  try {
    const record=brandBrainFromRow(data as Record<string,unknown>);
    if(record.id!==id||record.revision!==expectedRevision+1)throw new Error("Invalid save acknowledgement");
    return NextResponse.json({record});
  }
  catch { return NextResponse.json({error:"Save acknowledgement was invalid. Reload the saved profile to check; your draft is kept."},{status:503}); }
}
