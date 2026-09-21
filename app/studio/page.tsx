import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioGenerationHistory } from "@/app/components/studio/studio-generation-history";
import { StudioDesignLibrary } from "@/app/components/studio/studio-design-library";
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
  { type: "instagram_post", label: "Instagram post", sublabel: "1080 × 1080", href: "/studio/new?type=instagram_post", aspect: 1, accent: "#FF6A00" },
  { type: "instagram_story", label: "Story / Reel", sublabel: "1080 × 1920", href: "/studio/new?type=instagram_story", aspect: 9 / 16, accent: "#FF1F1F" },
  { type: "poster", label: "Poster", sublabel: "900 × 1200", href: "/studio/new?type=poster", aspect: 900 / 1200, accent: "#A15CFF" },
  { type: "flyer", label: "Flyer", sublabel: "816 × 1056", href: "/studio/new?type=flyer", aspect: 816 / 1056, accent: "#0EA5E9" },
  { type: "business_card", label: "Business card", sublabel: "1050 × 600", href: "/studio/new?type=business_card", aspect: 1050 / 600, accent: "#0E9F6E" },
  { type: "banner", label: "Banner", sublabel: "1500 × 500", href: "/studio/new?type=banner", aspect: 1500 / 500, accent: "#F4B400" },
  { type: "whatsapp_status", label: "WhatsApp status", sublabel: "1080 × 1920", href: "/studio/new?type=whatsapp_status", aspect: 9 / 16, accent: "#0E9F6E" },
  { type: "social_square", label: "Social square", sublabel: "1080 × 1080", href: "/studio/new?type=social_square", aspect: 1, accent: "#111111" },
];

function FormatMark({ format }: { format: FormatCard }) {
  const width = format.aspect > 1.7 ? 78 : format.aspect < .75 ? 44 : 58;
  const height = Math.max(36, Math.min(68, Math.round(width / format.aspect)));
  return (
    <span className="relative block overflow-hidden rounded-[8px] border border-black/10 shadow-[0_8px_25px_rgba(10,10,10,.07)]" style={{ width, height, background: `linear-gradient(145deg,${format.accent},#101010)` }}>
      <span className="absolute left-2 top-2 h-1.5 w-6 rounded-full bg-white/80" />
      <span className="absolute bottom-2 left-2 h-1 w-4 rounded-full bg-white/30" />
    </span>
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

  const recentDesigns = designs.slice(0, 4);
  const recentVideos = videos.slice(0, 2);
  const hasRecent = recentDesigns.length > 0 || recentVideos.length > 0;

  return (
    <AppShell title="Studio" immersive>
      <main className="min-h-screen bg-[#FFFCF8] text-black">
        <section className="border-b border-black/10">
          <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8 lg:px-12">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[.08] pb-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[.16em]" style={{color:KEBU.orange}}>Kebu Studio · {workspace.mode === "business" ? "Business" : "Personal"}</p>
                <p className="mt-1 text-[11px] text-black/40">Make the thing. Design, video, brand and campaign work in one creative world.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/studio/new" className="rounded-full bg-black px-4 py-2.5 text-[9px] font-semibold text-white">+ Create</Link>
                <Link href="/studio/templates" className="rounded-full border border-black/10 px-4 py-2.5 text-[9px] font-semibold">Templates</Link>
                <Link href="/studio/brand" className="rounded-full border border-black/10 px-4 py-2.5 text-[9px] font-semibold">Brand DNA</Link>
              </div>
            </div>

            <div className="py-7">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">Start anywhere</p><p className="mb-3 text-[10px] font-semibold text-black/45">What are you making?</p>
              <div className="grid border-t sm:grid-cols-2 lg:grid-cols-4" style={{borderColor:KEBU.border}}>
                {FORMATS.map((format) => (
                  <Link key={format.type} href={format.href} className="group flex min-h-[82px] items-center gap-3 border-b px-1 py-3 transition hover:pl-2 lg:px-3" style={{borderColor:KEBU.border}}>
                    <FormatMark format={format} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold">{format.label}</span>
                      <span className="mt-0.5 block text-[9px] text-black/35">{format.sublabel}</span>
                    </span>
                    <span className="text-[10px] text-black/20">→</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid border-t sm:grid-cols-3" style={{borderColor:KEBU.border}}>
              {[
                ["/studio/new?tab=ai","Start with an idea","Describe what you want and keep the result editable."],
                ["/studio/video/new","Start a video","Open the timeline, sound and motion workspace."],
                ["/studio/brand","Use Brand DNA","Bring your type, colors and voice into the work."],
              ].map(([href,title,detail])=>(
                <Link key={href} href={href} className="border-b py-4 sm:border-b-0 sm:border-r sm:px-4 sm:last:border-r-0" style={{borderColor:KEBU.border}}>
                  <p className="text-[10px] font-semibold">{title}</p>
                  <p className="mt-1 text-[9px] leading-relaxed text-black/38">{detail}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {hasRecent ? (
          <section className="border-b border-black/10 px-5 py-9 sm:px-8 lg:px-12 xl:px-16">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Continue where you left off</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>Your active work.</h2>
              </div>
              <span className="text-[10px] font-bold text-black/35">{designs.length} designs · {videos.length} videos</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {recentDesigns.map((design, index) => {
                const format = FORMATS.find((item) => item.type === design.design_type);
                return (
                  <Link key={design.id} href={`/studio/${design.id}`} className="group">
                    <div className="relative h-[150px] overflow-hidden rounded-[12px] border border-black/10 bg-white">
                      <div className="absolute inset-4 rounded-[14px]" style={{ background: `linear-gradient(145deg,${format?.accent ?? KEBU.orange},#111)` }} />
                      <div className="absolute bottom-7 left-7 right-7">
                        <span className="block h-2 w-2/3 rounded-full bg-white/80" />
                        <span className="mt-2 block h-1.5 w-1/3 rounded-full bg-white/35" />
                      </div>
                      <span className="absolute right-3 top-3 text-[9px] font-black text-black/25">0{index + 1}</span>
                    </div>
                    <p className="mt-2 truncate text-[10px] font-semibold">{design.title}</p>
                    <p className="mt-1 text-[9px] capitalize text-black/35">{design.design_type.replaceAll("_", " ")}</p>
                  </Link>
                );
              })}

              {recentVideos.map((video) => (
                <Link key={video.id} href={`/studio/video/${video.id}`} className="group">
                  <div className="relative h-[150px] overflow-hidden rounded-[12px] bg-black">
                    <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 70% 20%,rgba(255,106,0,.95),transparent 34%),linear-gradient(160deg,#111,#000)" }} />
                    <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black">▶</span>
                  </div>
                  <p className="mt-2 truncate text-[11px] font-black">{video.title}</p>
                  <p className="mt-1 text-[9px] capitalize text-black/35">video · {video.edit_mode.replaceAll("_", " ")}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid border-b border-black/10 lg:grid-cols-4">
          {[
            ["/studio/templates", "Themes", "Complete visual worlds, not one-off cards."],
            ["/studio/brand", "Brand", "Logos, colors, typography and voice."],
            ["/studio/campaigns", "Campaigns", "Connected creative sets across formats."],
            ["/studio/video/new", "Video", "Timeline, captions, sound and motion."],
          ].map(([href, label, description], index) => (
            <Link key={href} href={href} className="group min-h-[120px] border-b border-black/10 p-4 transition hover:bg-white lg:border-b-0 lg:border-r">
              <span className="text-[9px] font-black text-black/20">0{index + 1}</span>
              <h3 className="mt-4 text-[12px] font-semibold">{label}</h3>
              <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-black/45">{description}</p>
              <span className="mt-3 block text-[9px] font-semibold" style={{ color: KEBU.orange }}>Open →</span>
            </Link>
          ))}
        </section>

        <section className="px-5 py-9 sm:px-8 lg:px-12 xl:px-16">
          <div className="mb-5">
            <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Your Studio</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>Everything you have made here.</h2>
          </div>
          <StudioDesignLibrary initialOwned={designs} initialShared={shared} />
          <details className="mt-8 border-t border-black/10 pt-5">
            <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[.14em] text-black/40">AI generation history</summary>
            <div className="pt-5"><StudioGenerationHistory /></div>
          </details>
        </section>
      </main>
    </AppShell>
  );
}
