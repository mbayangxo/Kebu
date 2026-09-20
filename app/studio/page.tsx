import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioGenerationHistory } from "@/app/components/studio/studio-generation-history";
import { StudioDesignLibrary } from "@/app/components/studio/studio-design-library";
import { studioRoleLabel, type StudioDesignRole } from "@/lib/studio/design-access";
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
  { type: "instagram_post",   label: "Instagram post",     sublabel: "1080 × 1080",    href: "/studio/new?type=instagram_post",   aspect: 1,            accent: "#E1306C" },
  { type: "instagram_story",  label: "Story / Reel",       sublabel: "1080 × 1920",    href: "/studio/new?type=instagram_story",  aspect: 9 / 16,       accent: "#FF5500" },
  { type: "poster",           label: "Poster",             sublabel: "A3 · print ready", href: "/studio/new?type=poster",          aspect: 900 / 1200,   accent: "#9333EA" },
  { type: "flyer",            label: "Flyer",              sublabel: "A5 · letterhead",  href: "/studio/new?type=flyer",           aspect: 816 / 1056,   accent: "#0EA5E9" },
  { type: "business_card",    label: "Business card",      sublabel: "3.5 × 2 in",     href: "/studio/new?type=business_card",    aspect: 1050 / 600,   accent: "#10B981" },
  { type: "banner",           label: "Banner",             sublabel: "1500 × 500",     href: "/studio/new?type=banner",           aspect: 1500 / 500,   accent: "#F59E0B" },
  { type: "whatsapp_status",  label: "WhatsApp status",    sublabel: "1080 × 1920",    href: "/studio/new?type=whatsapp_status",  aspect: 9 / 16,       accent: "#25D366" },
  { type: "social_square",    label: "Social square",      sublabel: "1080 × 1080",    href: "/studio/new?type=social_square",    aspect: 1,            accent: "#6366F1" },
];

function CanvasThumb({ aspect, accent }: { aspect: number; accent: string }) {
  const w = 100;
  const h = Math.min(Math.round(w / aspect), 140);
  const id = accent.replace("#", "");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", borderRadius: 5 }}>
      <defs>
        <linearGradient id={`cg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#050505" stopOpacity="0.97" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#cg${id})`} />
      {/* subtle grid */}
      <line x1={w * 0.33} y1="0" x2={w * 0.33} y2={h} stroke="white" strokeOpacity="0.06" strokeWidth="0.7" />
      <line x1={w * 0.66} y1="0" x2={w * 0.66} y2={h} stroke="white" strokeOpacity="0.06" strokeWidth="0.7" />
      <line x1="0" y1={h * 0.33} x2={w} y2={h * 0.33} stroke="white" strokeOpacity="0.06" strokeWidth="0.7" />
      <line x1="0" y1={h * 0.66} x2={w} y2={h * 0.66} stroke="white" strokeOpacity="0.06" strokeWidth="0.7" />
      {/* placeholder content */}
      <rect x="10" y={h * 0.22} width={w * 0.52} height="5" rx="2.5" fill="white" fillOpacity="0.75" />
      <rect x="10" y={h * 0.36} width={w * 0.35} height="3.5" rx="1.75" fill="white" fillOpacity="0.4" />
      <rect x="10" y={h * 0.48} width={w * 0.25} height="3.5" rx="1.75" fill="white" fillOpacity="0.28" />
    </svg>
  );
}

export default async function StudioHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/studio");
  }

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
    supabase
      .from("studio_design_collaborators")
      .select("design_id, role")
      .eq("user_id", user.id)
      .eq("status", "active"),
    videoQuery,
  ]);

  const designs = designsResult.data ?? [];
  const videos = videosResult.data ?? [];
  const collabs = collabsResult.data ?? [];

  const sharedIds = collabs.map((c) => c.design_id as string);
  const roleByDesign = new Map(
    collabs.map((c) => [
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
    shared = (data ?? []).map((d) => ({
      ...d,
      accessRole: (roleByDesign.get(d.id) === "editor" ? "editor" : "viewer") as "editor" | "viewer",
    }));
  }

  const recentDesigns = designs.slice(0, 4);
  const recentVideos = videos.slice(0, 4);

  return (
    <AppShell title="Studio">
    <div className="min-h-screen" style={{ background: KEBU.bright }}>

      <div className="border-b border-black/10 bg-[#FFFCF8]"><div className="mx-auto max-w-[1440px] px-5 py-7 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="mb-2 text-[10px] font-black uppercase tracking-[.28em]" style={{color:KEBU.orange}}>Kebu Studio</p><h1 className="text-3xl font-black tracking-[-.04em] lg:text-4xl">What will you create today?</h1><p className="mt-2 max-w-2xl text-sm text-black/55">Design, video, brand and campaign work in one place — scoped to {workspace.mode === "business" ? "this Business Kebu" : "your Personal Kebu"} so personal and business creative work never silently mix.</p></div><div className="flex gap-2"><Link href="/studio/templates" className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold">Browse themes</Link><Link href="/studio/new" className="rounded-xl bg-black px-4 py-2.5 text-xs font-black text-white">Create design <span style={{color:KEBU.orange}}>＋</span></Link></div></div>
        <div className="mt-6 flex max-w-3xl items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3"><span>⌕</span><span className="text-sm text-black/45">Search your designs, themes, formats and assets</span><span className="ml-auto hidden rounded-md bg-black/[.04] px-2 py-1 text-[10px] font-bold text-black/45 sm:block">⌘ K</span></div>
      </div></div>
      <main className="mx-auto max-w-[1440px] space-y-10 px-5 py-7 lg:px-8">
        <section><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-black">Start creating</h2><Link href="/studio/new" className="text-xs font-bold text-black/50">Custom size →</Link></div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">{FORMATS.slice(0,8).map((f)=><Link key={f.type} href={f.href} className="group min-w-0"><div className="flex h-[82px] items-center justify-center rounded-2xl border border-black/10 bg-white transition group-hover:-translate-y-0.5 group-hover:border-black/25"><CanvasThumb aspect={f.aspect} accent={f.accent}/></div><p className="mt-2 truncate text-[11px] font-bold">{f.label}</p></Link>)}<Link href="/studio/video/new" className="group min-w-0"><div className="flex h-[82px] items-center justify-center rounded-2xl border border-black/10 bg-white"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">▶</span></div><p className="mt-2 text-[11px] font-bold">Video</p></Link><Link href="/studio/new?tab=ai" className="group min-w-0"><div className="flex h-[82px] items-center justify-center rounded-2xl border border-black/10 bg-white"><span className="flex h-10 w-10 items-center justify-center rounded-xl text-xl font-black text-white" style={{background:`linear-gradient(135deg,${KEBU.orange},${KEBU.red})`}}>✦</span></div><p className="mt-2 text-[11px] font-bold">Kebu AI</p></Link></div>
        </section>
        <section className="grid gap-4 lg:grid-cols-[1.45fr_.55fr]"><div className="overflow-hidden rounded-[24px] bg-black p-6 text-white lg:p-8"><div className="grid min-h-[210px] gap-6 sm:grid-cols-[1fr_240px] sm:items-center"><div><span className="text-[10px] font-black uppercase tracking-[.24em]" style={{color:KEBU.orange}}>Brand-aware creation</span><h2 className="mt-3 max-w-xl text-3xl font-black leading-[.98] tracking-[-.045em]">Create with your brand, not around it.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-white/55">Your Brand DNA, themes and business assets stay available while you design. Start blank, from a theme, or ask Kebu AI.</p><div className="mt-5 flex gap-2"><Link href="/studio/brand" className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-black">Open Brand DNA</Link><Link href="/studio/campaigns" className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold">Campaigns</Link></div></div><div className="relative hidden h-[170px] overflow-hidden rounded-[22px] bg-[#17110D] sm:block"><div className="absolute -right-8 -top-12 h-48 w-48 rotate-[28deg] rounded-[44px]" style={{background:`linear-gradient(135deg,${KEBU.orange},${KEBU.red},#220500)`}}/><div className="absolute bottom-5 left-5 text-[10px] font-black uppercase tracking-[.25em] text-white/75">Ideas<br/>Businesses<br/>Opportunities<br/><span style={{color:KEBU.orange}}>All yours.</span></div></div></div></div><div className="rounded-[24px] border border-black/10 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.22em] text-black/40">Studio spaces</p><div className="mt-4 space-y-1">{[["/studio/templates","Themes","Complete visual systems"],["/studio/brand","Brand","Logos, colors, type and voice"],["/studio/campaigns","Campaigns","Connected creative sets"],["/studio/video/new","Video","Timeline, sound and motion"]].map(([href,label,desc])=><Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-black/[.035]"><span className="h-8 w-1 rounded-full" style={{background:KEBU.orange}}/><span className="min-w-0 flex-1"><span className="block text-xs font-black">{label}</span><span className="block truncate text-[10px] text-black/45">{desc}</span></span><span className="text-black/30">→</span></Link>)}</div></div></section>
        {recentDesigns.length > 0 || recentVideos.length > 0 ? <section><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-black">Continue creating</h2><span className="text-[11px] font-semibold text-black/40">{designs.length} designs · {videos.length} videos</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{recentDesigns.map((d)=>{const fmt=FORMATS.find((f)=>f.type===d.design_type);return <Link key={"design-"+d.id} href={`/studio/${d.id}`} className="group min-w-0"><div className="flex h-[150px] items-center justify-center rounded-2xl border border-black/10 bg-white group-hover:border-black/25"><CanvasThumb aspect={fmt?.aspect??1} accent={fmt?.accent??KEBU.orange}/></div><p className="mt-2 truncate text-xs font-bold">{d.title}</p><p className="mt-.5 text-[10px] capitalize text-black/40">{d.design_type.replace(/_/g," ")}</p></Link>})}{recentVideos.slice(0,Math.max(0,6-recentDesigns.length)).map((v)=>{const aspect=v.width/Math.max(1,v.height);return <Link key={"video-"+v.id} href={`/studio/video/${v.id}`} className="group min-w-0"><div className="relative flex h-[150px] items-center justify-center overflow-hidden rounded-2xl border border-black/10 bg-black group-hover:border-black/25"><CanvasThumb aspect={aspect} accent="#FF6A00"/><span className="absolute flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[12px] text-black shadow">▶</span></div><p className="mt-2 truncate text-xs font-bold">{v.title}</p><p className="mt-.5 text-[10px] capitalize text-black/40">video · {v.edit_mode.replace(/_/g," ")}</p></Link>})}</div></section>:null}
        {videos.length > 0 ? <section><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-black">Video projects</h2><p className="mt-0.5 text-[10px] text-black/40">Timeline, captions, sound, motion, linked design sources and offline media.</p></div><Link href="/studio/video/new" className="text-xs font-bold text-black/50">New video →</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{videos.slice(0,8).map((v)=><Link key={v.id} href={`/studio/video/${v.id}`} className="rounded-2xl border border-black/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-black/25"><div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">▶</span><span className="text-[9px] font-black uppercase tracking-wide text-black/35">{v.width}×{v.height}</span></div><p className="mt-5 truncate text-sm font-black">{v.title}</p><p className="mt-1 text-[10px] capitalize text-black/45">{v.edit_mode.replace(/_/g," ")}{v.source_design_id?" · linked design":""}</p></Link>)}</div></section> : null}
        <section><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-black">Your Studio</h2><p className="hidden text-[11px] text-black/40 sm:block">Personal, business and shared work stay separated.</p></div><StudioDesignLibrary initialOwned={designs} initialShared={shared}/></section>
        <details className="rounded-2xl border border-black/10 bg-white p-4"><summary className="cursor-pointer text-xs font-black">AI generation history</summary><div className="pt-4"><StudioGenerationHistory/></div></details>
      </main>
    </div>
    </AppShell>
  );
}
