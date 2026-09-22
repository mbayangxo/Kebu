"use client";

import { useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";

const FILE_TYPES = [
  { label: "Document", abbr: "W", bg: "#E8F0FE", fg: "#1A73E8" },
  { label: "Spreadsheet", abbr: "X", bg: "#E6F4EA", fg: "#188038" },
  { label: "Presentation", abbr: "P", bg: "#FCE8E6", fg: "#D93025" },
  { label: "PDF", abbr: "PDF", bg: "#FDE8E8", fg: "#C0392B" },
  { label: "More", abbr: "···", bg: "#F1F0EE", fg: KEBU.muted },
];

const FILTER_TABS = ["All", "Recent", "Shared", "Starred", "Templates", "Folders"];

const QUICK_TEMPLATES = [
  { label: "Notes", bg: "linear-gradient(135deg,#6366F1,#8B5CF6)" },
  { label: "Project Plan", bg: "linear-gradient(135deg,#0EA5E9,#06B6D4)" },
  { label: "Budget Tracker", bg: "linear-gradient(135deg,#10B981,#059669)" },
  { label: "Pitch Deck", bg: "linear-gradient(135deg,#F59E0B,#EF4444)" },
  { label: "Resume", bg: "linear-gradient(135deg,#6B7280,#374151)" },
  { label: "Meeting Notes", bg: "linear-gradient(135deg,#EC4899,#D946EF)" },
];

const SIDEBAR_CREATE = [
  { label: "Document", icon: "work" as const },
  { label: "Spreadsheet", icon: "work" as const },
  { label: "Presentation", icon: "work" as const },
  { label: "PDF", icon: "library" as const },
  { label: "Folder", icon: "spaces" as const },
];

const SIDEBAR_TOOLS = [
  "Scan to PDF",
  "Convert files",
  "Merge PDFs",
  "OCR (text from image)",
];

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState("All");

  return (
    <AppShell title="Docs">
      <div style={{ background: "#F5F4F1", minHeight: "100vh" }}>
        {/* Body layout */}
        <div className="flex gap-0">
          <main className="flex-1 min-w-0 px-5 py-5 sm:px-8 space-y-5">
            {/* File type shortcuts */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {FILE_TYPES.map((ft) => (
                <button
                  key={ft.label}
                  className="flex shrink-0 items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-xs font-bold hover:shadow-sm transition-shadow"
                  style={{ borderColor: KEBU.borders.default }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black"
                    style={{ background: ft.bg, color: ft.fg }}
                  >
                    {ft.abbr}
                  </span>
                  {ft.label}
                </button>
              ))}
            </div>

            {/* Filter tabs — interactive */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="shrink-0 rounded-full px-4 py-1.5 text-[11px] font-bold transition"
                  style={
                    activeTab === tab
                      ? { background: KEBU.black, color: "#fff" }
                      : {
                          background: "white",
                          color: KEBU.muted,
                          border: "1px solid " + KEBU.borders.default,
                        }
                  }
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Quick start */}
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>
                Quick start
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {/* Blank card */}
                <button
                  className="flex shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white w-28 h-36 hover:border-black/30 transition"
                  style={{ borderColor: KEBU.borders.strong }}
                >
                  <span className="text-2xl font-light text-black/25">+</span>
                  <span className="mt-1 text-[10px] font-bold text-black/40">Blank</span>
                </button>
                {QUICK_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    className="relative shrink-0 rounded-2xl overflow-hidden w-28 h-36 hover:-translate-y-0.5 transition-transform"
                    style={{ background: t.bg }}
                  >
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/60 to-transparent">
                      <p className="text-[10px] font-bold text-white leading-tight">{t.label}</p>
                    </div>
                  </button>
                ))}
                <button
                  className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border bg-white w-28 h-36 hover:bg-black/[.02] transition"
                  style={{ borderColor: KEBU.borders.default }}
                >
                  <span className="text-[11px] font-bold" style={{ color: KEBU.muted }}>More</span>
                  <span className="text-[10px]" style={{ color: KEBU.faint }}>→</span>
                </button>
              </div>
            </section>

            {/* Recent — empty state */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>
                  Recent
                </h2>
                <button className="text-[10px] font-bold" style={{ color: KEBU.orange }}>
                  View all →
                </button>
              </div>
              <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: KEBU.borders.default }}>
                {/* Table header */}
                <div
                  className="hidden sm:grid gap-4 border-b px-5 py-2.5 text-[10px] font-black uppercase tracking-[.12em]"
                  style={{
                    gridTemplateColumns: "minmax(0,1fr) 90px 90px 110px 36px",
                    borderColor: KEBU.borders.subtle,
                    color: KEBU.faint,
                  }}
                >
                  <span>Name</span>
                  <span>Type</span>
                  <span>Edited</span>
                  <span>Collaborators</span>
                  <span />
                </div>
                {/* Empty state */}
                <div className="px-5 py-14 text-center">
                  <KebuIcon name="work" size={28} className="mx-auto mb-3" style={{ color: KEBU.faint }} />
                  <p className="text-sm font-black">No documents yet.</p>
                  <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
                    Create your first document to get started.
                  </p>
                  <button
                    className="mt-4 inline-flex rounded-full px-4 py-2 text-[10px] font-bold text-white"
                    style={{ background: KEBU.black }}
                  >
                    + New document
                  </button>
                </div>
              </div>
            </section>
          </main>

          {/* Right sidebar */}
          <aside className="hidden xl:flex w-56 shrink-0 flex-col gap-4 px-4 py-5">
            {/* Create new */}
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>
                Create new
              </p>
              <ul className="space-y-0.5">
                {SIDEBAR_CREATE.map((a) => (
                  <li key={a.label}>
                    <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-bold hover:bg-black/[.03] transition text-left">
                      <KebuIcon name={a.icon} size={14} style={{ color: KEBU.orange }} />
                      <span className="flex-1">{a.label}</span>
                      <span className="text-[10px]" style={{ color: KEBU.faint }}>→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tools */}
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>
                Tools
              </p>
              <ul className="space-y-0.5">
                {SIDEBAR_TOOLS.map((t) => (
                  <li key={t}>
                    <button className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[11px] font-bold hover:bg-black/[.03] transition text-left">
                      {t}
                      <span className="text-[10px]" style={{ color: KEBU.faint }}>→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
