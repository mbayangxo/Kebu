import { notFound } from "next/navigation";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { isPublicTemplateSlug, TEMPLATE_SEEDS } from "@/lib/create/templates-seed";

type Params = { params: Promise<{ slug: string }> };

/** Minimal live preview for template gallery thumbnails (iframe embed). */
export default async function TemplateEmbedPreviewPage({ params }: Params) {
  const { slug } = await params;
  if (!isPublicTemplateSlug(slug)) notFound();

  const seed = TEMPLATE_SEEDS.find((t) => t.slug === slug);
  if (!seed) notFound();

  const home = seed.definition.pages.find((p) => p.slug === "home") ?? seed.definition.pages[0];

  return (
    <div className="min-h-screen bg-white" data-template-preview={slug}>
      <SiteRenderer
        definition={seed.definition}
        mode="preview"
        pageSlug={home?.slug ?? "home"}
        siteBase={`/create/demo/${slug}`}
      />
    </div>
  );
}
