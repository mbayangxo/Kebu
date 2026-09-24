import { notFound } from "next/navigation";
import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";
import { SiteRenderer } from "@/app/components/create/site-renderer";

// Development-only fixture route for May Lècor owner_portfolio regression testing.
// Returns 404 in production to avoid exposing internal owner portfolio content.
// Used by tests/create/e2e-aesthetic-catalog.spec.ts.
export default async function MaylecorFixturePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  const { page: pageSlug } = await searchParams;

  const seed = TEMPLATE_SEEDS.find((t) => t.slug === "musician-maylecor-ksendr");
  if (!seed) notFound();

  const resolvedPage =
    seed.definition.pages.find((p) => p.slug === (pageSlug ?? "home")) ??
    seed.definition.pages[0];

  return (
    <div
      data-fixture="maylecor"
      data-fixture-page={resolvedPage?.slug}
      style={{ minHeight: "100vh", background: "#0A0A0A" }}
    >
      <SiteRenderer
        definition={seed.definition}
        mode="preview"
        pageSlug={resolvedPage?.slug ?? "home"}
        siteBase="/create/demo/maylecor-fixture"
      />
    </div>
  );
}
