import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { CLOUD_DEPLOYMENTS_BUCKET } from "@/lib/cloud/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ deploymentId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { deploymentId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(deploymentId)) {
    return NextResponse.json({ error: "Invalid deployment id." }, { status: 400 });
  }

  const { data: deployment } = await supabase
    .from("cloud_deployments")
    .select("id, name, slug, live_version_id, created_at, updated_at")
    .eq("id", deploymentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!deployment) return NextResponse.json({ error: "Deployment not found." }, { status: 404 });

  const { data: versions, error } = await supabase
    .from("cloud_deployment_versions")
    .select("id, version_number, size_bytes, file_count, created_at")
    .eq("deployment_id", deploymentId)
    .order("version_number", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load versions." }, { status: 500 });
  }

  return NextResponse.json({
    deployment: { ...deployment, liveUrl: deployment.live_version_id ? `https://${deployment.slug}.cloud.kebu.africa` : null },
    versions: versions ?? [],
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const blocked = assertSameOriginMutation(req);
  if (blocked) return blocked;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { deploymentId } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(deploymentId)) {
    return NextResponse.json({ error: "Invalid deployment id." }, { status: 400 });
  }

  const { data: deployment } = await supabase
    .from("cloud_deployments")
    .select("id")
    .eq("id", deploymentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!deployment) return NextResponse.json({ error: "Deployment not found." }, { status: 404 });

  const { data: versions } = await supabase
    .from("cloud_deployment_versions")
    .select("asset_paths")
    .eq("deployment_id", deploymentId);

  const allPaths = (versions ?? []).flatMap((v) => v.asset_paths ?? []);
  if (allPaths.length) {
    await supabase.storage.from(CLOUD_DEPLOYMENTS_BUCKET).remove(allPaths);
  }

  const { error } = await supabase.from("cloud_deployments").delete().eq("id", deploymentId);
  if (error) {
    return NextResponse.json({ error: "Could not delete deployment." }, { status: 500 });
  }

  logCreate("cloud.deployment_deleted", { userId: user.id, deploymentId });
  return NextResponse.json({ ok: true });
}
