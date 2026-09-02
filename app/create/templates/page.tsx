import { AppShell } from "@/app/components/app-shell";
import { TemplatesVisualPage } from "@/app/components/create/templates-visual-page";
import { getFeaturedGalleryTemplates, getGalleryTemplates } from "@/lib/create/template-gallery";

export const metadata = {
  title: "Templates — Kebu Builder",
  description: "Visual website templates — live previews with real layouts and placeholder photos.",
};

/** Dedicated templates gallery — visual previews, filters, no SaaS copy. */
export default function CreateTemplatesPage() {
  const templates = getGalleryTemplates();
  const featured = getFeaturedGalleryTemplates();

  return (
    <AppShell title="Templates">
      <TemplatesVisualPage templates={templates} featured={featured} />
    </AppShell>
  );
}
