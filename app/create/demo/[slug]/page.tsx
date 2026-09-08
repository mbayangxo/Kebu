import { notFound } from "next/navigation";
import { DemoTemplateView } from "@/app/components/create/demo-template-view";
import { FEATURED_TEMPLATES } from "@/lib/create/featured-templates";
import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";

type Params = { params: Promise<{ slug: string }> };

/**
 * Live demo from **code seed** (always matches Cursor edits).
 * Includes owner portfolio seeds (e.g. May Lecor) so Mae’s cutout/city/logo are visible
 * without waiting for a DB project upgrade — still not listed in the Aesthetic store.
 */
export default async function CreateDemoTemplatePage({ params }: Params) {
  const { slug } = await params;
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
