import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { assertCloudStorageQuota } from "@/lib/cloud/quota";
import { extractDeploymentZip } from "@/lib/cloud/zip-extract";
import { CLOUD_DEPLOYMENTS_BUCKET } from "@/lib/cloud/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ deploymentId: string }> };

export async function POST(req: Request, { params }: Params) {
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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form upload." }, { status: 400 });
  }
  const file = formData.get("bundle");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing zip bundle." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "Upload a .zip file." }, { status: 400 });
  }

  const quota = await assertCloudStorageQuota(supabase, user.id, 0);
  if (!quota.ok) {
    return NextResponse.json({ error: quota.error }, { status: 413 });
  }

  const zipBuffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractDeploymentZip(zipBuffer, quota.remainingBytes);
  if (!extracted.ok) {
    const isQuota = /quota/i.test(extracted.error);
    return NextResponse.json({ error: extracted.error }, { status: isQuota ? 413 : 400 });
  }

  const { data: lastVersion } = await supabase
    .from("cloud_deployment_versions")
    .select("version_number")
    .eq("deployment_id", deploymentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const versionNumber = (lastVersion?.version_number ?? 0) + 1;
  const versionId = crypto.randomUUID();
  const storagePrefix = `${deploymentId}/${versionId}`;

  const uploadedPaths: string[] = [];
  for (const asset of extracted.files) {
    const objectPath = `${storagePrefix}/${asset.relativePath}`;
    const { error: uploadErr } = await supabase.storage
      .from(CLOUD_DEPLOYMENTS_BUCKET)
      .upload(objectPath, asset.buffer, { contentType: asset.mimeType, upsert: false });
    if (uploadErr) {
      if (uploadedPaths.length) await supabase.storage.from(CLOUD_DEPLOYMENTS_BUCKET).remove(uploadedPaths);
      return NextResponse.json({ error: "Upload failed partway through.", detail: uploadErr.message }, { status: 500 });
    }
    uploadedPaths.push(objectPath);
  }

  const { data: row, error: insertErr } = await supabase
    .from("cloud_deployment_versions")
    .insert({
      id: versionId,
      deployment_id: deploymentId,
      version_number: versionNumber,
      storage_prefix: storagePrefix,
      size_bytes: extracted.totalBytes,
      file_count: extracted.files.length,
      asset_paths: uploadedPaths,
    })
    .select("id, version_number, size_bytes, file_count, created_at")
    .single();

  if (insertErr || !row) {
    await supabase.storage.from(CLOUD_DEPLOYMENTS_BUCKET).remove(uploadedPaths);
    return NextResponse.json({ error: "Could not save deployment version." }, { status: 500 });
  }

  logCreate("cloud.deployment_version_uploaded", {
    userId: user.id,
    deploymentId,
    versionId: row.id,
    fileCount: extracted.files.length,
    sizeBytes: extracted.totalBytes,
  });

  return NextResponse.json({ version: row });
}
