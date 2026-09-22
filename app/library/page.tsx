import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { createClient } from "@/lib/supabase/server";
import { KEBU } from "@/lib/kebu-brand";

function formatBytes(value: number | null) {
  if (!value || value < 1) return "—";
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return Math.round(value / 1024) + " KB";
  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

const FILTER_TABS = ["All", "Images", "Videos", "Documents", "Audio", "Designs", "Brand", "Code", "Other"];

const ACTION_TILES = [
  { label: "Upload", sub: "Add files", icon: "create" as const, dark: true },
  { label: "Create folder", sub: "Organise", icon: "spaces" as const, dark: false },
  { label: "Capture", sub: "Camera", icon: "studio" as const, dark: false },
  { label: "Import", sub: "Cloud", icon: "library" as const, dark: false },
  { label: "Create with AI", sub: "Yande", icon: "yande" as const, dark: false },
];


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

  const totalCount = uploads.length + designs.length + projects.length;
  const totalBytes = uploads.reduce((sum, u) => sum + (u.byte_size ?? 0), 0);

  return (
    <AppShell title="Library">
      <div style={{ background: "#F5F4F1", minHeight: "100vh" }}>
        {/* Body */}
        <div className="flex gap-0">
          <main className="flex-1 min-w-0 px-5 py-5 pb-8 sm:px-8 space-y-6">
            {/* Action tiles */}
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {ACTION_TILES.map((tile) => (
                <button
                  key={tile.label}
                  className="flex shrink-0 flex-col items-start rounded-2xl border p-4 w-36 hover:-translate-y-0.5 transition-transform"
                  style={{
                    background: tile.dark ? KEBU.black : "white",
                    borderColor: tile.dark ? "transparent" : KEBU.borders.default,
                    color: tile.dark ? "#fff" : KEBU.black,
                  }}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl mb-3"
                    style={{
                      background: tile.dark ? "rgba(255,255,255,0.1)" : "rgba(255,85,0,0.09)",
                      color: tile.dark ? "#fff" : KEBU.orange,
                    }}
                  >
                    <KebuIcon name={tile.icon} size={18} />
                  </span>
                  <p className="text-[12px] font-black leading-tight">{tile.label}</p>
                  <p className="mt-0.5 text-[10px]" style={{ color: tile.dark ? "rgba(255,255,255,0.5)" : KEBU.faint }}>
                    {tile.sub}
                  </p>
                </button>
              ))}
            </div>

            {/* Filter pills + controls */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {FILTER_TABS.map((tab, i) => (
                <button
                  key={tab}
                  className="shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition"
                  style={
                    i === 0
                      ? { background: KEBU.black, color: "#fff" }
                      : { background: "white", color: KEBU.muted, border: "1px solid " + KEBU.borders.default }
                  }
                >
                  {tab}
                </button>
              ))}
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button className="rounded-xl border bg-white px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: KEBU.borders.default }}>
                  ⊞ Grid
                </button>
                <button className="rounded-xl border bg-white px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: KEBU.borders.default }}>
                  Sort ↕
                </button>
              </div>
            </div>

            {/* Folders */}
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>Folders</h2>
              <div className="rounded-2xl border border-dashed bg-white p-8 text-center" style={{ borderColor: KEBU.borders.default }}>
                <KebuIcon name="spaces" size={24} className="mx-auto mb-3" style={{ color: KEBU.faint }} />
                <p className="text-sm font-black">No folders yet.</p>
                <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>Create a folder to organize your files.</p>
                <button className="mt-4 inline-flex rounded-full px-4 py-2 text-[10px] font-bold text-white" style={{ background: KEBU.black }}>
                  + New folder
                </button>
              </div>
            </section>

            {/* Recent files */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Recent files</h2>
                <Link href="/studio" className="text-[10px] font-bold" style={{ color: KEBU.orange }}>View all →</Link>
              </div>
              {uploads.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {uploads.slice(0, 12).map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex shrink-0 flex-col rounded-2xl border bg-white overflow-hidden w-40 hover:-translate-y-0.5 transition-transform"
                      style={{ borderColor: KEBU.borders.default }}
                    >
                      <div className="h-24 flex items-center justify-center" style={{ background: "rgba(255,85,0,0.06)" }}>
                        <KebuIcon name="library" size={28} style={{ color: KEBU.orange }} />
                      </div>
                      <div className="p-2.5">
                        <p className="truncate text-[11px] font-bold">{item.file_name || "Untitled"}</p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-wide" style={{ color: KEBU.faint }}>
                          {formatBytes(item.byte_size)}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-white p-8 text-center" style={{ borderColor: KEBU.borders.default }}>
                  <KebuIcon name="library" size={24} className="mx-auto mb-3" style={{ color: KEBU.faint }} />
                  <p className="text-sm font-black">No files uploaded yet.</p>
                  <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>Upload files through Studio — they appear here automatically.</p>
                </div>
              )}
            </section>

            {/* Collections — empty */}
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>Collections</h2>
              <div className="rounded-2xl border border-dashed bg-white p-8 text-center" style={{ borderColor: KEBU.borders.default }}>
                <KebuIcon name="studio" size={24} className="mx-auto mb-3" style={{ color: KEBU.faint }} />
                <p className="text-sm font-black">No collections yet.</p>
                <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>Group files into collections for easier access.</p>
              </div>
            </section>

            {/* Shared with me — empty */}
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>Shared with me</h2>
              <div className="rounded-2xl border border-dashed bg-white p-8 text-center" style={{ borderColor: KEBU.borders.default }}>
                <KebuIcon name="people" size={24} className="mx-auto mb-3" style={{ color: KEBU.faint }} />
                <p className="text-sm font-black">Nothing shared yet.</p>
                <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>Files shared with you by others will appear here.</p>
              </div>
            </section>
          </main>

          {/* Right sidebar */}
          <aside className="hidden xl:flex w-64 shrink-0 flex-col gap-4 px-4 py-6">
            {/* Storage */}
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>Storage</p>
              <p className="text-2xl font-black" style={{ fontFamily: "var(--font-fraunces)" }}>{totalCount}</p>
              <p className="text-[11px]" style={{ color: KEBU.muted }}>files · {formatBytes(totalBytes)} used</p>
              <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: KEBU.borders.subtle }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: Math.min((totalBytes / (5 * 1024 * 1024 * 1024)) * 100, 100) + "%", background: KEBU.orange }}
                />
              </div>
              <p className="mt-1.5 text-[10px]" style={{ color: KEBU.faint }}>of 5 GB · Upgrade for more</p>
            </div>

            {/* AI Library Assistant */}
            <div className="rounded-2xl border bg-white p-4 flex flex-col gap-3" style={{ borderColor: KEBU.borders.default }}>
              <div className="flex items-center gap-2">
                <KebuIcon name="yande" size={16} style={{ color: KEBU.orange }} />
                <p className="text-[11px] font-black">AI Library Assistant</p>
              </div>
              <div className="space-y-1.5">
                {["Find my brand assets", "Show last week's uploads", "Find all PDFs", "Recent designs"].map((ex) => (
                  <button
                    key={ex}
                    className="w-full text-left rounded-xl border px-3 py-2 text-[10px] font-bold hover:bg-black/[.02] transition"
                    style={{ borderColor: KEBU.borders.subtle, color: KEBU.muted }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <div className="mt-1">
                <input
                  readOnly
                  placeholder="Ask Yande anything about your files…"
                  className="w-full rounded-xl border px-3 py-2 text-[11px] outline-none"
                  style={{ borderColor: KEBU.borders.default, background: "#F5F4F1" }}
                />
              </div>
            </div>

            {/* Bottom banner */}
            <div
              className="rounded-2xl p-4 text-white"
              style={{ background: "linear-gradient(135deg,#1A1A1A,#2D2520)" }}
            >
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/50 mb-1">Kebu Library</p>
              <p className="text-sm font-black leading-snug" style={{ fontFamily: "var(--font-fraunces)" }}>
                Your creativity,<br />organized.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
