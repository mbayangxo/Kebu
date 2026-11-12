import { NextResponse } from "next/server";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { requireUser } from "@/lib/create/auth";
import { loadActiveWorkspaceScope } from "@/lib/account/server-workspace";
import { normalizeAssetTags } from "@/lib/studio/assets";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** List owner's Studio uploads library (S16). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  let query = supabase
    .from("studio_uploads")
    .select("id, kind, url, file_name, mime, byte_size, business_id, owner_id, tags, folder, favorite, width, height, duration_ms, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  query = workspace.activeBusinessId
    ? query.eq("business_id", workspace.activeBusinessId)
    : query.is("business_id", null).eq("owner_id", user.id);
  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        error: error.message?.includes("does not exist")
          ? "Uploads library missing. Apply migration 073."
          : "Could not load uploads.",
      },
      { status: error.message?.includes("does not exist") ? 503 : 500 },
    );
  }

  return NextResponse.json({ uploads: data ?? [] });
}

/** Delete an upload library row (does not remove storage object — keep file for existing designs). */
export async function DELETE(req: Request) {
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Upload id required." }, { status: 400 });
  }

  let deleteQuery = supabase.from("studio_uploads").delete().eq("id", id);
  deleteQuery = workspace.activeBusinessId
    ? deleteQuery.eq("business_id", workspace.activeBusinessId)
    : deleteQuery.is("business_id", null).eq("owner_id", user.id);
  const { error } = await deleteQuery;
  if (error) {
    return NextResponse.json({ error: "Could not remove from library." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

const patchSchema=z.object({id:z.string().uuid(),favorite:z.boolean().optional(),folder:z.string().trim().max(80).nullable().optional(),tags:z.array(z.string()).max(20).optional()});
export async function PATCH(req:Request){const blocked=assertSameOriginMutation(req);if(blocked)return blocked;const auth=await requireUser();if("error"in auth)return auth.error;const{user,supabase}=auth,workspace=await loadActiveWorkspaceScope(supabase,user.id);let raw:unknown;try{raw=await req.json()}catch{return NextResponse.json({error:"Invalid JSON."},{status:400})}const p=patchSchema.safeParse(raw);if(!p.success)return NextResponse.json({error:"Invalid asset update."},{status:400});const patch={...("favorite"in p.data?{favorite:p.data.favorite}:{}),...("folder"in p.data?{folder:p.data.folder}:{}),...("tags"in p.data?{tags:normalizeAssetTags(p.data.tags)}:{})};let q=supabase.from("studio_uploads").update(patch).eq("id",p.data.id);q=workspace.activeBusinessId?q.eq("business_id",workspace.activeBusinessId):q.is("business_id",null).eq("owner_id",user.id);const{data,error}=await q.select("id,tags,folder,favorite").maybeSingle();if(error||!data)return NextResponse.json({error:"Asset not found or cannot be changed."},{status:404});return NextResponse.json({asset:data})}
