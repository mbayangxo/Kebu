import { AppShell } from "@/app/components/app-shell";
import { AestheticDetailClient } from "@/app/components/create/aesthetic-detail-client";
import { getAestheticGalleryItem } from "@/lib/create/aesthetics-gallery";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const item = getAestheticGalleryItem(slug);
  return {
    title: item ? `${item.name} — Aesthetics — Kebu Builder` : "Aesthetic — Kebu Builder",
    description: item?.tagline ?? "Browse Kebu site aesthetics.",
  };
}

export default async function AestheticDetailPage({ params }: Props) {
  const { slug } = await params;
  const item = getAestheticGalleryItem(slug);
  if (!item) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell title={item.name}>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-muted mb-4">Sign in to try this aesthetic and apply it to your sites.</p>
          <a
            href={`/login?next=/create/aesthetics/${encodeURIComponent(slug)}`}
            className="font-bold underline text-orange-600"
          >
            Sign in
          </a>
        </div>
      </AppShell>
    );
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .eq("owner_id", user.id)
    .eq("project_type", "website")
    .order("updated_at", { ascending: false });

  const sites = (projects ?? []).map((p) => ({
    id: p.id as string,
    title: (p.title as string) || "Untitled site",
  }));

  return (
    <AppShell title={item.name}>
      <AestheticDetailClient item={item} sites={sites} />
    </AppShell>
  );
}
