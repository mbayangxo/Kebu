import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ deploymentId: string; versionId: string }> };

export async function POST(req: Request, { params }: Params) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { deploymentId, versionId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(deploymentId) || !/^[0-9a-f-]{36}$/i.test(versionId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const { data: deployment } = await supabase
    .from("cloud_deployments")
    .select("id, slug")
    .eq("id", deploymentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!deployment) return NextResponse.json({ error: "Deployment not found." }, { status: 404 });

  const { data: version } = await supabase
    .from("cloud_deployment_versions")
    .select("id")
    .eq("id", versionId)
    .eq("deployment_id", deploymentId)
    .maybeSingle();
  if (!version) return NextResponse.json({ error: "Version not found." }, { status: 404 });

  const { error } = await supabase
    .from("cloud_deployments")
    .update({ live_version_id: versionId })
    .eq("id", deploymentId);

  if (error) {
    return NextResponse.json({ error: "Could not promote version." }, { status: 500 });
  }

  logCreate("cloud.deployment_promoted", { userId: user.id, deploymentId, versionId });
  return NextResponse.json({ liveUrl: `https://${deployment.slug}.cloud.kebu.africa` });
}
