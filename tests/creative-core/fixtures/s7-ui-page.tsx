import { readFileSync } from "node:fs";
import { notFound } from "next/navigation";
import { readKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { PublicSiteView } from "@/app/components/create/public-site-view";
export default async function LocalPublished({ params }: { params: Promise<{ slug: string }> }) {
 if (process.env.KEBU_LOCAL_OPERATION_UI !== "1" || process.env.VERCEL_ENV === "production" || !process.env.KEBU_LOCAL_S7_SNAPSHOT_FILE) notFound();
 const {slug}=await params;
 const saved=JSON.parse(readFileSync(process.env.KEBU_LOCAL_S7_SNAPSHOT_FILE,"utf8"));
 const decoded=readKcdPublishedSnapshot(slug === "tampered" ? {...saved.snapshot,contentHash:"0".repeat(64)} : saved.snapshot,saved.contentHash);
 if (!decoded || !decoded.definition.pages.some(page=>page.slug===slug)) notFound();
 return <PublicSiteView definition={decoded.definition} nativeDocument={decoded.nativeDocument} subdomain="local-published" projectId={decoded.nativeDocument.id} pageSlug={slug} siteBase="/s7-local-probe" />;
}
