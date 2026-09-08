import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioTemplateGallery } from "@/app/components/studio/studio-template-gallery";

export default async function StudioTemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/studio/templates");
  }

  return (
    <div className="min-h-screen" style={{ background: "#FFF8F0" }}>
      <header className="border-b border-black/10 bg-white/80 backdrop-blur px-4 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/studio" className="text-xs underline opacity-60">
              ← Studio
            </Link>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mt-2">Discover</p>
            <h1 className="font-display text-2xl font-bold mt-1">Template gallery</h1>
            <p className="text-sm opacity-70 mt-1">
              Browse by category or size — pick one, customize names, open the canvas.
            </p>
          </div>
          <Link
            href="/studio/new"
            className="rounded-full px-4 py-2 text-sm font-bold text-white"
            style={{ background: "#E05A2B" }}
          >
            AI campaign
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 pb-24">
        <StudioTemplateGallery />
      </main>
    </div>
  );
}
