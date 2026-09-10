import { notFound, redirect } from "next/navigation";
import { DemoTemplateView } from "@/app/components/create/demo-template-view";
import { FEATURED_TEMPLATES } from "@/lib/create/featured-templates";
import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";

type Params = { params: Promise<{ slug: string; path?: string[] }> };

/**
 * Nested demo paths (/create/demo/{slug}/music) stay inside the demo SPA —
 * never hit Next 404. Optional path is ignored; DemoTemplateView switches pages.
 */
export default async function CreateDemoTemplateCatchAllPage({ params }: Params) {
  const { slug, path } = await params;
  const seed = TEMPLATE_SEEDS.find((t) => t.slug === slug);
  if (!seed) notFound();

  const pageHint = path?.[0];
  const hasPage = pageHint
    ? seed.definition.pages.some((p) => p.slug === pageHint)
    : true;

  if (pageHint && !hasPage) {
    redirect(`/create/demo/${encodeURIComponent(slug)}`);
  }

  const featured = FEATURED_TEMPLATES.find((t) => t.slug === slug);

  return (
    <DemoTemplateView
      definition={seed.definition}
      slug={slug}
      name={featured?.name ?? seed.name}
      tagline={featured?.tagline ?? seed.description}
      initialPageSlug={hasPage && pageHint ? pageHint : undefined}
    />
  );
}
