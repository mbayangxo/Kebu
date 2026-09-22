"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KEBU_TOOLS } from "@/lib/account/kebu-setup";
import { KEBU } from "@/lib/kebu-brand";

const CATEGORY_FILTERS = ["All", "Create", "Communicate", "Manage", "Business", "Explore"];

const FEATURED_TOOLS = [
  {
    id: "studio",
    name: "Studio",
    tagline: "Design anything.",
    href: "/studio",
    bg: "linear-gradient(135deg,#FF5500 0%,#E10600 100%)",
    icon: "studio" as KebuIconName,
  },
  {
    id: "sites",
    name: "Sites",
    tagline: "Build your web presence.",
    href: "/my-sites",
    bg: "linear-gradient(135deg,#0A0A0A 0%,#2D2520 100%)",
    icon: "builder" as KebuIconName,
  },
  {
    id: "mail",
    name: "Mail",
    tagline: "Reach your audience.",
    href: "/email",
    bg: "linear-gradient(135deg,#1A3A5C 0%,#0EA5E9 100%)",
    icon: "message" as KebuIconName,
  },
  {
    id: "code",
    name: "Opportunity",
    tagline: "Find what's next.",
    href: "/opportunity",
    bg: "linear-gradient(135deg,#4A1D96 0%,#7C3AED 100%)",
    icon: "opportunity" as KebuIconName,
  },
];

const FEATURED_COLLECTIONS = [
  { label: "Creator Essentials", bg: "linear-gradient(135deg,#FF5500,#FF7733)", count: "8 tools" },
  { label: "Business Toolkit", bg: "linear-gradient(135deg,#0A0A0A,#374151)", count: "6 tools" },
  { label: "AI & Automation", bg: "linear-gradient(135deg,#4A1D96,#7C3AED)", count: "5 tools" },
  { label: "Integrations", bg: "linear-gradient(135deg,#0E7490,#0EA5E9)", count: "4 tools" },
];

const MY_TOOLS_PINNED = ["mail", "studio", "sites", "business", "calendar"];

export default function ToolsPage() {
  const [activeFilter, setActiveFilter] = useState("All");

  const groupMap: Record<string, string> = {
    Create: "Create",
    Connect: "Communicate",
    Discover: "Explore",
    Business: "Business",
    Work: "Manage",
  };

  const filteredTools = KEBU_TOOLS.filter((tool) => {
    if (activeFilter === "All") return true;
    return groupMap[tool.group] === activeFilter;
  });

  const pinnedTools = KEBU_TOOLS.filter((t) => MY_TOOLS_PINNED.includes(t.id));

  return (
    <AppShell title="All tools">
      <div style={{ background: "#F5F4F1", minHeight: "100vh" }}>
        {/* Body */}
        <div className="flex gap-0">
          <main className="flex-1 min-w-0 px-5 py-5 pb-8 sm:px-8 space-y-5">
            {/* Top action row */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {CATEGORY_FILTERS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className="shrink-0 rounded-full px-4 py-1.5 text-[11px] font-bold transition"
                    style={
                      activeFilter === cat
                        ? { background: KEBU.black, color: "#fff" }
                        : { background: "white", color: KEBU.muted, border: "1px solid " + KEBU.borders.default }
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <button
                className="ml-3 shrink-0 rounded-full px-4 py-1.5 text-[11px] font-bold text-white"
                style={{ background: KEBU.black }}
              >
                + Add tool
              </button>
            </div>


            {/* Featured tools */}
            {activeFilter === "All" && (
              <section>
                <h2 className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>
                  Featured
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {FEATURED_TOOLS.map((ft) => (
                    <Link
                      key={ft.id}
                      href={ft.href}
                      className="flex shrink-0 flex-col justify-between rounded-2xl p-5 w-52 h-52 hover:-translate-y-1 transition-transform"
                      style={{ background: ft.bg }}
                    >
                      <KebuIcon name={ft.icon} size={22} style={{ color: "rgba(255,255,255,0.8)" }} />
                      <div>
                        <p className="text-base font-black text-white">{ft.name}</p>
                        <p className="text-[11px] text-white/60">{ft.tagline}</p>
                        <span className="mt-2 inline-block text-white/50 text-xs">→</span>
                      </div>
                    </Link>
                  ))}
                  {/* More card */}
                  <div
                    className="flex shrink-0 flex-col items-center justify-center rounded-2xl w-52 h-52"
                    style={{ background: "rgba(10,10,10,0.05)" }}
                  >
                    <p className="text-sm font-black text-center leading-snug px-4" style={{ color: KEBU.muted }}>
                      More tools.<br />Bigger things.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* All tools grid */}
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>
                {activeFilter === "All" ? "All tools" : activeFilter}
              </h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filteredTools.map((tool) => (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    className="flex flex-col items-center rounded-2xl border bg-white p-4 hover:-translate-y-0.5 hover:shadow-sm transition"
                    style={{ borderColor: KEBU.borders.default }}
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: "rgba(255,85,0,0.09)", color: KEBU.orange }}
                    >
                      <KebuIcon name={tool.icon as KebuIconName} size={18} />
                    </span>
                    <p className="mt-2.5 text-center text-[11px] font-black leading-tight">{tool.label}</p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Featured collections */}
            {activeFilter === "All" && (
              <section>
                <h2 className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>
                  Featured collections
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {FEATURED_COLLECTIONS.map((col) => (
                    <button
                      key={col.label}
                      className="flex flex-col justify-between rounded-2xl p-4 h-28 text-left hover:-translate-y-0.5 transition-transform"
                      style={{ background: col.bg }}
                    >
                      <p className="text-[12px] font-black text-white leading-snug">{col.label}</p>
                      <p className="text-[10px] text-white/50">{col.count}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Recently used — empty */}
            {activeFilter === "All" && (
              <section>
                <h2 className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>
                  Recently used
                </h2>
                <div className="rounded-2xl border border-dashed bg-white px-5 py-8 text-center" style={{ borderColor: KEBU.borders.default }}>
                  <KebuIcon name="more" size={24} className="mx-auto mb-2" style={{ color: KEBU.faint }} />
                  <p className="text-[12px] font-black">No recent activity yet.</p>
                  <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>Tools you use will appear here for quick access.</p>
                </div>
              </section>
            )}
          </main>

          {/* Right sidebar */}
          <aside className="hidden xl:flex w-60 shrink-0 flex-col gap-4 px-4 py-6">
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>
                My tools
              </p>
              <ul className="space-y-0.5">
                {pinnedTools.map((tool) => (
                  <li key={tool.id}>
                    <Link
                      href={tool.href}
                      className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-bold hover:bg-black/[.03] transition"
                    >
                      <KebuIcon name={tool.icon as KebuIconName} size={14} style={{ color: KEBU.orange }} />
                      <span className="flex-1">{tool.label}</span>
                      <KebuIcon name="more" size={14} style={{ color: KEBU.faint }} />
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                className="mt-3 w-full rounded-xl border px-3 py-2 text-[11px] font-bold hover:bg-black/[.02] transition text-left"
                style={{ borderColor: KEBU.borders.subtle, color: KEBU.muted }}
              >
                + Add or remove tools
              </button>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
