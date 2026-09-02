import { TemplatesVisualPage } from "@/app/components/create/templates-visual-page";
import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { getFeaturedGalleryTemplates, getGalleryTemplates } from "@/lib/create/template-gallery";

export const metadata = {
  title: "Templates — Kebu",
  description: "Website template examples with live previews — musician, agency, salon, motion showcase, and more.",
};

/** Public marketing templates gallery — same live previews as the builder. */
export default function MarketingTemplatesPage() {
  const templates = getGalleryTemplates();
  const featured = getFeaturedGalleryTemplates();

  return (
    <KebuMarketingPageShell activeHref="/templates">
      <TemplatesVisualPage templates={templates} featured={featured} />
    </KebuMarketingPageShell>
  );
}
