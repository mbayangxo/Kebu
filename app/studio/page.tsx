import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioGenerationHistory } from "@/app/components/studio/studio-generation-history";
import { StudioDesignLibrary } from "@/app/components/studio/studio-design-library";
import { StudioEcosystemStrip } from "@/app/components/studio/studio-ecosystem-strip";
import { studioRoleLabel, type StudioDesignRole } from "@/lib/studio/design-access";

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
    .select("id, title, design_type, updated_at, folder_id")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(48);

  const { data: collabs } = await supabase
    .from("studio_design_collaborators")
    .select("design_id, role")
    .eq("user_id", user.id)
    .eq("status", "active");

  const sharedIds = (collabs ?? []).map((c) => c.design_id as string);
  const roleByDesign = new Map(
    (collabs ?? []).map((c) => [
      c.design_id as string,
      (c.role === "editor" ? "editor" : "viewer") as StudioDesignRole,
    ]),
  );

  let shared: {
    id: string;
    title: string;
    design_type: string;
    updated_at: string;
    accessRole: "editor" | "viewer";
  }[] = [];
  if (sharedIds.length) {
    const { data } = await supabase
      .from("create_designs")
      .select("id, title, design_type, updated_at")
      .in("id", sharedIds)
      .order("updated_at", { ascending: false })
      .limit(48);
    shared = (data ?? []).map((d) => ({
      ...d,
      accessRole: (roleByDesign.get(d.id) === "editor" ? "editor" : "viewer") as "editor" | "viewer",
    }));
  }

  return (
    <div className="min-h-screen" style={{ background: "#FFF8F0" }}>
      <header className="border-b border-black/10 bg-white/80 backdrop-blur px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Kebu Studio</p>
            <h1 className="font-display text-2xl font-bold text-ink">Design for your business</h1>
            <p className="text-sm text-muted mt-1">
              Create blank, from templates, or AI — then flow into Builder, Shop, Reach.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/create" className="text-sm underline text-muted self-center">
              Kebu Builder
            </Link>
            <Link
              href="/studio/brand"
              className="inline-flex rounded-full px-4 py-2 text-sm font-bold border border-black/10 bg-white"
            >
              Brand DNA
            </Link>
            <Link
              href="/studio/campaigns"
              className="inline-flex rounded-full px-4 py-2 text-sm font-bold border border-black/10 bg-white"
            >
              Campaigns
            </Link>
            <Link
              href="/studio/templates"
              className="inline-flex rounded-full px-4 py-2 text-sm font-bold border border-black/10 bg-white"
            >
              Templates
            </Link>
            <Link
              href="/studio/new"
              className="inline-flex rounded-full px-4 py-2 text-sm font-bold text-white"
              style={{ background: "#E05A2B" }}
            >
              Create
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <StudioEcosystemStrip />

        <section className="rounded-3xl border border-black/10 bg-white p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/studio/new" className="rounded-2xl border border-black/10 p-4 hover:border-orange-400">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Blank</p>
            <p className="font-semibold mt-1">Pick a size</p>
            <p className="text-xs opacity-60 mt-1">IG, story, WhatsApp, flyer, poster…</p>
          </Link>
          <Link
            href="/studio/templates"
            className="rounded-2xl border border-black/10 p-4 hover:border-orange-400"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Templates</p>
            <p className="font-semibold mt-1">Start from a look</p>
            <p className="text-xs opacity-60 mt-1">Filter and open on the canvas</p>
          </Link>
          <Link
            href="/studio/new?tab=ai"
            className="rounded-2xl border border-black/10 p-4 hover:border-orange-400"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">AI</p>
            <p className="font-semibold mt-1">Do it for me · Teach me</p>
            <p className="text-xs opacity-60 mt-1">Generate — or learn why on the work</p>
          </Link>
          <Link
            href="/studio/video/new"
            className="rounded-2xl border border-black/10 p-4 hover:border-orange-400"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Video</p>
            <p className="font-semibold mt-1">Multi-track editor</p>
            <p className="text-xs opacity-60 mt-1">Upload · trim · timeline · save</p>
          </Link>
          <Link
            href="/studio/brand"
            className="rounded-2xl border border-black/10 p-4 hover:border-orange-400"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Brand DNA</p>
            <p className="font-semibold mt-1">Permanent identity</p>
            <p className="text-xs opacity-60 mt-1">Colors · voice · photo · languages · rules</p>
          </Link>
          <Link
            href="/studio/campaigns"
            className="rounded-2xl border border-black/10 p-4 hover:border-orange-400"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Creative Director</p>
            <p className="font-semibold mt-1">Campaign project</p>
            <p className="text-xs opacity-60 mt-1">Brief → mood → connected designs</p>
          </Link>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider opacity-60">AI campaign history</h2>
          <StudioGenerationHistory />
        </section>

        <StudioDesignLibrary
          initialOwned={designs ?? []}
          initialShared={shared.map((d) => ({
            ...d,
            accessRole: d.accessRole,
          }))}
        />

        {shared.length === 0 ? (
          <p className="text-[10px] opacity-40 text-center">
            Tip: invite teammates from a design’s Share panel · {studioRoleLabel("viewer")} links appear
            under Shared with me.
          </p>
        ) : null}
      </main>
    </div>
  );
}
