import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioDesignLibrary } from "@/app/components/studio/studio-design-library";
import { StudioGenerationHistory } from "@/app/components/studio/studio-generation-history";
import type { StudioDesignRole } from "@/lib/studio/design-access";
import { KEBU } from "@/lib/kebu-brand";
import { AppShell } from "@/app/components/app-shell";
import { loadActiveWorkspaceScope } from "@/lib/account/server-workspace";

type FormatCard = {
  type: string;
  label: string;
  sublabel: string;
  href: string;
  aspect: number;
  accent: string;
};

const FORMATS: FormatCard[] = [
  { type: "instagram_post", label: "Instagram post", sublabel: "1080 × 1080", href: "/studio/new?type=instagram_post", aspect: 1, accent: "#E1306C" },
  { type: "instagram_story", label: "Story / Reel", sublabel: "1080 × 1920", href: "/studio/new?type=instagram_story", aspect: 9 / 16, accent: "#FF5500" },
  { type: "poster", label: "Poster", sublabel: "900 × 1200", href: "/studio/new?type=poster", aspect: 900 / 1200, accent: "#9333EA" },
  { type: "flyer", label: "Flyer", sublabel: "816 × 1056", href: "/studio/new?type=flyer", aspect: 816 / 1056, accent: "#0EA5E9" },
  { type: "business_card", label: "Business card", sublabel: "1050 × 600", href: "/studio/new?type=business_card", aspect: 1050 / 600, accent: "#10B981" },
  { type: "banner", label: "Banner", sublabel: "1500 × 500", href: "/studio/new?type=banner", aspect: 1500 / 500, accent: "#F59E0B" },
  { type: "whatsapp_status", label: "WhatsApp status", sublabel: "1080 × 1920", href: "/studio/new?type=whatsapp_status", aspect: 9 / 16, accent: "#25D366" },
  { type: "social_square", label: "Social square", sublabel: "1080 × 1080", href: "/studio/new?type=social_square", aspect: 1, accent: "#6366F1" },
];

const FORMAT_MAP = new Map(FORMATS.map((f) => [f.type, f]));

function DesignThumb({ format, index }: { format?: FormatCard; index?: number }) {
  const accent = format?.accent ?? KEBU.orange;
  return (
    <div
      className="absolute inset-0 rounded-[10px]"
      style={{ background: `linear-gradient(145deg, ${accent}cc, #0A0A0A)` }}
    >
      <div className="absolute bottom-6 left-6 right-6">
        <span className="block h-2 w-2/3 rounded-full bg-white/75" />
        <span className="mt-1.5 block h-1.5 w-1/3 rounded-full bg-white/35" />
      </div>
      {index !== undefined && (
        <span className="absolute right-3 top-3 text-[9px] font-black text-white/20">
          {String(index + 1).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

function VideoThumb() {
  return (
    <div
      className="absolute inset-0 rounded-[10px]"
      style={{ background: "radial-gradient(circle at 65% 25%, rgba(255,85,0,.9), transparent 40%), linear-gradient(160deg, #111, #000)" }}
    >
      <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black text-sm">
        ▶
      </span>
    </div>
  );
}

export default async function StudioHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/studio");

  const workspace = await loadActiveWorkspaceScope(supabase, user.id);

  let ownedDesignQuery = supabase
    .from("create_designs")
    .select("id, title, design_type, updated_at, folder_id, business_id")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(48);
  ownedDesignQuery = workspace.activeBusinessId
    ? ownedDesignQuery.eq("business_id", workspace.activeBusinessId)
    : ownedDesignQuery.is("business_id", null);

  let videoQuery = supabase
    .from("studio_video_projects")
    .select("id, title, width, height, edit_mode, business_id, source_design_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(48);
  videoQuery = workspace.activeBusinessId
    ? videoQuery.eq("business_id", workspace.activeBusinessId)
    : videoQuery.is("business_id", null);

  const [designsResult, collabsResult, videosResult] = await Promise.all([
    ownedDesignQuery,
    supabase.from("studio_design_collaborators").select("design_id, role").eq("user_id", user.id).eq("status", "active"),
    videoQuery,
  ]);

  const designs = designsResult.data ?? [];
  const videos = videosResult.data ?? [];
  const collabs = collabsResult.data ?? [];
  const sharedIds = collabs.map((c) => c.design_id as string);
  const roleByDesign = new Map(collabs.map((c) => [c.design_id as string, (c.role === "editor" ? "editor" : "viewer") as StudioDesignRole]));

  let shared: {
    id: string;
    title: string;
    design_type: string;
    updated_at: string;
    accessRole: "editor" | "viewer";
  }[] = [];

  if (sharedIds.length) {
    let sharedQuery = supabase
      .from("create_designs")
      .select("id, title, design_type, updated_at, business_id")
      .in("id", sharedIds)
      .order("updated_at", { ascending: false })
      .limit(48);
    sharedQuery = workspace.activeBusinessId
      ? sharedQuery.eq("business_id", workspace.activeBusinessId)
      : sharedQuery.is("business_id", null);
    const { data } = await sharedQuery;
    shared = (data ?? []).map((design) => ({
      ...design,
      accessRole: roleByDesign.get(design.id) === "editor" ? "editor" : "viewer",
    }));
  }

  const recentDesigns = designs.slice(0, 6);
  const recentVideos = videos.slice(0, 2);
  const hasRecent = recentDesigns.length > 0 || recentVideos.length > 0;
  const totalItems = designs.length + videos.length;

  return (
    <AppShell title="Studio" immersive>
      <main className="min-h-screen" style={{ background: KEBU.bright, color: KEBU.black }}>

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section style={{ borderBottom: `1px solid ${KEBU.border}` }}>
          <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:px-12">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p
                  className="text-[9px] font-black uppercase tracking-[.18em]"
                  style={{ color: KEBU.orange }}
                >
                  Kebu Studio · {workspace.mode === "business" ? "Business" : "Personal"}
                </p>
                <h1
                  className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl"
                  style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05 }}
                >
                  Create. Edit. Express.
                </h1>
                <p className="mt-2 max-w-sm text-[11px] leading-relaxed" style={{ color: KEBU.muted }}>
                  Design, video, brand and campaign work — one creative world.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Link
                  href="/studio/new"
                  className="flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-black text-white shadow-sm transition hover:opacity-90"
                  style={{ background: KEBU.orange }}
                >
                  <span>+</span> New Project
                </Link>
                <Link
                  href="/studio/templates"
                  className="rounded-full border px-4 py-2.5 text-[10px] font-semibold transition hover:bg-black/5"
                  style={{ borderColor: KEBU.border }}
                >
                  Templates
                </Link>
                <Link
                  href="/studio/brand"
                  className="rounded-full border px-4 py-2.5 text-[10px] font-semibold transition hover:bg-black/5"
                  style={{ borderColor: KEBU.border }}
                >
                  Brand DNA
                </Link>
              </div>
            </div>

            {/* stat strip */}
            {totalItems > 0 && (
              <div className="mt-5 flex gap-5" style={{ borderTop: `1px solid ${KEBU.border}`, paddingTop: "16px" }}>
                <span className="text-[10px]" style={{ color: KEBU.muted }}>
                  <span className="font-black text-black">{designs.length}</span> designs
                </span>
                <span className="text-[10px]" style={{ color: KEBU.muted }}>
                  <span className="font-black text-black">{videos.length}</span> videos
                </span>
                <span className="text-[10px]" style={{ color: KEBU.muted }}>
                  <span className="font-black text-black">{shared.length}</span> shared with me
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── 4 action tiles ─────────────────────────────────────────── */}
        <section style={{ borderBottom: `1px solid ${KEBU.border}` }}>
          <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8 lg:px-12">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              {/* Create a design */}
              <Link
                href="/studio/new"
                className="group relative overflow-hidden rounded-[14px] border p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderColor: KEBU.border, background: KEBU.card }}
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] text-xl"
                  style={{ background: `${KEBU.orange}18` }}
                >
                  ✏️
                </div>
                <p className="text-[12px] font-black">Create a design</p>
                <p className="mt-1 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>
                  Posts, flyers, cards, banners and more.
                </p>
                <span
                  className="mt-4 inline-block text-[9px] font-black uppercase tracking-[.12em]"
                  style={{ color: KEBU.orange }}
                >
                  Start →
                </span>
              </Link>

              {/* Edit a video */}
              <Link
                href="/studio/video/new"
                className="group relative overflow-hidden rounded-[14px] border p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderColor: KEBU.border, background: KEBU.card }}
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] text-xl"
                  style={{ background: "rgba(99,102,241,0.10)" }}
                >
                  🎬
                </div>
                <p className="text-[12px] font-black">Edit a video</p>
                <p className="mt-1 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>
                  Timeline, captions, sound and motion.
                </p>
                <span
                  className="mt-4 inline-block text-[9px] font-black uppercase tracking-[.12em]"
                  style={{ color: "#6366F1" }}
                >
                  Open timeline →
                </span>
              </Link>

              {/* AI generate */}
              <Link
                href="/studio/new?tab=ai"
                className="group relative overflow-hidden rounded-[14px] border p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderColor: KEBU.border, background: KEBU.card }}
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] text-xl"
                  style={{ background: "rgba(147,51,234,0.10)" }}
                >
                  ✦
                </div>
                <p className="text-[12px] font-black">AI tools</p>
                <p className="mt-1 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>
                  Describe what you want and keep the result editable.
                </p>
                <span
                  className="mt-4 inline-block text-[9px] font-black uppercase tracking-[.12em]"
                  style={{ color: "#9333EA" }}
                >
                  Generate →
                </span>
              </Link>

              {/* Templates */}
              <Link
                href="/studio/templates"
                className="group relative overflow-hidden rounded-[14px] border p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderColor: KEBU.border, background: KEBU.card }}
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] text-xl"
                  style={{ background: "rgba(14,165,233,0.10)" }}
                >
                  🗂️
                </div>
                <p className="text-[12px] font-black">Templates</p>
                <p className="mt-1 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>
                  Complete visual worlds, not one-off cards.
                </p>
                <span
                  className="mt-4 inline-block text-[9px] font-black uppercase tracking-[.12em]"
                  style={{ color: "#0EA5E9" }}
                >
                  Browse →
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Recent work ────────────────────────────────────────────── */}
        {hasRecent && (
          <section style={{ borderBottom: `1px solid ${KEBU.border}` }}>
            <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:px-12">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p
                    className="text-[9px] font-black uppercase tracking-[.16em]"
                    style={{ color: KEBU.orange }}
                  >
                    Continue where you left off
                  </p>
                  <h2
                    className="mt-1.5 text-2xl font-black tracking-[-.04em]"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    Recent work
                  </h2>
                </div>
                <Link
                  href="#library"
                  className="text-[10px] font-semibold transition hover:opacity-70"
                  style={{ color: KEBU.orange }}
                >
                  See all →
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
                {recentDesigns.map((design, i) => {
                  const format = FORMAT_MAP.get(design.design_type);
                  const daysAgo = Math.floor(
                    (Date.now() - new Date(design.updated_at).getTime()) / 86_400_000,
                  );
                  const timeLabel =
                    daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;
                  return (
                    <Link key={design.id} href={`/studio/${design.id}`} className="group">
                      <div className="relative h-[140px] overflow-hidden rounded-[12px] border" style={{ borderColor: KEBU.border }}>
                        <DesignThumb format={format} index={i} />
                        <div className="absolute inset-0 rounded-[12px] bg-black/0 transition group-hover:bg-black/10" />
                      </div>
                      <p className="mt-2 truncate text-[10px] font-semibold">{design.title}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="text-[9px] capitalize" style={{ color: KEBU.muted }}>
                          {design.design_type.replaceAll("_", " ")}
                        </span>
                        <span className="text-[9px]" style={{ color: KEBU.muted }}>·</span>
                        <span className="text-[9px]" style={{ color: KEBU.faint }}>{timeLabel}</span>
                      </div>
                    </Link>
                  );
                })}

                {recentVideos.map((video) => {
                  const daysAgo = Math.floor(
                    (Date.now() - new Date(video.updated_at).getTime()) / 86_400_000,
                  );
                  const timeLabel =
                    daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;
                  return (
                    <Link key={video.id} href={`/studio/video/${video.id}`} className="group">
                      <div className="relative h-[140px] overflow-hidden rounded-[12px] border" style={{ borderColor: KEBU.border }}>
                        <VideoThumb />
                        <div className="absolute inset-0 rounded-[12px] bg-black/0 transition group-hover:bg-black/10" />
                      </div>
                      <p className="mt-2 truncate text-[10px] font-semibold">{video.title}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="text-[9px] capitalize" style={{ color: KEBU.muted }}>
                          Video · {video.edit_mode.replaceAll("_", " ")}
                        </span>
                        <span className="text-[9px]" style={{ color: KEBU.muted }}>·</span>
                        <span className="text-[9px]" style={{ color: KEBU.faint }}>{timeLabel}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Format quick-launch ─────────────────────────────────────── */}
        <section style={{ borderBottom: `1px solid ${KEBU.border}` }}>
          <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8 lg:px-12">
            <p className="mb-4 text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>
              Quick format launch
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {FORMATS.map((format) => {
                const thumbW = format.aspect > 1.4 ? 52 : format.aspect < 0.75 ? 28 : 38;
                const thumbH = Math.max(24, Math.min(52, Math.round(thumbW / format.aspect)));
                return (
                  <Link
                    key={format.type}
                    href={format.href}
                    className="group flex items-center gap-2.5 rounded-[10px] border p-3 transition hover:bg-white hover:shadow-sm"
                    style={{ borderColor: KEBU.border }}
                  >
                    <span
                      className="relative flex-shrink-0 overflow-hidden rounded-[5px]"
                      style={{
                        width: thumbW,
                        height: thumbH,
                        background: `linear-gradient(145deg, ${format.accent}, #0A0A0A)`,
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-semibold">{format.label}</span>
                      <span className="block text-[9px]" style={{ color: KEBU.muted }}>{format.sublabel}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Full library ───────────────────────────────────────────── */}
        <section id="library" className="mx-auto max-w-[1600px] px-5 py-9 sm:px-8 lg:px-12">
          <div className="mb-5">
            <p
              className="text-[9px] font-black uppercase tracking-[.16em]"
              style={{ color: KEBU.orange }}
            >
              Your Studio
            </p>
            <h2
              className="mt-1.5 text-2xl font-black tracking-[-.04em]"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Everything you have made.
            </h2>
          </div>

          <StudioDesignLibrary initialOwned={designs} initialShared={shared} />

          <details className="mt-8 border-t pt-5" style={{ borderColor: KEBU.border }}>
            <summary
              className="cursor-pointer text-[10px] font-black uppercase tracking-[.14em]"
              style={{ color: KEBU.muted }}
            >
              AI generation history
            </summary>
            <div className="pt-5">
              <StudioGenerationHistory />
            </div>
          </details>
        </section>
      </main>
    </AppShell>
  );
}
