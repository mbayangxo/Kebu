import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function StudioHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/studio");
  }

  const { data: designs } = await supabase
    .from("create_designs")
    .select("id, title, design_type, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(24);

  return (
    <div className="min-h-screen" style={{ background: "#FFF8F0" }}>
      <header className="border-b border-black/10 bg-white/80 backdrop-blur px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Kebu Create</p>
            <h1 className="font-display text-2xl font-bold text-ink">Design for your business</h1>
            <p className="text-sm text-muted mt-1">
              Posters, flyers, and social graphics — separate from Kebu Builder websites.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/create" className="text-sm underline text-muted">
              Kebu Builder
            </Link>
            <Link
              href="/studio/new"
              className="inline-flex rounded-full px-4 py-2 text-sm font-bold"
              style={{ background: "#E05A2B", color: "#fff" }}
            >
              New poster
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {(designs ?? []).length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/15 p-10 text-center bg-white">
            <p className="text-lg font-semibold mb-2">No designs yet</p>
            <p className="text-sm text-muted mb-6">
              Start with a poster for your shop opening, sale, or WhatsApp catalog.
            </p>
            <Link
              href="/studio/new"
              className="inline-flex rounded-full px-5 py-2.5 text-sm font-bold"
              style={{ background: "#0F0D33", color: "#fff" }}
            >
              Create your first poster
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(designs ?? []).map((d) => (
              <Link
                key={d.id}
                href={`/studio/${d.id}`}
                className="rounded-2xl border border-black/10 bg-white p-4 hover:shadow-md transition-shadow"
              >
                <p className="font-semibold truncate">{d.title}</p>
                <p className="text-xs text-muted mt-1 capitalize">{d.design_type.replace("_", " ")}</p>
                <p className="text-[10px] text-muted mt-3">
                  Updated {new Date(d.updated_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
