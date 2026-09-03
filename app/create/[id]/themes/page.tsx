import { AppShell } from "@/app/components/app-shell";
import { SiteThemesPanel } from "@/app/components/create/site-themes-panel";
import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectThemesPage({ params }: Props) {
  const { id } = await params;
  return (
    <AppShell title="Site templates">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="mb-6 text-xs">
          <Link href={`/create/${id}`} className="font-semibold underline" style={{ color: KEBU.orange }}>
            ← Editor
          </Link>
          <span className="mx-2 text-black/30">·</span>
          <Link href={`/create/sites/${id}`} className="font-semibold underline" style={{ color: KEBU.orange }}>
            Site settings
          </Link>
        </p>
        <SiteThemesPanel projectId={id} />
      </div>
    </AppShell>
  );
}
