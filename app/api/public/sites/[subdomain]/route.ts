import { NextResponse } from "next/server";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { loadPublicDeployment, publicDeploymentLoadError } from "@/lib/create/public-site-loader";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

/** Public published site — live deployment snapshot only (no draft leak). */
export async function GET(req: Request, { params }: Params) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subdomain)) {
    return NextResponse.json({ error: "Invalid subdomain." }, { status: 400 });
  }

  const deployment = await loadPublicDeployment(subdomain);
  if (deployment) {
    return NextResponse.json({
      subdomain: deployment.subdomain,
      publicPath: deployment.publicPath,
      publishedAt: deployment.publishedAt,
      definition: deployment.definition,
    });
  }

  const loadError = await publicDeploymentLoadError(subdomain);
  if (loadError) {
    return NextResponse.json(
      {
        error: loadError.userMessage,
        detail: loadError.detail,
        code: loadError.code,
      },
      { status: loadError.status },
    );
  }

  return NextResponse.json({ error: "Site not found." }, { status: 404 });
}
