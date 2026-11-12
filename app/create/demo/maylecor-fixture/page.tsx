import { notFound } from "next/navigation";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";

type Props = { searchParams: Promise<{ page?: string }> };

/**
 * Dev-only fixture: renders the real May Lècor SiteRenderer output with zero Supabase
 * auth/DB (the template definition is pure source-controlled data), so the actual
 * component tree can be driven by Playwright locally. May's template is
 * `visibility: "owner_portfolio"`, so the normal `/create/templates/preview/[slug]`
 * route 404s it on purpose (see templates-seed.ts / templates-api-merge) — this route
 * must stay non-production-only so it never becomes a second, unguarded way to view it.
 */
export default async function MaylecorFixturePage({ searchParams }: Props) {
  if (process.env.NODE_ENV === "production") notFound();

  const seed = TEMPLATE_SEEDS.find((t) => t.slug === "musician-maylecor-ksendr");
  if (!seed) notFound();

  const { page } = await searchParams;
  const slug = page && seed.definition.pages.some((p) => p.slug === page) ? page : "home";

  return (
    <div data-fixture="maylecor" data-fixture-page={slug}>
      <SiteRenderer
        definition={seed.definition}
        mode="preview"
        pageSlug={slug}
        siteBase="/create/demo/maylecor-fixture"
      />
    </div>
  );
}
