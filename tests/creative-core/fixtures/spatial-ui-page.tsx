import { readFileSync } from "node:fs";
import { notFound } from "next/navigation";
import { readKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { PublicSiteView } from "@/app/components/create/public-site-view";
export default function SpatialPublished() {
 if (process.env.KEBU_LOCAL_OPERATION_UI !== "1" || process.env.VERCEL_ENV === "production" || !process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE) notFound();
 const saved = JSON.parse(readFileSync(process.env.KEBU_LOCAL_SPATIAL_SNAPSHOT_FILE, "utf8"));
 const decoded = readKcdPublishedSnapshot(saved.snapshot, saved.contentHash);
 if (!decoded) notFound();
 return <PublicSiteView definition={decoded.definition} nativeDocument={decoded.nativeDocument} subdomain="local-spatial" projectId={decoded.nativeDocument.id} pageSlug="home" siteBase="/spatial-local-probe" />;
}
