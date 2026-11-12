import { createServiceClient } from "@/lib/opportunity/admin";
import { CLOUD_STATIC_CSP, CLOUD_DEPLOYMENTS_BUCKET, DEPLOYMENT_SLUG_PATTERN, mimeFromExtension } from "@/lib/cloud/constants";
import { sanitizeZipEntryPath } from "@/lib/cloud/zip-extract";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; path: string[] }> };

/**
 * Serves a live Kebu Cloud static deployment. Reachable ONLY through the
 * middleware rewrite from the distinct `<slug>.cloud.kebu.africa` origin
 * (which sets x-kebu-cloud-site) -- a direct request to this same path on
 * the main app's own origin is refused, since serving arbitrary uploaded
 * HTML/JS there would hand it same-origin access to the main app's cookies.
 *
 * Uses the service-role client deliberately: cloud_deployments/_versions
 * RLS stays strict owner-only, and "what can an anonymous visitor see" is
 * decided entirely in this one code path (resolve slug -> live version,
 * nothing else) rather than by loosening table RLS for anon.
 */
export async function GET(req: Request, { params }: Params) {
  if (req.headers.get("x-kebu-cloud-site") !== "1") {
    return new Response("Not found", { status: 404 });
  }

  const { slug, path } = await params;
  if (!DEPLOYMENT_SLUG_PATTERN.test(slug) || (req.headers.get("host") ?? "").toLowerCase().split(":")[0] !== `${slug}.cloud.kebu.africa`) {
    return new Response("Not found", { status: 404 });
  }

  const requestedPath = (path ?? []).join("/") || "index.html";
  const safePath = sanitizeZipEntryPath(requestedPath);
  if (!safePath) {
    return new Response("Not found", { status: 404 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return new Response("Service unavailable", { status: 503 });
  }

  const { data: deployment } = await admin
    .from("cloud_deployments")
    .select("id, live_version_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!deployment?.live_version_id) {
    return new Response("Site not live.", { status: 404 });
  }

  const { data: version } = await admin
    .from("cloud_deployment_versions")
    .select("id, deployment_id")
    .eq("id", deployment.live_version_id)
    .eq("deployment_id", deployment.id)
    .maybeSingle();
  if (!version) {
    return new Response("Site not live.", { status: 404 });
  }

  const asset = await fetchAsset(admin, `${deployment.id}/${version.id}/${safePath}`);
  if (asset) return assetResponse(asset, safePath);

  // SPA client-side-routing fallback: any unmatched path serves index.html
  // (every version is guaranteed to have one -- enforced at extraction time).
  if (safePath !== "index.html") {
    const fallback = await fetchAsset(admin, `${deployment.id}/${version.id}/index.html`);
    if (fallback) return assetResponse(fallback, "index.html");
  }

  return new Response("Not found", { status: 404 });
}

async function fetchAsset(
  admin: NonNullable<ReturnType<typeof createServiceClient>>,
  objectPath: string,
): Promise<ArrayBuffer | null> {
  const { data, error } = await admin.storage.from(CLOUD_DEPLOYMENTS_BUCKET).download(objectPath);
  if (error || !data) return null;
  return data.arrayBuffer();
}

function assetResponse(body: ArrayBuffer, path: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": mimeFromExtension(path),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
      "Content-Security-Policy": CLOUD_STATIC_CSP,
      "Access-Control-Allow-Origin": "*",
    },
  });
}
