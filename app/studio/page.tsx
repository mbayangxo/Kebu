import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioGenerationHistory } from "@/app/components/studio/studio-generation-history";
import { StudioDesignLibrary } from "@/app/components/studio/studio-design-library";
import { studioRoleLabel, type StudioDesignRole } from "@/lib/studio/design-access";
import { KEBU } from "@/lib/kebu-brand";

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

  const [designsResult, collabsResult] = await Promise.all([
    supabase
      .from("create_designs")
      .select("id, title, design_type, updated_at, folder_id")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(48),
    supabase
      .from("studio_design_collaborators")
      .select("design_id, role")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const designs = designsResult.data ?? [];
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

  const recentDesigns = designs.slice(0, 4);

  return (
    <div className="min-h-screen" style={{ background: KEBU.bright }}>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: KEBU.black }}>
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: `radial-gradient(ellipse 80% 120% at 100% -10%, #9333EA55, transparent 50%),
                         radial-gradient(ellipse 60% 80% at 0% 100%, ${KEBU.orange}33, transparent 50%)`,
          }}
        />
        {/* grid texture */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.035]" aria-hidden>
          <defs>
            <pattern id="sg" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sg)" />
        </svg>

        <div className="relative max-w-5xl mx-auto px-5 lg:px-10 py-10 lg:py-14">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: KEBU.orange }}>
            Kebu Studio
          </p>
          <h1
            className="text-3xl lg:text-5xl font-black text-white leading-tight mb-3"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Design for Africa&apos;s<br className="hidden sm:block" /> best brands.
          </h1>
          <p className="text-sm lg:text-base max-w-xl mb-8" style={{ color: "rgba(255,255,255,0.6)" }}>
            Posters, social, flyers, brand kits — all in one workspace. Create from blank, a template, or let AI do the heavy lifting.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/studio/new"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black uppercase tracking-wide transition-all hover:brightness-110"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              New design
            </Link>
            <Link
              href="/studio/new?tab=ai"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide border transition-all hover:bg-white/10"
              style={{ color: KEBU.white, borderColor: "rgba(255,255,255,0.2)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" /></svg>
              AI generate
            </Link>
            <Link
              href="/studio/brand"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide border transition-all hover:bg-white/10"
              style={{ color: KEBU.white, borderColor: "rgba(255,255,255,0.2)" }}
            >
              Brand DNA
            </Link>
          </div>
        </div>
        <div
          className="h-[3px] w-full"
          style={{ background: `linear-gradient(90deg, #9333EA, ${KEBU.orange}, ${KEBU.red})` }}
        />
      </div>

      <div className="max-w-5xl mx-auto px-5 lg:px-10 py-8 lg:py-12 space-y-12">

        {/* ── Format picker ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.24em] mb-5" style={{ color: KEBU.red }}>
            Start creating
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {FORMATS.map((f) => (
              <Link
                key={f.type}
                href={f.href}
                className="group relative rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                style={{
                  background: KEBU.white,
                  border: `2px solid ${KEBU.black}`,
                  boxShadow: "3px 3px 0 rgba(10,10,10,1)",
                }}
              >
                <div
                  className="flex items-center justify-center pt-4 pb-2 px-4"
                  style={{ background: `${f.accent}08` }}
                >
                  <CanvasThumb aspect={f.aspect} accent={f.accent} />
                </div>
                <div className="px-3 pb-3 pt-1.5">
                  <p className="font-black text-[13px] leading-tight" style={{ color: KEBU.black }}>
                    {f.label}
                  </p>
                  <p className="text-[10px] mt-0.5 font-medium" style={{ color: KEBU.muted }}>
                    {f.sublabel}
                  </p>
                </div>
                <span
                  className="absolute top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: f.accent, color: "#fff" }}
                >
                  Create →
                </span>
              </Link>
            ))}

            {/* AI card */}
            <Link
              href="/studio/new?tab=ai"
              className="group relative rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
              style={{
                background: KEBU.black,
                border: `2px solid ${KEBU.black}`,
                boxShadow: "3px 3px 0 rgba(10,10,10,1)",
              }}
            >
              <div
                className="flex items-center justify-center pt-4 pb-2 px-4"
                style={{
                  background: `radial-gradient(ellipse at 50% 50%, ${KEBU.orange}25, transparent 70%)`,
                  minHeight: 88,
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={KEBU.orange} strokeWidth="1.5" strokeLinecap="round">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                  <path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5L19 3z" />
                </svg>
              </div>
              <div className="px-3 pb-3 pt-1.5">
                <p className="font-black text-[13px] leading-tight" style={{ color: KEBU.white }}>
                  AI design
                </p>
                <p className="text-[10px] mt-0.5 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Describe → generate
                </p>
              </div>
            </Link>

            {/* Video card */}
            <Link
              href="/studio/video/new"
              className="group relative rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
              style={{
                background: "#0F0D33",
                border: `2px solid ${KEBU.black}`,
                boxShadow: "3px 3px 0 rgba(10,10,10,1)",
              }}
            >
              <div className="flex items-center justify-center pt-4 pb-2 px-4" style={{ minHeight: 88 }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              </div>
              <div className="px-3 pb-3 pt-1.5">
                <p className="font-black text-[13px] leading-tight" style={{ color: KEBU.white }}>
                  Video editor
                </p>
                <p className="text-[10px] mt-0.5 font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Multi-track timeline
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* ── Recent designs ────────────────────────────────────────── */}
        {recentDesigns.length > 0 ? (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: KEBU.red }}>
                Recent designs
              </h2>
              <span className="text-[11px] font-bold" style={{ color: KEBU.muted }}>
                {designs.length} total
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentDesigns.map((d) => {
                const fmt = FORMATS.find((f) => f.type === d.design_type);
                return (
                  <Link
                    key={d.id}
                    href={`/studio/${d.id}`}
                    className="group rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                    style={{
                      background: KEBU.white,
                      border: `2px solid ${KEBU.black}`,
                      boxShadow: "2px 2px 0 rgba(10,10,10,1)",
                    }}
                  >
                    <div
                      className="flex items-center justify-center py-4"
                      style={{ background: fmt ? `${fmt.accent}10` : "rgba(10,10,10,0.03)" }}
                    >
                      <CanvasThumb aspect={fmt?.aspect ?? 1} accent={fmt?.accent ?? KEBU.orange} />
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="font-bold text-xs truncate" style={{ color: KEBU.black }}>
                        {d.title}
                      </p>
                      <p className="text-[10px] mt-0.5 capitalize" style={{ color: KEBU.muted }}>
                        {d.design_type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* ── Toolkit row ───────────────────────────────────────────── */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.24em] mb-4" style={{ color: KEBU.red }}>
            Studio toolkit
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              {
                href: "/studio/brand",
                label: "Brand DNA",
                desc: "Colors · voice · logo · photo rules · language settings",
                accent: KEBU.orange,
                iconPath: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
              },
              {
                href: "/studio/campaigns",
                label: "Campaigns",
                desc: "Brief → mood board → connected design set for a launch",
                accent: "#9333EA",
                iconPath: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
              },
              {
                href: "/studio/templates",
                label: "Templates",
                desc: "Curated starting points — filter by format and style",
                accent: KEBU.red,
                iconPath: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z",
              },
            ].map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex items-start gap-4 rounded-2xl p-4 transition-all hover:-translate-y-0.5"
                style={{
                  background: KEBU.white,
                  border: `2px solid ${KEBU.black}`,
                  boxShadow: "3px 3px 0 rgba(10,10,10,1)",
                }}
              >
                <span
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
                  style={{ background: `${tool.accent}18` }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={tool.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={tool.iconPath} />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm" style={{ color: KEBU.black }}>{tool.label}</p>
                  <p className="text-[11px] mt-1 leading-relaxed" style={{ color: KEBU.muted }}>{tool.desc}</p>
                </div>
                <span className="shrink-0 text-lg font-black self-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: KEBU.red }}>
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── AI campaign history ───────────────────────────────────── */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.24em] mb-4" style={{ color: KEBU.red }}>
            AI generation history
          </h2>
          <StudioGenerationHistory />
        </section>

        {/* ── Full library ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.24em] mb-4" style={{ color: KEBU.red }}>
            All designs
          </h2>
          <StudioDesignLibrary initialOwned={designs} initialShared={shared} />
        </section>

        {shared.length === 0 ? (
          <p className="text-[10px] text-center pb-4" style={{ color: KEBU.faint }}>
            Tip: invite teammates from a design&apos;s Share panel — {studioRoleLabel("viewer")} links appear under Shared with me.
          </p>
        ) : null}
      </div>
    </div>
  );
}
