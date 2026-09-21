import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { createClient } from "@/lib/supabase/server";
import { KEBU } from "@/lib/kebu-brand";
import { LibraryDrivePanel } from "@/app/components/library/library-drive-panel";

function formatBytes(value: number | null) {
  if (!value || value < 1) return "—";
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return Math.round(value / 1024) + " KB";
  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/library");

  const [uploadsResult, designsResult, projectsResult] = await Promise.all([
    supabase.from("studio_uploads").select("id, kind, url, file_name, mime, byte_size, created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(60),
    supabase.from("create_designs").select("id, title, design_type, updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(24),
    supabase.from("projects").select("id, title, project_type, updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(24),
  ]);

  const uploads = uploadsResult.data ?? [];
  const designs = designsResult.data ?? [];
  const projects = projectsResult.data ?? [];

  return (
    <AppShell title="Library">
      <div className="mx-auto max-w-[1380px] px-4 py-6 sm:px-7">
        <header className="grid gap-4 border-b pb-6 lg:grid-cols-[1fr_auto] lg:items-end" style={{ borderColor: KEBU.borders.default }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Library</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>Your work, without the scavenger hunt.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>A connected view of files, designs and sites already stored in Kebu. Nothing here is duplicated just to make the Library look full.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/studio/new" className="rounded-full border bg-white px-4 py-2.5 text-xs font-bold" style={{ borderColor: KEBU.borders.default }}>New design</Link>
            <Link href="/studio" className="rounded-full bg-black px-4 py-2.5 text-xs font-bold text-white">Open Studio</Link>
          </div>
        </header>

        <div className="py-6">
          <LibraryDrivePanel />
        </div>

        <section className="grid gap-3 pb-6 sm:grid-cols-3">
          {[["Files", uploads.length, "library"], ["Designs", designs.length, "studio"], ["Sites", projects.length, "builder"]].map(([label, count, icon]) => (
            <div key={String(label)} className="rounded-[20px] border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
              <KebuIcon name={icon as "library" | "studio" | "builder"} size={18} style={{ color: KEBU.orange }} />
              <p className="mt-4 text-3xl font-black" style={{ fontFamily: "var(--font-fraunces)" }}>{String(count)}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[.12em]" style={{ color: KEBU.muted }}>{String(label)}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-7">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div><p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Files</p><h2 className="mt-0.5 text-lg font-black">Recent uploads</h2></div>
                <Link href="/studio" className="text-[10px] font-black uppercase tracking-wide" style={{ color: KEBU.orange }}>Manage in Studio →</Link>
              </div>
              {uploads.length ? (
                <div className="overflow-hidden rounded-[20px] border bg-white" style={{ borderColor: KEBU.borders.default }}>
                  {uploads.map((item, index) => (
                    <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-black/[.02]" style={{ borderTop: index ? "1px solid " + KEBU.borders.subtle : undefined }}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: KEBU.cream, color: KEBU.orange }}><KebuIcon name="library" size={17} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold">{item.file_name || "Untitled file"}</span>
                        <span className="mt-0.5 block text-[9px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{item.kind || item.mime || "file"} · {formatBytes(item.byte_size)}</span>
                      </span>
                      <span className="text-black/25">↗</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed bg-white p-8 text-center" style={{ borderColor: KEBU.borders.default }}>
                  <p className="text-sm font-black">No uploaded files yet.</p>
                  <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>Files you add through Studio will appear here automatically.</p>
                </div>
              )}
            </section>

            <section>
              <div className="mb-3"><p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Creative</p><h2 className="mt-0.5 text-lg font-black">Designs</h2></div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {designs.map((design) => (
                  <Link key={design.id} href={"/studio/" + design.id} className="rounded-[18px] border bg-white p-4 transition hover:-translate-y-0.5" style={{ borderColor: KEBU.borders.default }}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: "rgba(255,106,0,.09)", color: KEBU.orange }}><KebuIcon name="studio" size={16} /></span>
                    <p className="mt-5 truncate text-[12px] font-black">{design.title}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{design.design_type.replaceAll("_", " ")}</p>
                  </Link>
                ))}
              </div>
            </section>
          </main>

          <aside>
            <section className="rounded-[22px] border bg-black p-5 text-white" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[9px] font-black uppercase tracking-[.14em] text-white/40">Sites & stores</p>
              <div className="mt-3 space-y-2">
                {projects.length ? projects.slice(0, 8).map((project) => (
                  <Link key={project.id} href={"/create/" + project.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.05] px-3 py-3">
                    <KebuIcon name="builder" size={16} style={{ color: KEBU.orange }} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold">{project.title}</span><span className="text-[9px] text-white/40">{project.project_type}</span></span>
                    <span className="text-white/25">→</span>
                  </Link>
                )) : <p className="text-[11px] text-white/50">No sites yet.</p>}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
