import { notFound } from "next/navigation";
import { DemoTemplateView } from "@/app/components/create/demo-template-view";
import { FEATURED_TEMPLATES } from "@/lib/create/featured-templates";
import { isPublicTemplateSlug, TEMPLATE_SEEDS } from "@/lib/create/templates-seed";

type Params = { params: Promise<{ slug: string }> };

/** Preview any public template without Supabase — personal portfolio seeds are not demos. */
export default async function CreateDemoTemplatePage({ params }: Params) {
  const { slug } = await params;
  if (!isPublicTemplateSlug(slug)) notFound();

  const seed = TEMPLATE_SEEDS.find((t) => t.slug === slug);
  if (!seed) notFound();

  const featured = FEATURED_TEMPLATES.find((t) => t.slug === slug);

  return (
    <DemoTemplateView
      definition={seed.definition}
      slug={slug}
      name={featured?.name ?? seed.name}
      tagline={featured?.tagline ?? seed.description}
    />
  );
}
