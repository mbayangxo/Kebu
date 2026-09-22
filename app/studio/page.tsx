import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioGenerationHistory } from "@/app/components/studio/studio-generation-history";
import { StudioDesignLibrary } from "@/app/components/studio/studio-design-library";
import type { StudioDesignRole } from "@/lib/studio/design-access";
import { KEBU } from "@/lib/kebu-brand";
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
  { type: "instagram_post", label: "Instagram post", sublabel: "1080 × 1080", href: "/studio/new?type=instagram_post", aspect: 1, accent: "#FF6A00" },
  { type: "instagram_story", label: "Story / Reel", sublabel: "1080 × 1920", href: "/studio/new?type=instagram_story", aspect: 9 / 16, accent: "#FF1F1F" },
  { type: "poster", label: "Poster", sublabel: "900 × 1200", href: "/studio/new?type=poster", aspect: 900 / 1200, accent: "#A15CFF" },
  { type: "flyer", label: "Flyer", sublabel: "816 × 1056", href: "/studio/new?type=flyer", aspect: 816 / 1056, accent: "#0EA5E9" },
  { type: "business_card", label: "Business card", sublabel: "1050 × 600", href: "/studio/new?type=business_card", aspect: 1050 / 600, accent: "#0E9F6E" },
  { type: "banner", label: "Banner", sublabel: "1500 × 500", href: "/studio/new?type=banner", aspect: 1500 / 500, accent: "#F4B400" },
  { type: "whatsapp_status", label: "WhatsApp status", sublabel: "1080 × 1920", href: "/studio/new?type=whatsapp_status", aspect: 9 / 16, accent: "#0E9F6E" },
  { type: "social_square", label: "Social square", sublabel: "1080 × 1080", href: "/studio/new?type=social_square", aspect: 1, accent: "#333333" },
];

const TEMPLATE_CATS = ["All", "Social Media", "Presentations", "Posters", "Videos", "Web", "Documents", "Marketing", "Custom Size"];

const TOOLS = [
  { label: "AI Design", desc: "Generate from a prompt", href: "/studio/new?tab=ai", accent: "#FF5500" },
  { label: "Remove Background", desc: "One-click removal", href: "/studio/tools/bg-remove", accent: "#6C63FF" },
  { label: "Magic Resize", desc: "Resize to any format", href: "/studio/tools/resize", accent: "#0EA5E9" },
  { label: "Text to Image", desc: "Turn text into visuals", href: "/studio/new?tab=ai", accent: "#0E9F6E" },
  { label: "Text to Video", desc: "AI-powered video", href: "/studio/video/new", accent: "#F4B400" },
  { label: "Translate", desc: "Multi-language content", href: "/studio/tools/translate", accent: "#FF1F1F" },
];

const STUDIO_NAV = [
  { label: "Templates", href: "/studio/templates" },
  { label: "AI Create", href: "/studio/new?tab=ai" },
  { label: "Brand Kit", href: "/studio/brand" },
  { label: "Assets", href: "/library" },
  { label: "Text", href: "/studio/new?type=text" },
  { label: "Photos", href: "/studio/assets/photos" },
  { label: "Graphics", href: "/studio/assets/graphics" },
  { label: "Video", href: "/studio/video/new" },
  { label: "Audio", href: "/studio/assets/audio" },
  { label: "Animations", href: "/studio/assets/animations" },
  { label: "Apps", href: "/tools" },
];

const INSPO_TABS = ["For you", "Trending", "Branding", "Editorial", "Minimal", "Bold", "Motion"];

const sidebar = "#0A0A0A";
const border = "rgba(255,255,255,0.07)";
const textMuted = "rgba(255,255,255,0.5)";
const textDim = "rgba(255,255,255,0.3)";

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

  const recentDesigns = designs.slice(0, 8);
  const recentVideos = videos.slice(0, 4);
  const hasRecent = recentDesigns.length > 0 || recentVideos.length > 0;
  const avatarInitial = (user.email ?? "K").charAt(0).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#111111", color: "#FFFFFF" }}>

      {/* Studio-specific sidebar — replaces main app nav */}
      <aside className="hidden w-[200px] shrink-0 flex-col border-r lg:flex" style={{ background: sidebar, borderColor: border }}>

        {/* Logo + Back */}
        <div className="border-b px-4 py-5" style={{ borderColor: border }}>
          <Link href="/dashboard" className="flex items-center gap-1.5 group focus-visible:outline-none" aria-label="Kebu Home">
            <span className="text-[15px] font-black tracking-[-0.04em] text-white">kebu</span>
            <span className="text-[15px] font-black" style={{ color: KEBU.orange }}>•</span>
          </Link>
          <Link href="/dashboard" className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: textMuted }}>
            <span>←</span> Back to Home
          </Link>
        </div>

        {/* Studio nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <Link href="/studio"
            className="mb-0.5 flex min-h-9 items-center rounded-xl px-2.5 text-[13px] font-black"
            style={{ background: "rgba(255,85,0,0.18)", color: "#FFFFFF" }}>
            Studio
          </Link>
          {STUDIO_NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex min-h-8 items-center rounded-lg px-2.5 text-[12px] font-medium transition-colors hover:bg-white/[0.06]"
              style={{ color: textMuted }}>
              {item.label}
            </Link>
          ))}

          {/* Recent */}
          {hasRecent ? (
            <div className="mt-4 border-t pt-3" style={{ borderColor: border }}>
              <p className="mb-2 px-2.5 text-[9px] font-black uppercase tracking-[.14em]" style={{ color: textDim }}>Recent</p>
              {recentDesigns.slice(0, 5).map((d) => (
                <Link key={d.id} href={`/studio/${d.id}`}
                  className="flex min-h-8 items-center rounded-lg px-2.5 text-[11px] truncate transition-colors hover:bg-white/[0.06]"
                  style={{ color: "rgba(255,255,255,0.4)" }}>
                  {d.title}
                </Link>
              ))}
            </div>
          ) : null}
        </nav>

        {/* Promo card */}
        <div className="m-3">
          <div className="relative overflow-hidden rounded-2xl p-4" style={{ background: "linear-gradient(145deg,#1a0800,#2d1200)" }}>
            <div className="absolute -right-4 -top-4 h-16 w-16 opacity-40" style={{ background: `radial-gradient(circle,${KEBU.orange},transparent 70%)` }} />
            <p className="relative z-10 text-[11px] font-black leading-snug text-white">Create<br />Collaborate<br />Launch</p>
            <Link href="/studio/new" className="relative z-10 mt-2 flex items-center gap-1 text-[10px] font-black" style={{ color: KEBU.orange }}>
              Get started <span>→</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Studio top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3"
          style={{ background: "rgba(17,17,17,0.95)", borderColor: border }}>

          {/* Left: title + tagline */}
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm font-black tracking-[-.01em]">Studio</h1>
            <span className="hidden text-[9px] font-black uppercase tracking-[.18em] sm:block" style={{ color: textDim }}>CREATE WITHOUT LIMITS</span>
          </div>

          {/* Center: search */}
          <div className="hidden flex-1 max-w-sm lg:block">
            <input type="text" placeholder="Search templates, designs..."
              className="w-full h-8 rounded-full px-4 text-[11px] outline-none focus:ring-1 focus:ring-orange-500"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden text-[10px] sm:block" style={{ color: "rgba(255,255,255,0.3)" }}>☁ All changes saved</span>
            <Link href="/account/upgrade" className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: KEBU.orange }}>Upgrade</Link>
            <button type="button" className="rounded-full w-8 h-8 flex items-center justify-center transition-colors hover:bg-white/10" style={{ color: textMuted }} aria-label="Notifications">
              🔔
            </button>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-black" style={{ background: KEBU.orange }}>
              {avatarInitial}
            </span>
            <Link href="/studio/new"
              className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-wide"
              style={{ borderColor: KEBU.orange, color: KEBU.orange }}>
              + New design ▼
            </Link>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* Hero */}
          <section className="border-b px-6 py-10 sm:px-8" style={{ borderColor: border }}>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
              <div className="flex flex-col justify-center">
                <p className="text-[9px] font-black uppercase tracking-[.2em]" style={{ color: KEBU.orange }}>Kebu Studio</p>
                <h2 className="mt-3 text-[clamp(2.2rem,5vw,4.5rem)] font-black leading-[.88] tracking-[-.06em]" style={{ fontFamily: "var(--font-fraunces)" }}>
                  Ideas take<br />shape{" "}
                  <em className="font-normal not-italic" style={{ color: KEBU.orange }}>here.</em>
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Design. Edit. Animate. Collaborate. All in one creative space built for what you make next.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/studio/new"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[11px] font-black uppercase tracking-[.12em] text-white"
                    style={{ background: KEBU.orange }}>
                    + Create new ▼
                  </Link>
                  <Link href="/studio/new?tab=ai"
                    className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-[11px] font-black uppercase tracking-[.12em]"
                    style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}>
                    + Start with AI
                  </Link>
                </div>
              </div>

              {/* Editorial photo mock */}
              <div className="relative min-h-[280px] overflow-hidden rounded-3xl lg:min-h-[340px]">
                <div className="absolute inset-0" style={{ background: "linear-gradient(145deg,#1a0d00,#0a0a0a 40%,#1a1a2e)" }} />
                <div className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(ellipse at 60% 30%,#FF5500,transparent 50%),radial-gradient(ellipse at 20% 70%,#6C63FF,transparent 45%)" }} />
                {/* Photo overlay text */}
                <div className="absolute left-6 top-6 right-6">
                  <p className="text-[9px] font-black uppercase tracking-[.2em]" style={{ color: "rgba(255,255,255,0.4)" }}>More ideas</p>
                  <p className="mt-1 text-lg font-black leading-tight text-white" style={{ fontFamily: "var(--font-fraunces)" }}>A brighter tomorrow</p>
                </div>
                {/* Bottom dark card */}
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl border p-4 backdrop-blur-sm"
                  style={{ background: "rgba(0,0,0,0.6)", borderColor: "rgba(255,255,255,0.1)" }}>
                  <p className="text-sm font-black text-white">A canvas for what&apos;s next.</p>
                  <Link href="/studio" className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Watch video ▶
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Template category filter */}
          <section className="border-b px-6 py-4 sm:px-8" style={{ borderColor: border }}>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {TEMPLATE_CATS.map((cat, i) => (
                <button key={cat} type="button"
                  className="shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wide transition-colors"
                  style={{ background: i === 0 ? KEBU.orange : "rgba(255,255,255,0.07)", color: i === 0 ? "#fff" : textMuted }}>
                  {cat}
                </button>
              ))}
              <span className="mx-2 text-[10px]" style={{ color: textDim }}>|</span>
              <button type="button" className="shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wide border" style={{ borderColor: "rgba(255,255,255,0.12)", color: textMuted }}>Templates</button>
              <button type="button" className="shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wide" style={{ color: textDim }}>My Projects</button>
            </div>
          </section>

          {/* Format grid */}
          <section className="border-b px-6 py-8 sm:px-8" style={{ borderColor: border }}>
            <p className="mb-4 text-[9px] font-black uppercase tracking-[.18em]" style={{ color: textDim }}>Start anywhere — pick a format</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {FORMATS.map((format) => {
                const width = format.aspect > 1.7 ? 52 : format.aspect < .75 ? 30 : 38;
                const height = Math.max(24, Math.min(52, Math.round(width / format.aspect)));
                return (
                  <Link key={format.type} href={format.href}
                    className="group flex items-center gap-3 rounded-xl border p-3 transition hover:bg-white/[0.05]"
                    style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <span className="relative block shrink-0 overflow-hidden rounded-lg"
                      style={{ width, height, background: `linear-gradient(145deg,${format.accent},#1a1a1a)` }}>
                      <span className="absolute left-1.5 top-1.5 h-1 w-3 rounded-full bg-white/60" />
                    </span>
                    <span>
                      <span className="block text-[11px] font-black">{format.label}</span>
                      <span className="block text-[9px]" style={{ color: textDim }}>{format.sublabel}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Get started with tools */}
          <section className="border-b px-6 py-8 sm:px-8" style={{ borderColor: border }}>
            <p className="mb-4 text-[9px] font-black uppercase tracking-[.18em]" style={{ color: textDim }}>Get started with tools</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TOOLS.map((tool) => (
                <Link key={tool.label} href={tool.href}
                  className="flex items-center gap-3 rounded-xl border p-4 transition hover:bg-white/[0.05]"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: tool.accent + "22" }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: tool.accent }} />
                  </span>
                  <span>
                    <span className="block text-[12px] font-black">{tool.label}</span>
                    <span className="block text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{tool.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Recent work */}
          {hasRecent ? (
            <section className="border-b px-6 py-8 sm:px-8" style={{ borderColor: border }}>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.18em]" style={{ color: KEBU.orange }}>Continue where you left off</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>Your active work.</h2>
                </div>
                <span className="text-[10px]" style={{ color: textDim }}>{designs.length} designs · {videos.length} videos</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {recentDesigns.map((design) => {
                  const fmt = FORMATS.find((f) => f.type === design.design_type);
                  return (
                    <Link key={design.id} href={`/studio/${design.id}`} className="group">
                      <div className="relative h-[180px] overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(255,255,255,0.08)", background: "#1a1a1a" }}>
                        <div className="absolute inset-3 rounded-xl" style={{ background: `linear-gradient(145deg,${fmt?.accent ?? KEBU.orange},#111)` }} />
                        <div className="absolute bottom-5 left-4 right-4">
                          <span className="block h-1.5 w-3/4 rounded-full bg-white/70" />
                          <span className="mt-1.5 block h-1 w-1/2 rounded-full bg-white/30" />
                        </div>
                      </div>
                      <p className="mt-2 truncate text-[11px] font-black">{design.title}</p>
                      <p className="mt-0.5 text-[9px] capitalize" style={{ color: "rgba(255,255,255,0.35)" }}>{design.design_type.replaceAll("_", " ")}</p>
                    </Link>
                  );
                })}
                {recentVideos.map((video) => (
                  <Link key={video.id} href={`/studio/video/${video.id}`} className="group">
                    <div className="relative h-[180px] overflow-hidden rounded-2xl" style={{ background: "radial-gradient(circle at 60% 20%,rgba(255,106,0,.8),transparent 40%),linear-gradient(160deg,#1a1a1a,#0a0a0a)" }}>
                      <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm">▶</span>
                    </div>
                    <p className="mt-2 truncate text-[11px] font-black">{video.title}</p>
                    <p className="mt-0.5 text-[9px] capitalize" style={{ color: "rgba(255,255,255,0.35)" }}>video · {video.edit_mode.replaceAll("_", " ")}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {/* Inspiration tabs */}
          <section className="border-b px-6 py-8 sm:px-8" style={{ borderColor: border }}>
            <p className="mb-4 text-[9px] font-black uppercase tracking-[.18em]" style={{ color: textDim }}>Inspiration for you</p>
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
              {INSPO_TABS.map((tab, i) => (
                <button key={tab} type="button"
                  className="shrink-0 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors"
                  style={{ background: i === 0 ? "rgba(255,255,255,0.12)" : "transparent", color: i === 0 ? "#fff" : "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FORMATS.slice(0, 4).map((format) => (
                <Link key={format.type + "inspo"} href={format.href}
                  className="group relative overflow-hidden rounded-2xl transition hover:scale-[1.02]"
                  style={{ height: 180 }}>
                  <div className="absolute inset-0" style={{ background: `linear-gradient(145deg,${format.accent},#0a0a0a)` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="block text-xs font-black">{format.label}</span>
                    <span className="block text-[9px]" style={{ color: "rgba(255,255,255,0.45)" }}>{format.sublabel}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Full library */}
          <section className="px-6 py-8 sm:px-8">
            <div className="mb-5">
              <p className="text-[9px] font-black uppercase tracking-[.18em]" style={{ color: KEBU.orange }}>Your Studio</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>Everything you have made.</h2>
            </div>
            <StudioDesignLibrary initialOwned={designs} initialShared={shared} />
            <details className="mt-8 border-t pt-5" style={{ borderColor: border }}>
              <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[.14em]" style={{ color: textDim }}>AI generation history</summary>
              <div className="pt-5"><StudioGenerationHistory /></div>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}
