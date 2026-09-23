"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BUILDER, labelForSectionType } from "@/lib/create/builder-ui";
import { BuilderSectionLayoutPanel } from "@/app/components/create/builder-section-layout-panel";
import { SectionPhotoField } from "@/app/components/create/section-photo-field";
import { NavLinksEditor, mapNavLinksForEditor } from "@/app/components/create/nav-links-editor";
import { NavSizeEditor } from "@/app/components/create/nav-size-editor";
import { SocialLinksEditor } from "@/app/components/create/social-links-editor";
import { BuilderFreeTextEditor, type FreeTextBlock } from "@/app/components/create/builder-free-text-editor";
import { SiteMediaUpload } from "@/app/components/create/site-media-upload";
import { clampNavScale, parseNavLayout, parseNavSize } from "@/lib/create/nav-chrome-size";
import { defaultMaylecorKsendrProps } from "@/lib/create/maylecor-ksendr-defaults";
import type { EditorSection as Section, EditorProject as Project } from "@/app/create/[id]/project-editor-load";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PanelField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "#8A8A8A" }}>{label}</p>
      {children}
      {hint ? <p className="mt-1 text-[9px] leading-relaxed" style={{ color: "#ABABAB" }}>{hint}</p> : null}
    </div>
  );
}

const INPUT = "w-full rounded-lg px-2.5 py-2 text-[12px] outline-none focus:ring-1 focus:ring-[#FF6A00]";
const INPUT_STYLE = { border: "1px solid #E0E0E0", background: "#fff" };

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ tabs, active, onSelect }: { tabs: string[]; active: string; onSelect: (t: string) => void }) {
  return (
    <div
      className="flex gap-0 border-b overflow-x-auto"
      style={{ borderColor: BUILDER.border, background: "#FAFAFA" }}
    >
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onSelect(tab)}
            className="px-3 py-2.5 text-[10px] font-bold tracking-wide whitespace-nowrap flex-shrink-0 border-b-2 transition-colors"
            style={{
              color: isActive ? BUILDER.orange : BUILDER.muted,
              borderBottomColor: isActive ? BUILDER.orange : "transparent",
              background: "transparent",
            }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

// ─── Tabs per section type ────────────────────────────────────────────────────

const SECTION_TABS: Record<string, string[]> = {
  hero: ["Copy", "Design", "Layout"],
  text: ["Content", "Layout"],
  contact: ["Info", "Layout"],
  features: ["Items", "Layout"],
  faq: ["Questions", "Layout"],
  testimonials: ["Quotes", "Layout"],
  "maylecor-home": ["Text", "Photos", "Social", "Layout"],
  "maylecor-music": ["Info", "Social", "Layout"],
  "legally-blonde-hero": ["Text", "Nav", "Assets", "Social", "Layers", "Layout"],
  "kdirection-home": ["Brand", "Media", "Nav", "Layout"],
  "kdirection-page": ["Content", "Nav", "Layout"],
  navigation: ["Links", "Layout"],
  footer: ["Content", "Layout"],
  gallery: ["Media", "Layout"],
  video: ["Videos", "Layout"],
  audio: ["Media", "Layout"],
  "editorial-hero": ["Copy", "Design", "Layout"],
  split: ["Copy", "Media", "Layout"],
  newsletter: ["Content", "Layout"],
  "email-popup": ["Settings", "Layout"],
  "announcement-bar": ["Content", "Design", "Layout"],
  marquee: ["Content", "Design", "Layout"],
  products: ["Content", "Layout"],
  map: ["Location", "Layout"],
  events: ["Events", "Layout"],
  whatsapp: ["Settings", "Layout"],
  "free-text": ["Content", "Layout"],
};

// ─── Section tab content ──────────────────────────────────────────────────────

type PageRef = { id: string; slug: string; title?: string; sort_order?: number };

type Props = {
  section: Section;
  projectId: string;
  pages: PageRef[];
  themeDisplayFont?: string;
  themeBodyFont?: string;
  onUpdateProps: (patch: Record<string, unknown>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function BuilderSectionInspector({
  section,
  projectId,
  pages,
  themeDisplayFont,
  themeBodyFont,
  onUpdateProps,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: Props) {
  const tabs = SECTION_TABS[section.section_type] ?? ["Layout"];
  const [activeTab, setActiveTab] = useState(tabs[0] ?? "Layout");

  // Reset tab when a different section is selected
  useEffect(() => {
    const nextTabs = SECTION_TABS[section.section_type] ?? ["Layout"];
    setActiveTab(nextTabs[0] ?? "Layout");
  }, [section.id, section.section_type]);

  const p = section.props;
  const up = onUpdateProps;

  return (
    <div className="flex flex-col">
      {/* ── Action row ── */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2.5 border-b" style={{ borderColor: BUILDER.border }}>
        <button
          type="button"
          className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
          style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink }}
          onClick={onMoveUp}
        >↑ Up</button>
        <button
          type="button"
          className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
          style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink }}
          onClick={onMoveDown}
        >↓ Down</button>
        <button
          type="button"
          className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
          style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink }}
          onClick={onDuplicate}
        >Duplicate</button>
        <button
          type="button"
          className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
          style={{ border: "1px solid #FECACA", color: "#B91C1C" }}
          onClick={() => {
            if (window.confirm(`Remove "${labelForSectionType(section.section_type)}" from this page?`)) {
              onDelete();
            }
          }}
        >Remove</button>
      </div>

      {/* ── Tab bar ── */}
      {tabs.length > 1 && (
        <TabBar tabs={tabs} active={activeTab} onSelect={setActiveTab} />
      )}

      {/* ── Tab content ── */}
      <div className="px-4 py-3 space-y-3">
        {activeTab === "Layout" ? (
          <BuilderSectionLayoutPanel
            props={p}
            onPatch={up}
          />
        ) : (
          <SectionContent
            section={section}
            projectId={projectId}
            pages={pages}
            themeDisplayFont={themeDisplayFont}
            themeBodyFont={themeBodyFont}
            activeTab={activeTab}
            onUpdateProps={up}
          />
        )}
      </div>
    </div>
  );
}

// ─── Per-section tab content renderer ────────────────────────────────────────

function SectionContent({
  section,
  projectId,
  pages,
  themeDisplayFont,
  themeBodyFont,
  activeTab,
  onUpdateProps,
}: {
  section: Section;
  projectId: string;
  pages: PageRef[];
  themeDisplayFont?: string;
  themeBodyFont?: string;
  activeTab: string;
  onUpdateProps: (patch: Record<string, unknown>) => void;
}) {
  const p = section.props;
  const up = onUpdateProps;
  const t = section.section_type;
  const namedPages = pages.map((pg) => ({ id: pg.id, slug: pg.slug, title: pg.title ?? pg.slug }));

  // ── hero ──────────────────────────────────────────────────────────────────
  if (t === "hero") {
    if (activeTab === "Copy") return (
      <div className="space-y-3">
        <PanelField label="Heading">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.heading ?? "")} onChange={(e) => up({ heading: e.target.value })} placeholder="Heading" />
        </PanelField>
        <PanelField label="Subheading">
          <textarea className={INPUT + " min-h-[60px]"} style={INPUT_STYLE} value={String(p.subheading ?? "")} onChange={(e) => up({ subheading: e.target.value })} placeholder="Subheading" />
        </PanelField>
        <div className="grid grid-cols-2 gap-2">
          <PanelField label="Heading font">
            <input className={INPUT} style={INPUT_STYLE} value={String(p.headingFontFamily ?? "")} onChange={(e) => up({ headingFontFamily: e.target.value || undefined })} placeholder="Site display font" />
          </PanelField>
          <PanelField label="Heading size · px">
            <input type="number" min={16} max={240} className={INPUT} style={INPUT_STYLE} value={Number(p.headingFontSizePx ?? 64)} onChange={(e) => up({ headingFontSizePx: Math.max(16, Math.min(240, Number(e.target.value) || 16)) })} />
          </PanelField>
          <PanelField label="Subheading font">
            <input className={INPUT} style={INPUT_STYLE} value={String(p.subheadingFontFamily ?? "")} onChange={(e) => up({ subheadingFontFamily: e.target.value || undefined })} placeholder="Site body font" />
          </PanelField>
          <PanelField label="Subheading size · px">
            <input type="number" min={10} max={96} className={INPUT} style={INPUT_STYLE} value={Number(p.subheadingFontSizePx ?? 18)} onChange={(e) => up({ subheadingFontSizePx: Math.max(10, Math.min(96, Number(e.target.value) || 10)) })} />
          </PanelField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PanelField label="Button text">
            <input className={INPUT} style={INPUT_STYLE} value={String(p.buttonLabel ?? "")} onChange={(e) => up({ buttonLabel: e.target.value })} placeholder="Button label" />
          </PanelField>
          <PanelField label="Button link">
            <input className={INPUT} style={INPUT_STYLE} value={String(p.buttonHref ?? "")} onChange={(e) => up({ buttonHref: e.target.value })} placeholder="/shop" />
          </PanelField>
        </div>
      </div>
    );
    if (activeTab === "Design") return (
      <div className="space-y-3">
        <SectionPhotoField projectId={projectId} label="Background image" value={String(p.image ?? "")} onChange={(url) => up({ image: url })} />
        <PanelField label="Image crop / focal point">
          <select className={INPUT} style={INPUT_STYLE} value={String(p.imagePosition ?? "50% 50%")} onChange={(e) => up({ imagePosition: e.target.value })}>
            <option value="50% 50%">Center</option>
            <option value="50% 20%">Top</option>
            <option value="50% 80%">Bottom</option>
            <option value="20% 50%">Left</option>
            <option value="80% 50%">Right</option>
          </select>
        </PanelField>
        <div className="grid grid-cols-2 gap-2">
          <PanelField label="Background color">
            <input type="color" className="h-8 w-full cursor-pointer rounded border-0 p-0" value={String(p.background ?? "#0A0A0A")} onChange={(e) => up({ background: e.target.value })} />
          </PanelField>
          <PanelField label="Text align">
            <select className={INPUT} style={INPUT_STYLE} value={String(p.align ?? "center")} onChange={(e) => up({ align: e.target.value })}>
              <option value="center">Center</option>
              <option value="left">Left</option>
            </select>
          </PanelField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PanelField label="Height">
            <select className={INPUT} style={INPUT_STYLE} value={String(p.minHeight ?? "80vh")} onChange={(e) => up({ minHeight: e.target.value })}>
              <option value="50vh">Half screen</option>
              <option value="70vh">Tall</option>
              <option value="80vh">Hero (80vh)</option>
              <option value="100vh">Full screen</option>
            </select>
          </PanelField>
          <PanelField label="Overlay">
            <input type="range" min={0} max={0.9} step={0.05} className="mt-2 w-full" value={Number(p.overlayOpacity ?? 0.42)} onChange={(e) => up({ overlayOpacity: Number(e.target.value) })} />
          </PanelField>
        </div>
      </div>
    );
  }

  // ── text ──────────────────────────────────────────────────────────────────
  if (t === "text" && activeTab === "Content") return (
    <div className="space-y-3">
      <PanelField label="Heading">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.heading ?? "")} onChange={(e) => up({ heading: e.target.value })} placeholder="Section heading" />
      </PanelField>
      <PanelField label="Body text">
        <textarea className={INPUT + " min-h-[80px]"} style={INPUT_STYLE} value={String(p.body ?? "")} onChange={(e) => up({ body: e.target.value })} placeholder="Write your content here" />
      </PanelField>
      <div className="grid grid-cols-2 gap-2">
        <PanelField label="Heading font">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.headingFontFamily ?? "")} onChange={(e) => up({ headingFontFamily: e.target.value || undefined })} placeholder="Site display font" />
        </PanelField>
        <PanelField label="Heading size · px">
          <input type="number" min={12} max={160} className={INPUT} style={INPUT_STYLE} value={Number(p.headingFontSizePx ?? 32)} onChange={(e) => up({ headingFontSizePx: Math.max(12, Math.min(160, Number(e.target.value) || 12)) })} />
        </PanelField>
        <PanelField label="Body font">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.bodyFontFamily ?? "")} onChange={(e) => up({ bodyFontFamily: e.target.value || undefined })} placeholder="Site body font" />
        </PanelField>
        <PanelField label="Body size · px">
          <input type="number" min={8} max={96} className={INPUT} style={INPUT_STYLE} value={Number(p.bodyFontSizePx ?? 16)} onChange={(e) => up({ bodyFontSizePx: Math.max(8, Math.min(96, Number(e.target.value) || 8)) })} />
        </PanelField>
      </div>
    </div>
  );

  // ── contact ───────────────────────────────────────────────────────────────
  if (t === "contact" && activeTab === "Info") return (
    <div className="space-y-3">
      <PanelField label="Section heading">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.heading ?? "")} onChange={(e) => up({ heading: e.target.value })} placeholder="Contact" />
      </PanelField>
      <PanelField label="Email">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.email ?? "")} onChange={(e) => up({ email: e.target.value })} placeholder="hello@example.com" />
      </PanelField>
      <PanelField label="Phone">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.phone ?? "")} onChange={(e) => up({ phone: e.target.value })} placeholder="+221 77 000 00 00" />
      </PanelField>
      <PanelField label="Address">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.address ?? "")} onChange={(e) => up({ address: e.target.value })} placeholder="Address or city" />
      </PanelField>
    </div>
  );

  // ── features ──────────────────────────────────────────────────────────────
  if (t === "features" && activeTab === "Items") return (
    <div className="space-y-3">
      <PanelField label="Section heading">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.heading ?? "")} onChange={(e) => up({ heading: e.target.value })} placeholder="Section heading" />
      </PanelField>
      {(Array.isArray(p.items) ? p.items : []).map((item: { title?: string; body?: string; image?: string; href?: string }, idx: number) => (
        <div key={idx} className="space-y-1.5 rounded-lg p-2" style={{ background: "#F4F2EC" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: BUILDER.muted }}>Item {idx + 1}</span>
            <button type="button" className="text-[10px] font-semibold" style={{ color: "#B91C1C" }} onClick={() => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items.splice(idx, 1); up({ items }); }}>Remove</button>
          </div>
          <input className="w-full text-sm rounded-lg px-2 py-1" style={{ border: "1px solid #DDE0F0" }} value={String(item?.title ?? "")} onChange={(e) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], title: e.target.value }; up({ items }); }} placeholder="Title" />
          <textarea className="w-full text-sm rounded-lg px-2 py-1 min-h-[60px]" style={{ border: "1px solid #DDE0F0" }} value={String(item?.body ?? "")} onChange={(e) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], body: e.target.value }; up({ items }); }} placeholder="Description" />
          <SectionPhotoField projectId={projectId} label="Image (optional)" value={String(item?.image ?? "")} onChange={(url) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], image: url }; up({ items }); }} />
          <input className="w-full text-sm rounded-lg px-2 py-1" style={{ border: "1px solid #DDE0F0" }} value={String(item?.href ?? "")} placeholder="Link (optional)" onChange={(e) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], href: e.target.value }; up({ items }); }} />
        </div>
      ))}
      <button type="button" className="text-[11px] font-semibold underline" onClick={() => { const items = [...(Array.isArray(p.items) ? p.items : []), { title: "New offer", body: "Describe this offer." }]; up({ items }); }}>+ Add item</button>
    </div>
  );

  // ── faq ───────────────────────────────────────────────────────────────────
  if (t === "faq" && activeTab === "Questions") return (
    <div className="space-y-3">
      <PanelField label="Section heading">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.heading ?? "")} onChange={(e) => up({ heading: e.target.value })} placeholder="Frequently asked questions" />
      </PanelField>
      {(Array.isArray(p.items) ? p.items : []).map((item: { question?: string; answer?: string }, idx: number) => (
        <div key={idx} className="space-y-1 rounded-lg p-2" style={{ background: "#F4F2EC" }}>
          <input className="w-full text-sm rounded-lg px-2 py-1" style={{ border: "1px solid #DDE0F0" }} value={String(item?.question ?? "")} onChange={(e) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], question: e.target.value }; up({ items }); }} placeholder="Question" />
          <textarea className="w-full text-sm rounded-lg px-2 py-1" style={{ border: "1px solid #DDE0F0" }} value={String(item?.answer ?? "")} onChange={(e) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], answer: e.target.value }; up({ items }); }} placeholder="Answer" />
        </div>
      ))}
      <button type="button" className="text-[11px] font-semibold underline" onClick={() => { const items = [...(Array.isArray(p.items) ? p.items : []), { question: "New question?", answer: "Write a clear answer." }]; up({ items }); }}>+ Add question</button>
    </div>
  );

  // ── testimonials ──────────────────────────────────────────────────────────
  if (t === "testimonials" && activeTab === "Quotes") return (
    <div className="space-y-3">
      <PanelField label="Section heading">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.heading ?? "")} onChange={(e) => up({ heading: e.target.value })} placeholder="What our customers say" />
      </PanelField>
      {(Array.isArray(p.items) ? p.items : []).map((item: { quote?: string; name?: string; role?: string; avatar?: string }, idx: number) => (
        <div key={idx} className="space-y-1.5 rounded-lg p-2" style={{ background: "#F4F2EC" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: BUILDER.muted }}>Quote {idx + 1}</span>
            <button type="button" className="text-[10px] font-semibold" style={{ color: "#B91C1C" }} onClick={() => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items.splice(idx, 1); up({ items }); }}>Remove</button>
          </div>
          <textarea className="w-full text-sm rounded-lg px-2 py-1 min-h-[70px]" style={{ border: "1px solid #DDE0F0" }} value={String(item?.quote ?? "")} onChange={(e) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], quote: e.target.value }; up({ items }); }} placeholder="Their words..." />
          <div className="grid grid-cols-2 gap-1">
            <input className="w-full text-sm rounded-lg px-2 py-1" style={{ border: "1px solid #DDE0F0" }} value={String(item?.name ?? "")} onChange={(e) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], name: e.target.value }; up({ items }); }} placeholder="Name" />
            <input className="w-full text-sm rounded-lg px-2 py-1" style={{ border: "1px solid #DDE0F0" }} value={String(item?.role ?? "")} onChange={(e) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], role: e.target.value }; up({ items }); }} placeholder="Role / location" />
          </div>
          <SectionPhotoField projectId={projectId} label="Photo (optional)" value={String(item?.avatar ?? "")} onChange={(url) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], avatar: url }; up({ items }); }} />
        </div>
      ))}
      <button type="button" className="text-[11px] font-semibold underline" onClick={() => { const items = [...(Array.isArray(p.items) ? p.items : []), { quote: "Amazing experience.", name: "Customer", role: "" }]; up({ items }); }}>+ Add quote</button>
    </div>
  );

  // ── navigation ────────────────────────────────────────────────────────────
  if (t === "navigation" && activeTab === "Links") return (
    <div className="space-y-2">
      <PanelField label="Brand name">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.brand ?? "")} onChange={(e) => up({ brand: e.target.value })} placeholder="Brand name" />
      </PanelField>
      <NavLinksEditor pages={namedPages} links={mapNavLinksForEditor((p.links as Parameters<typeof mapNavLinksForEditor>[0]) ?? [])} onChange={(links) => up({ links })} />
      <NavSizeEditor scale={clampNavScale(p.navScale, 1)} size={parseNavSize(p.navSize)} layout={parseNavLayout(p.navLayout)} logoAlign={(p.logoAlign as "left" | "center" | "right" | undefined) ?? "left"} onChange={up} />
    </div>
  );

  // ── footer ────────────────────────────────────────────────────────────────
  if (t === "footer" && activeTab === "Content") return (
    <div className="space-y-2">
      <PanelField label="Copyright text">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.text ?? "")} onChange={(e) => up({ text: e.target.value })} placeholder="© Your Brand · 2026" />
      </PanelField>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.orange }}>Footer links</p>
      <NavLinksEditor pages={namedPages} links={mapNavLinksForEditor((p.links as Parameters<typeof mapNavLinksForEditor>[0]) ?? [])} onChange={(links) => up({ links })} />
    </div>
  );

  // ── whatsapp ──────────────────────────────────────────────────────────────
  if (t === "whatsapp" && activeTab === "Settings") return (
    <div className="space-y-2">
      <PanelField label="WhatsApp number">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.phone ?? "")} onChange={(e) => up({ phone: e.target.value })} placeholder="+221 77 000 00 00" />
      </PanelField>
      <PanelField label="Button label">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.label ?? "")} onChange={(e) => up({ label: e.target.value })} placeholder="Chat on WhatsApp" />
      </PanelField>
    </div>
  );

  // ── map ───────────────────────────────────────────────────────────────────
  if (t === "map" && activeTab === "Location") return (
    <div className="space-y-2">
      <PanelField label="Address label">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.address ?? "")} onChange={(e) => up({ address: e.target.value })} placeholder="Dakar, Senegal" />
      </PanelField>
      <div className="grid grid-cols-2 gap-2">
        <PanelField label="Latitude">
          <input type="number" step="any" className={INPUT} style={INPUT_STYLE} value={Number(p.latitude ?? 0)} onChange={(e) => up({ latitude: Number(e.target.value) })} />
        </PanelField>
        <PanelField label="Longitude">
          <input type="number" step="any" className={INPUT} style={INPUT_STYLE} value={Number(p.longitude ?? 0)} onChange={(e) => up({ longitude: Number(e.target.value) })} />
        </PanelField>
      </div>
    </div>
  );

  // ── newsletter ────────────────────────────────────────────────────────────
  if (t === "newsletter" && activeTab === "Content") return (
    <div className="space-y-2">
      <PanelField label="Heading">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.heading ?? "")} onChange={(e) => up({ heading: e.target.value })} placeholder="Heading" />
      </PanelField>
      <PanelField label="Subheading">
        <textarea className={INPUT + " min-h-[60px]"} style={INPUT_STYLE} value={String(p.subheading ?? "")} onChange={(e) => up({ subheading: e.target.value })} placeholder="Subheading" />
      </PanelField>
      <PanelField label="Button label">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.buttonLabel ?? "")} onChange={(e) => up({ buttonLabel: e.target.value })} placeholder="Subscribe" />
      </PanelField>
    </div>
  );

  // ── email-popup ───────────────────────────────────────────────────────────
  if (t === "email-popup" && activeTab === "Settings") return (
    <div className="space-y-2">
      <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>Overlay on the live site. Emails save to your business list.</p>
      <label className="flex items-center gap-2 text-[11px]">
        <input type="checkbox" checked={p.enabled !== false} onChange={(e) => up({ enabled: e.target.checked })} />
        Show popup
      </label>
      <PanelField label="Mode">
        <select className={INPUT} style={INPUT_STYLE} value={String(p.mode ?? "both")} onChange={(e) => up({ mode: e.target.value })}>
          <option value="both">Email + consent</option>
          <option value="email">Email only</option>
          <option value="consent">Consent only</option>
        </select>
      </PanelField>
      <PanelField label="Heading">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.heading ?? "")} onChange={(e) => up({ heading: e.target.value })} placeholder="Heading" />
      </PanelField>
      <PanelField label="Body">
        <textarea className={INPUT + " min-h-[60px]"} style={INPUT_STYLE} value={String(p.body ?? "")} onChange={(e) => up({ body: e.target.value })} placeholder="Body" />
      </PanelField>
      <PanelField label="Consent text">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.consentLabel ?? "")} onChange={(e) => up({ consentLabel: e.target.value })} placeholder="I agree to receive emails" />
      </PanelField>
      <div className="grid grid-cols-2 gap-2">
        <PanelField label="Delay (sec)">
          <input type="number" min={0} max={60} className={INPUT} style={INPUT_STYLE} value={Number(p.delaySeconds ?? 4)} onChange={(e) => up({ delaySeconds: Number(e.target.value) })} />
        </PanelField>
        <PanelField label="Remind (days)">
          <input type="number" min={0} max={365} className={INPUT} style={INPUT_STYLE} value={Number(p.remindAfterDays ?? 14)} onChange={(e) => up({ remindAfterDays: Number(e.target.value) })} />
        </PanelField>
      </div>
    </div>
  );

  // ── events ────────────────────────────────────────────────────────────────
  if (t === "events" && activeTab === "Events") return (
    <div className="space-y-2">
      {(Array.isArray(p.items) ? p.items : []).map((item: { title?: string; date?: string; location?: string; description?: string; ticketUrl?: string }, idx: number) => (
        <div key={idx} className="space-y-1.5 rounded-lg p-2" style={{ background: "#F4F2EC" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: BUILDER.muted }}>Event {idx + 1}</span>
            <button type="button" className="text-[10px] font-semibold" style={{ color: "#B91C1C" }} onClick={() => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items.splice(idx, 1); up({ items }); }}>Remove</button>
          </div>
          <input className="w-full text-sm rounded-lg px-2 py-1" style={{ border: "1px solid #DDE0F0" }} value={String(item?.title ?? "")} onChange={(e) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], title: e.target.value }; up({ items }); }} placeholder="Event name" />
          <input type="date" className="w-full text-sm rounded-lg px-2 py-1" style={{ border: "1px solid #DDE0F0" }} value={String(item?.date ?? "")} onChange={(e) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], date: e.target.value }; up({ items }); }} />
          <input className="w-full text-sm rounded-lg px-2 py-1" style={{ border: "1px solid #DDE0F0" }} value={String(item?.location ?? "")} onChange={(e) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], location: e.target.value }; up({ items }); }} placeholder="Location" />
          <input className="w-full text-sm rounded-lg px-2 py-1" style={{ border: "1px solid #DDE0F0" }} value={String(item?.ticketUrl ?? "")} onChange={(e) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], ticketUrl: e.target.value }; up({ items }); }} placeholder="Ticket link" />
        </div>
      ))}
      <button type="button" className="text-[11px] font-semibold underline" onClick={() => { const items = [...(Array.isArray(p.items) ? p.items : []), { title: "New event", date: "2026-01-01", location: "", description: "", ticketUrl: "" }]; up({ items }); }}>+ Add event</button>
    </div>
  );

  // ── free-text ─────────────────────────────────────────────────────────────
  if (t === "free-text" && activeTab === "Content") return (
    <BuilderFreeTextEditor
      blocks={(Array.isArray(p.blocks) ? p.blocks : []) as FreeTextBlock[]}
      themeDisplayFont={themeDisplayFont}
      themeBodyFont={themeBodyFont}
      onChange={(blocks) => up({ blocks })}
    />
  );

  // ── gallery ───────────────────────────────────────────────────────────────
  if (t === "gallery" && activeTab === "Media") return (
    <div className="space-y-2">
      <PanelField label="Layout">
        <select className={INPUT} style={INPUT_STYLE} value={String(p.layout ?? "grid")} onChange={(e) => up({ layout: e.target.value as "grid" | "single" | "featured" })}>
          <option value="grid">Grid</option>
          <option value="single">One photo (full width)</option>
          <option value="featured">Featured + grid</option>
        </select>
      </PanelField>
      <PanelField label="Columns">
        <select className={INPUT} style={INPUT_STYLE} value={String(p.columns ?? 3)} onChange={(e) => up({ columns: Number(e.target.value) as 1 | 2 | 3 })}>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </PanelField>
      {(Array.isArray(p.items) ? p.items : []).map((item: { src?: string; alt?: string }, idx: number) => (
        <div key={idx} className="space-y-1 rounded-lg p-2" style={{ background: BUILDER.surfaceMuted }}>
          <SectionPhotoField projectId={projectId} label={`Photo ${idx + 1}`} value={String(item?.src ?? "")} onChange={(url) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], src: url, alt: (items[idx] as { alt?: string })?.alt ?? "" }; up({ items }); }} />
          <input className="w-full text-xs rounded-lg px-2 py-1" style={{ border: "1px solid #DDE0F0" }} placeholder="Caption (optional)" value={String(item?.alt ?? "")} onChange={(e) => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items[idx] = { ...items[idx], src: (items[idx] as { src?: string })?.src ?? "", alt: e.target.value }; up({ items }); }} />
          <button type="button" className="text-[10px] text-red-600" onClick={() => { const items = [...(Array.isArray(p.items) ? p.items : [])]; items.splice(idx, 1); up({ items }); }}>Remove photo</button>
        </div>
      ))}
      <button type="button" className="text-[11px] font-semibold underline" style={{ color: BUILDER.orange }} onClick={() => { const items = [...(Array.isArray(p.items) ? p.items : []), { src: "", alt: "" }]; up({ items }); }}>+ Add photo</button>
    </div>
  );

  // ── video ─────────────────────────────────────────────────────────────────
  if (t === "video" && activeTab === "Videos") {
    const videoItems =
      (p.items as { src?: string; title?: string; caption?: string; thumbnail?: string }[]) ??
      (p.src ? [{ src: String(p.src), title: String(p.title ?? ""), caption: String(p.caption ?? ""), thumbnail: String(p.thumbnail ?? "") }] : []);
    return (
      <div className="space-y-2">
        <PanelField label="Heading">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.heading ?? "")} onChange={(e) => up({ heading: e.target.value })} placeholder="Videos" />
        </PanelField>
        <PanelField label="Layout">
          <select className={INPUT} style={INPUT_STYLE} value={String(p.layout ?? "grid")} onChange={(e) => up({ layout: e.target.value as "grid" | "single" | "featured" })}>
            <option value="grid">Grid thumbnails</option>
            <option value="single">One video (full width)</option>
            <option value="featured">Featured + grid</option>
          </select>
        </PanelField>
        <PanelField label="Columns">
          <select className={INPUT} style={INPUT_STYLE} value={String(p.columns ?? 2)} onChange={(e) => up({ columns: Number(e.target.value) as 1 | 2 | 3 })}>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </PanelField>
        {videoItems.map((item, idx) => (
          <div key={idx} className="space-y-1 rounded-lg p-2" style={{ border: "1px solid #EEE" }}>
            <input className="w-full text-xs rounded px-2 py-1" style={{ border: "1px solid #DDE0F0" }} placeholder="Title" value={item.title ?? ""} onChange={(e) => { const next = [...videoItems]; next[idx] = { ...next[idx]!, title: e.target.value }; up({ items: next, src: next[0]?.src ?? "" }); }} />
            <input className="w-full text-xs rounded px-2 py-1" style={{ border: "1px solid #DDE0F0" }} placeholder="YouTube / Vimeo URL" value={item.src ?? ""} onChange={(e) => { const next = [...videoItems]; next[idx] = { ...next[idx]!, src: e.target.value }; up({ items: next, src: next[0]?.src ?? "" }); }} />
            <SiteMediaUpload projectId={projectId} kind="video" value={String(item.src ?? "")} onChange={(src) => { const next = [...videoItems]; next[idx] = { ...next[idx]!, src }; up({ items: next, src: next[0]?.src ?? "" }); }} label="Or upload video file" />
            <SectionPhotoField projectId={projectId} label="Custom thumbnail (optional)" value={String(item.thumbnail ?? "")} onChange={(url) => { const next = [...videoItems]; next[idx] = { ...next[idx]!, thumbnail: url }; up({ items: next }); }} />
            <button type="button" className="text-[10px] font-bold uppercase text-red-600" onClick={() => { const next = videoItems.filter((_, i) => i !== idx); up({ items: next, src: next[0]?.src ?? "" }); }}>Remove video</button>
          </div>
        ))}
        <button type="button" className="w-full rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: "#0F0D33" }} onClick={() => { const next = [...(videoItems), { src: "", title: `Video ${videoItems.length + 1}`, caption: "", thumbnail: "" }]; up({ items: next }); }}>+ Add video</button>
      </div>
    );
  }

  // ── audio ─────────────────────────────────────────────────────────────────
  if (t === "audio" && activeTab === "Media") return (
    <div className="space-y-2">
      <SiteMediaUpload projectId={projectId} kind="audio" value={String(p.src ?? "")} onChange={(src) => up({ src })} label="Music file from your computer" />
      <PanelField label="Or paste MP3 URL">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.src ?? "")} onChange={(e) => up({ src: e.target.value })} placeholder="https://…" />
      </PanelField>
      <PanelField label="Track title">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.title ?? "")} onChange={(e) => up({ title: e.target.value })} placeholder="Track title" />
      </PanelField>
      <PanelField label="Artist name">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.artist ?? "")} onChange={(e) => up({ artist: e.target.value })} placeholder="Artist name" />
      </PanelField>
    </div>
  );

  // ── products ──────────────────────────────────────────────────────────────
  if (t === "products" && activeTab === "Content") return (
    <div className="space-y-3">
      <PanelField label="Heading">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.heading ?? "")} onChange={(e) => up({ heading: e.target.value })} placeholder="Our products" />
      </PanelField>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.faint }}>Shop layout</p>
      <div className="grid grid-cols-2 gap-1.5">
        {(["grid", "grid-dense", "list", "featured"] as const).map((id) => {
          const on = String(p.layout ?? "grid") === id;
          return <button key={id} type="button" onClick={() => up({ layout: id })} className="rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ background: on ? BUILDER.ink : BUILDER.surfaceMuted, color: on ? "#fff" : BUILDER.ink, border: `1px solid ${BUILDER.border}` }} aria-pressed={on}>{id === "grid-dense" ? "Dense" : id.charAt(0).toUpperCase() + id.slice(1)}</button>;
        })}
      </div>
      {String(p.layout ?? "grid") !== "list" && (
        <div className="flex gap-1.5">
          {([2, 3, 4] as const).map((n) => {
            const on = Number(p.columns ?? 3) === n;
            return <button key={n} type="button" onClick={() => up({ columns: n })} className="flex-1 rounded-lg py-2 text-[11px] font-bold" style={{ background: on ? BUILDER.ink : BUILDER.surfaceMuted, color: on ? "#fff" : BUILDER.ink, border: `1px solid ${BUILDER.border}` }} aria-pressed={on}>{n}</button>;
          })}
        </div>
      )}
      <PanelField label="Order button label">
        <input className={INPUT} style={INPUT_STYLE} value={String(p.orderCtaLabel ?? "Place order")} onChange={(e) => up({ orderCtaLabel: e.target.value })} />
      </PanelField>
      <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>Catalog lives in <Link href={`/shop/${projectId}?tab=products`} className="font-bold underline" style={{ color: "#FF5500" }}>Kebu Shop → Products</Link>.</p>
      <Link href={`/shop/${projectId}?tab=products`} className="inline-block rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: "#FF5500" }}>Manage products in Shop</Link>
    </div>
  );

  // ── announcement-bar ──────────────────────────────────────────────────────
  if (t === "announcement-bar") {
    if (activeTab === "Content") return (
      <div className="space-y-2">
        <PanelField label="Text">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.text ?? "")} onChange={(e) => up({ text: e.target.value })} placeholder="Free shipping on orders over 10,000 XOF" />
        </PanelField>
        <PanelField label="Link (optional)">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.link ?? "")} onChange={(e) => up({ link: e.target.value })} placeholder="/shop" />
        </PanelField>
      </div>
    );
    if (activeTab === "Design") return (
      <div className="grid grid-cols-2 gap-2">
        <PanelField label="Background">
          <input type="color" className="h-8 w-full cursor-pointer rounded border-0 p-0" value={String(p.background ?? "#0A0A0A")} onChange={(e) => up({ background: e.target.value })} />
        </PanelField>
        <PanelField label="Text color">
          <input type="color" className="h-8 w-full cursor-pointer rounded border-0 p-0" value={String(p.color ?? "#ffffff")} onChange={(e) => up({ color: e.target.value })} />
        </PanelField>
      </div>
    );
  }

  // ── marquee ───────────────────────────────────────────────────────────────
  if (t === "marquee") {
    if (activeTab === "Content") return (
      <div className="space-y-2">
        <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>Scrolling text strip. One item per line.</p>
        <PanelField label="Items (one per line)">
          <textarea className={INPUT + " min-h-[80px]"} style={INPUT_STYLE} value={(Array.isArray(p.items) ? p.items : []).join("\n")} onChange={(e) => { const items = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean); up({ items }); }} placeholder={"New arrivals\nShop now\nFree delivery"} />
        </PanelField>
        <PanelField label="Separator">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.separator ?? " · ")} onChange={(e) => up({ separator: e.target.value })} placeholder=" · " />
        </PanelField>
      </div>
    );
    if (activeTab === "Design") return (
      <div className="grid grid-cols-2 gap-2">
        <PanelField label="Background">
          <input type="color" className="h-8 w-full cursor-pointer rounded border-0 p-0" value={String(p.background ?? "#0A0A0A")} onChange={(e) => up({ background: e.target.value })} />
        </PanelField>
        <PanelField label="Text color">
          <input type="color" className="h-8 w-full cursor-pointer rounded border-0 p-0" value={String(p.color ?? "#ffffff")} onChange={(e) => up({ color: e.target.value })} />
        </PanelField>
      </div>
    );
  }

  // ── split ─────────────────────────────────────────────────────────────────
  if (t === "split") {
    if (activeTab === "Copy") return (
      <div className="space-y-2">
        <PanelField label="Heading">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.heading ?? "")} onChange={(e) => up({ heading: e.target.value })} placeholder="Heading" />
        </PanelField>
        <PanelField label="Body text">
          <textarea className={INPUT + " min-h-[80px]"} style={INPUT_STYLE} value={String(p.body ?? "")} onChange={(e) => up({ body: e.target.value })} placeholder="Body text" />
        </PanelField>
        <div className="grid grid-cols-2 gap-2">
          <PanelField label="Button">
            <input className={INPUT} style={INPUT_STYLE} value={String(p.buttonLabel ?? "")} onChange={(e) => up({ buttonLabel: e.target.value })} placeholder="Button" />
          </PanelField>
          <PanelField label="Link">
            <input className={INPUT} style={INPUT_STYLE} value={String(p.buttonHref ?? "")} onChange={(e) => up({ buttonHref: e.target.value })} placeholder="/shop" />
          </PanelField>
        </div>
      </div>
    );
    if (activeTab === "Media") return (
      <div className="space-y-2">
        <SectionPhotoField projectId={projectId} label="Photo" value={String(p.image ?? "")} onChange={(url) => up({ image: url })} />
        <PanelField label="Image side">
          <select className={INPUT} style={INPUT_STYLE} value={String(p.imagePosition ?? "left")} onChange={(e) => up({ imagePosition: e.target.value })}>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </PanelField>
      </div>
    );
  }

  // ── editorial-hero ────────────────────────────────────────────────────────
  if (t === "editorial-hero") {
    if (activeTab === "Copy") return (
      <div className="space-y-2">
        <PanelField label="Headline">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.heading ?? "")} onChange={(e) => up({ heading: e.target.value })} placeholder="Headline" />
        </PanelField>
        <PanelField label="Subheading">
          <textarea className={INPUT + " min-h-[60px]"} style={INPUT_STYLE} value={String(p.subheading ?? "")} onChange={(e) => up({ subheading: e.target.value })} placeholder="Subheading" />
        </PanelField>
        <div className="grid grid-cols-2 gap-2">
          <PanelField label="Button label">
            <input className={INPUT} style={INPUT_STYLE} value={String(p.buttonLabel ?? "")} onChange={(e) => up({ buttonLabel: e.target.value })} placeholder="Button" />
          </PanelField>
          <PanelField label="Button link">
            <input className={INPUT} style={INPUT_STYLE} value={String(p.buttonHref ?? "")} onChange={(e) => up({ buttonHref: e.target.value })} placeholder="/shop" />
          </PanelField>
        </div>
      </div>
    );
    if (activeTab === "Design") return (
      <div className="space-y-2">
        <SectionPhotoField projectId={projectId} label="Background image" value={String(p.image ?? "")} onChange={(url) => up({ image: url })} />
        <div className="grid grid-cols-2 gap-2">
          <PanelField label="Height">
            <select className={INPUT} style={INPUT_STYLE} value={String(p.minHeight ?? "70vh")} onChange={(e) => up({ minHeight: e.target.value })}>
              <option value="50vh">Half screen</option>
              <option value="70vh">Tall</option>
              <option value="88vh">Very tall</option>
              <option value="100vh">Full screen</option>
            </select>
          </PanelField>
          <PanelField label="Align">
            <select className={INPUT} style={INPUT_STYLE} value={String(p.align ?? "left")} onChange={(e) => up({ align: e.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
            </select>
          </PanelField>
        </div>
        <PanelField label="Overlay darkness">
          <input type="range" min={0} max={0.9} step={0.05} className="mt-2 w-full" value={Number(p.overlayOpacity ?? 0.35)} onChange={(e) => up({ overlayOpacity: Number(e.target.value) })} />
        </PanelField>
      </div>
    );
  }

  // ── maylecor-home ─────────────────────────────────────────────────────────
  if (t === "maylecor-home") {
    if (activeTab === "Text") return (
      <div className="space-y-3">
        <PanelField label="Artist name">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.artistName ?? "")} onChange={(e) => up({ artistName: e.target.value })} placeholder="MAY LECOR" />
        </PanelField>
        <PanelField label="CTA button" hint="Text shown on the call-to-action button">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.ctaLabel ?? "")} onChange={(e) => up({ ctaLabel: e.target.value })} placeholder="Listen now" />
        </PanelField>
      </div>
    );
    if (activeTab === "Photos") return (
      <div className="space-y-2">
        {(["backgroundImage", "portraitMain", "collageTop", "collageMiddle", "logoBanner", "bottomLeft", "bottomRight", "logoSmall"] as const).map((key) => {
          const labels: Record<string, string> = { backgroundImage: "Background", portraitMain: "Main portrait", collageTop: "Collage top", collageMiddle: "Collage middle", logoBanner: "Logo banner", bottomLeft: "Bottom left photo", bottomRight: "Bottom right photo", logoSmall: "Small logo" };
          return <SectionPhotoField key={key} projectId={projectId} label={labels[key] ?? key} value={String(p[key] ?? "")} onChange={(url) => up({ [key]: url })} />;
        })}
        <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
          <input type="checkbox" checked={p.motionEnabled !== false} onChange={(e) => up({ motionEnabled: e.target.checked })} />
          Floating motion (cutouts + parallax)
        </label>
      </div>
    );
    if (activeTab === "Social") return (
      <SocialLinksEditor
        projectId={projectId}
        links={((p.socialLinks as { label?: string; href?: string; iconUrl?: string }[]) ?? []).map((l) => ({ label: String(l.label ?? ""), href: String(l.href ?? ""), iconUrl: String(l.iconUrl ?? "") }))}
        onChange={(socialLinks) => up({ socialLinks })}
        rail={{ visible: p.socialRailVisible !== false, bgColor: String(p.socialRailBg ?? "rgba(0,0,0,0.85)"), leftPct: Number(p.socialRailLeftPct ?? 0), topPct: Number(p.socialRailTopPct ?? 12), iconSize: Number(p.socialRailIconSize ?? 40) }}
        onRailChange={up}
      />
    );
  }

  // ── maylecor-music ────────────────────────────────────────────────────────
  if (t === "maylecor-music") {
    if (activeTab === "Info") return (
      <div className="space-y-3">
        <PanelField label="Artist name">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.artistName ?? "")} onChange={(e) => up({ artistName: e.target.value })} placeholder="Artist name" />
        </PanelField>
        <SectionPhotoField projectId={projectId} label="Album art" value={String(p.albumArt ?? "")} onChange={(url) => up({ albumArt: url })} />
        <PanelField label="Footer text">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.footerText ?? "")} onChange={(e) => up({ footerText: e.target.value })} placeholder="© 2026 Artist Name" />
        </PanelField>
      </div>
    );
    if (activeTab === "Social") return (
      <div className="space-y-2">
        <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>Social / music links for the page.</p>
        <SocialLinksEditor
          projectId={projectId}
          links={((p.socialLinks as { label?: string; href?: string; iconUrl?: string }[]) ?? []).map((l) => ({ label: String(l.label ?? ""), href: String(l.href ?? ""), iconUrl: String(l.iconUrl ?? "") }))}
          onChange={(socialLinks) => up({ socialLinks })}
          rail={{ visible: p.socialRailVisible !== false, bgColor: String(p.socialRailBg ?? "rgba(0,0,0,0.85)"), leftPct: Number(p.socialRailLeftPct ?? 0), topPct: Number(p.socialRailTopPct ?? 12), iconSize: Number(p.socialRailIconSize ?? 40) }}
          onRailChange={up}
        />
        <NavLinksEditor pages={namedPages} links={mapNavLinksForEditor((p.navLinks as Parameters<typeof mapNavLinksForEditor>[0]) ?? [])} onChange={(navLinks) => up({ navLinks })} />
        <NavSizeEditor scale={clampNavScale(p.navScale, 1)} size={parseNavSize(p.navSize)} layout={parseNavLayout(p.navLayout)} logoAlign={(p.logoAlign as "left" | "center" | "right" | undefined) ?? "left"} onChange={up} />
      </div>
    );
  }

  // ── legally-blonde-hero ───────────────────────────────────────────────────
  if (t === "legally-blonde-hero") {
    if (activeTab === "Text") return (
      <div className="space-y-2">
        <button type="button" className="w-full rounded-lg px-2 py-1.5 text-[11px] font-semibold" style={{ border: "1px solid #FF5500", color: "#FF5500" }} onClick={() => up({ ...defaultMaylecorKsendrProps(String(p.title ?? p.brandLabel ?? "MAY LECOR")) })}>Restore May circle + cutouts</button>
        <PanelField label="Artist / brand name">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.title ?? "")} onChange={(e) => up({ title: e.target.value, brandLabel: e.target.value })} placeholder="Artist or brand name" />
        </PanelField>
        <PanelField label="Subtitle" hint="Short bio or tagline shown below the name">
          <textarea className={INPUT + " min-h-[60px]"} style={INPUT_STYLE} value={String(p.subtitle ?? "")} onChange={(e) => up({ subtitle: e.target.value })} placeholder="Short bio or tagline" />
        </PanelField>
        <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>Center mark uses the May Lècor circle seal. Swap cutouts in Assets tab or on the canvas.</p>
      </div>
    );
    if (activeTab === "Nav") return (
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: "#FF5500" }}>Top bar logo</p>
        <label className="flex items-center gap-2 text-[11px] font-semibold">
          <input type="checkbox" checked={p.showChromeLogo !== false} onChange={(e) => up({ showChromeLogo: e.target.checked })} />
          Show small May logo in the upper bar
        </label>
        {p.showChromeLogo !== false && (
          <SectionPhotoField projectId={projectId} label="Upper logo (optional)" value={String(p.chromeLogo ?? "")} onChange={(url) => up({ chromeLogo: url })} />
        )}
        <PanelField label="Nav look">
          <select className={INPUT} style={INPUT_STYLE} value={String(p.navDisplay ?? "text")} onChange={(e) => up({ navDisplay: e.target.value as "text" | "icons" | "photos" })}>
            <option value="text">Words</option>
            <option value="icons">Built-in icons</option>
            <option value="photos">Photos / custom icons</option>
          </select>
        </PanelField>
        <NavLinksEditor projectId={projectId} allowIcons pages={namedPages} links={mapNavLinksForEditor((p.navLinks as Parameters<typeof mapNavLinksForEditor>[0]) ?? [])} onChange={(navLinks) => up({ navLinks })} />
        <NavSizeEditor scale={clampNavScale(p.navScale, 1)} size={parseNavSize(p.navSize)} layout={parseNavLayout(p.navLayout)} logoAlign={(p.logoAlign as "left" | "center" | "right" | undefined) ?? "left"} onChange={up} />
        <PanelField label="Display font" hint="Steelfish is recommended for the artist name">
          <select className={INPUT} style={INPUT_STYLE} value={String(p.displayFont ?? "Steelfish")} onChange={(e) => up({ displayFont: e.target.value })}>
            {["Steelfish", "Oswald", "Bebas Neue", "Playfair Display", "Fraunces", "Syne", "Georgia", "system-ui"].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </PanelField>
      </div>
    );
    if (activeTab === "Assets") return (
      <div className="space-y-2">
        <p className="text-[10px] leading-relaxed" style={{ color: "#6B5B45" }}>Remove background = solid accent color. Replace cutouts on the canvas or upload below.</p>
        <div className="space-y-2 rounded-lg p-2" style={{ border: "1px solid #EEE" }}>
          <SectionPhotoField projectId={projectId} label="Background" value={p.backgroundHidden === true ? "" : String(p.backgroundLayer ?? "")} onChange={(url) => { if (!url.trim()) { const hl = Array.isArray(p.hiddenLayers) ? [...(p.hiddenLayers as string[])] : []; if (!hl.includes("backgroundLayer")) hl.push("backgroundLayer"); up({ backgroundLayer: "", backgroundHidden: true, hiddenLayers: hl }); return; } const hl = Array.isArray(p.hiddenLayers) ? (p.hiddenLayers as string[]).filter((x) => x !== "backgroundLayer") : []; up({ backgroundLayer: url, backgroundHidden: false, hiddenLayers: hl }); }} />
          <button type="button" className="w-full rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ border: "1px solid #DDE0F0", color: BUILDER.ink }} onClick={() => { const hl = Array.isArray(p.hiddenLayers) ? [...(p.hiddenLayers as string[])] : []; if (!hl.includes("backgroundLayer")) hl.push("backgroundLayer"); up({ backgroundLayer: "", backgroundHidden: true, hiddenLayers: hl }); }}>Remove background</button>
        </div>
        {(["titleLogo", "cutoutLeft", "cutoutRight", "cutoutAccent", "cutoutSparkle", "macbook", "heroPhoto"] as const).map((key) => {
          const labels: Record<string, string> = { titleLogo: "Circle seal / logo", cutoutLeft: "Cutout left (transparent PNG)", cutoutRight: "Cutout right (transparent PNG)", cutoutAccent: "Center cutout portrait", cutoutSparkle: "Sparkle / small accent", macbook: "Laptop / album mockup", heroPhoto: "Story photo" };
          return <SectionPhotoField key={key} projectId={projectId} label={labels[key] ?? key} value={String(p[key] ?? "")} onChange={(url) => up({ [key]: url })} />;
        })}
        <button type="button" className="w-full rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: "#0F0D33" }} onClick={() => { const existing = (p.extraCutouts as Record<string, unknown>[]) ?? []; up({ extraCutouts: [...existing, { id: `cut-${Date.now()}`, src: String(p.cutoutAccent ?? p.cutoutLeft ?? ""), alt: "My cutout", topPct: 28, leftPct: 35, widthPct: 14, rotate: -6, zIndex: 14 }] }); }}>+ Add my cutout (drag on preview)</button>
        {((p.extraCutouts as { id?: string; src?: string }[]) ?? []).map((cut, idx) => (
          <div key={cut.id ?? idx} className="space-y-1 rounded-lg p-2" style={{ border: "1px solid #EEE" }}>
            <SectionPhotoField projectId={projectId} label={`Extra cutout ${idx + 1}`} value={String(cut.src ?? "")} onChange={(url) => { const next = [...((p.extraCutouts as typeof cut[]) ?? [])]; next[idx] = { ...next[idx]!, src: url }; up({ extraCutouts: next }); }} />
            <input className="w-full text-xs rounded px-2 py-1" style={{ border: "1px solid #DDE0F0" }} value={String((cut as { href?: string }).href ?? "")} placeholder="Link when photo is clicked" onChange={(e) => { const next = [...((p.extraCutouts as typeof cut[]) ?? [])]; next[idx] = { ...next[idx]!, href: e.target.value } as typeof cut; up({ extraCutouts: next }); }} />
            <button type="button" className="text-[10px] font-bold uppercase text-red-600" onClick={() => { const next = ((p.extraCutouts as typeof cut[]) ?? []).filter((_, i) => i !== idx); up({ extraCutouts: next }); }}>Delete</button>
          </div>
        ))}
        <PanelField label="Accent color">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.accentColor ?? "#FF1493")} onChange={(e) => up({ accentColor: e.target.value })} />
        </PanelField>
        <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
          <input type="checkbox" checked={p.motionEnabled !== false} onChange={(e) => up({ motionEnabled: e.target.checked })} />
          Floating cutout animation
        </label>
        <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
          <input type="checkbox" checked={p.scrollMode !== "parallax"} onChange={(e) => up({ scrollMode: e.target.checked ? "viewport" : "parallax" })} />
          One-screen home (off = full scroll scene)
        </label>
      </div>
    );
    if (activeTab === "Social") return (
      <div className="space-y-2">
        <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>Add, remove, reorder, and set links only here. On the canvas you can drag the rail — not edit icons.</p>
        <SocialLinksEditor projectId={projectId} links={((p.socialLinks as { label?: string; href?: string; iconUrl?: string }[]) ?? []).map((l) => ({ label: String(l.label ?? ""), href: String(l.href ?? ""), iconUrl: String(l.iconUrl ?? "") }))} onChange={(socialLinks) => up({ socialLinks })} rail={{ visible: p.socialRailVisible !== false, bgColor: String(p.socialRailBg ?? "rgba(0,0,0,0.85)"), leftPct: Number(p.socialRailLeftPct ?? 0), topPct: Number(p.socialRailTopPct ?? 12), iconSize: Number(p.socialRailIconSize ?? 40) }} onRailChange={up} />
      </div>
    );
    if (activeTab === "Layers") {
      const zMap = (p.layerZIndex as Record<string, number>) ?? {};
      const linkMap = (p.layerLinks as Record<string, string>) ?? {};
      const layers = [
        ...((p.titleLogo || p.titleAsText) ? [{ key: "titleLogo", label: "Name circle" }] : []),
        ...["cutoutLeft", "cutoutRight", "cutoutAccent", "heroPhoto", "macbook"].filter((k) => String(p[k] ?? "").trim()).map((k) => ({ key: k, label: k.replace(/([A-Z])/g, " $1").trim() })),
        ...(((p.extraCutouts as { id?: string; alt?: string }[]) ?? []).map((c, i) => ({ key: String(c.id ?? `extra-${i}`), label: c.alt?.trim() || `Extra photo ${i + 1}` })) as { key: string; label: string }[]),
      ];
      return (
        <div className="space-y-2">
          <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>Bring forward or send back — order saves with your draft. Links for each photo are below.</p>
          <ul className="space-y-1.5">
            {layers.map((layer) => {
              const hasExplicitZ = typeof zMap[layer.key] === "number";
              const z = hasExplicitZ ? zMap[layer.key]! : null;
              return (
                <li key={layer.key} className="rounded-md px-2 py-1.5" style={{ background: BUILDER.surfaceMuted, border: `1px solid ${BUILDER.border}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] font-medium">{layer.label}</span>
                    <span className="text-[9px] tabular-nums" style={{ color: BUILDER.muted }}>{z !== null ? `z${z}` : "auto"}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <button type="button" className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ border: `1px solid ${BUILDER.border}` }} onClick={() => { const next = z !== null ? Math.min(80, z + 10) : 80; const layerZIndex = { ...zMap, [layer.key]: next }; const extras = ((p.extraCutouts as { id?: string; zIndex?: number }[]) ?? []).map((c) => c.id === layer.key ? { ...c, zIndex: Math.min(40, next) } : c); up({ layerZIndex, ...(extras.length ? { extraCutouts: extras } : {}) }); }}>Front</button>
                    <button type="button" className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ border: `1px solid ${BUILDER.border}` }} onClick={() => { const next = z !== null ? Math.max(1, z - 10) : 1; const layerZIndex = { ...zMap, [layer.key]: next }; const extras = ((p.extraCutouts as { id?: string; zIndex?: number }[]) ?? []).map((c) => c.id === layer.key ? { ...c, zIndex: Math.min(40, next) } : c); up({ layerZIndex, ...(extras.length ? { extraCutouts: extras } : {}) }); }}>Back</button>
                  </div>
                  <input className="mt-1 w-full rounded px-1.5 py-1 text-[10px]" style={{ border: `1px solid ${BUILDER.border}` }} placeholder="Link — /shop or https://…" value={String(linkMap[layer.key] ?? "")} onChange={(e) => { const layerLinks = { ...linkMap, [layer.key]: e.target.value }; if (!e.target.value.trim()) { const { [layer.key]: _, ...rest } = linkMap; up({ layerLinks: rest }); return; } up({ layerLinks }); }} />
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
  }

  // ── kdirection-home ───────────────────────────────────────────────────────
  if (t === "kdirection-home") {
    if (activeTab === "Brand") return (
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>Wix K-Direction style — drag photos on the canvas</p>
        <SectionPhotoField projectId={projectId} label="Your logo (optional)" value={String(p.logoImage ?? "")} onChange={(url) => up({ logoImage: url })} />
        <PanelField label="Brand letter">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.brandLine1 ?? "K")} onChange={(e) => up({ brandLine1: e.target.value })} placeholder="K" />
        </PanelField>
        <PanelField label="Brand word">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.brandLine2 ?? "DIRECTION")} onChange={(e) => up({ brandLine2: e.target.value })} placeholder="DIRECTION" />
        </PanelField>
        <PanelField label="Mission" hint="Short line shown under the logo">
          <textarea className={INPUT} style={INPUT_STYLE} rows={2} value={String(p.mission ?? "")} onChange={(e) => up({ mission: e.target.value })} placeholder="Mission / short line" />
        </PanelField>
        <PanelField label="Font" hint="Oswald matches the K-Direction look">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.displayFont ?? "Oswald")} onChange={(e) => up({ displayFont: e.target.value })} />
        </PanelField>
        <div className="grid grid-cols-2 gap-2">
          <PanelField label="Logo color">
            <input className={INPUT} style={INPUT_STYLE} value={String(p.logoColor ?? "#FFFFFF")} onChange={(e) => up({ logoColor: e.target.value })} />
          </PanelField>
          <PanelField label="Mirror color">
            <input className={INPUT} style={INPUT_STYLE} value={String(p.logoMirrorColor ?? "#F5C4B8")} onChange={(e) => up({ logoMirrorColor: e.target.value })} />
          </PanelField>
        </div>
        <PanelField label="Nav button color">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.navButtonBg ?? "#FFF86B")} onChange={(e) => up({ navButtonBg: e.target.value })} />
        </PanelField>
        <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider"><input type="checkbox" checked={p.showMirrorLogo !== false} onChange={(e) => up({ showMirrorLogo: e.target.checked })} />Mirrored wordmark (Wix)</label>
        <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider"><input type="checkbox" checked={p.showHomeIcon !== false} onChange={(e) => up({ showHomeIcon: e.target.checked })} />Home icon in nav</label>
        <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider"><input type="checkbox" checked={p.showOverlay === true} onChange={(e) => up({ showOverlay: e.target.checked })} />Dark overlay on background photo</label>
      </div>
    );
    if (activeTab === "Media") return (
      <div className="space-y-2">
        <SectionPhotoField projectId={projectId} label="Background photo (over gradient)" value={String(p.backgroundImage ?? "")} onChange={(url) => up({ backgroundImage: url })} />
        <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: "#FF5500" }}>Collage photos / cutouts</p>
        <p className="text-[10px] leading-relaxed" style={{ color: "#6B5B45" }}>Switch Desktop / Tablet / Phone above the preview, then drag photos.</p>
        <button type="button" className="w-full rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: "#0F0D33" }} onClick={() => {
          const existing = (p.collagePhotos as Record<string, unknown>[]) ?? [];
          const base = { src: String((p.featuredArtistImage as string) || (existing[0] as { src?: string } | undefined)?.src || ""), alt: "New photo", rotate: -10 + Math.round(Math.random() * 20), topPct: 20 + Math.round(Math.random() * 40), leftPct: 20 + Math.round(Math.random() * 40), widthPct: 16, zIndex: 5 };
          const next = [...existing, { ...base, tablet: { rotate: base.rotate, topPct: base.topPct, leftPct: Math.min(70, base.leftPct), widthPct: Math.min(28, base.widthPct * 1.2), hidden: false }, mobile: { rotate: Math.max(-18, Math.min(18, base.rotate)), topPct: 10 + (existing.length % 3) * 28, leftPct: existing.length % 2 === 0 ? 8 : 52, widthPct: 40, hidden: existing.length >= 4 } }];
          up({ collagePhotos: next });
        }}>+ Add photo / cutout</button>
        {((p.collagePhotos as { src?: string; rotate?: number; topPct?: number; leftPct?: number; widthPct?: number }[]) ?? []).map((photo, idx) => (
          <div key={idx} className="space-y-1 rounded-lg p-2" style={{ border: "1px solid #EEE" }}>
            <SectionPhotoField projectId={projectId} label={`Photo ${idx + 1} — upload then drag on canvas`} value={String(photo.src ?? "")} onChange={(url) => { const next = [...((p.collagePhotos as typeof photo[]) ?? [])]; next[idx] = { ...next[idx]!, src: url }; up({ collagePhotos: next }); }} />
            <input className="w-full text-xs rounded px-2 py-1" style={{ border: "1px solid #DDE0F0" }} value={String((photo as { href?: string }).href ?? "")} placeholder="Link when clicked" onChange={(e) => { const next = [...((p.collagePhotos as (typeof photo & { href?: string })[]) ?? [])]; next[idx] = { ...next[idx]!, href: e.target.value }; up({ collagePhotos: next }); }} />
            <div className="grid grid-cols-2 gap-1">
              <label className="text-[9px]">Rotate<input type="number" className="mt-0.5 w-full text-xs rounded px-1 py-1" style={{ border: "1px solid #DDE0F0" }} value={Number(photo.rotate ?? 0)} onChange={(e) => { const next = [...((p.collagePhotos as typeof photo[]) ?? [])]; next[idx] = { ...next[idx]!, rotate: Number(e.target.value) }; up({ collagePhotos: next }); }} /></label>
              <label className="text-[9px]">Width %<input type="number" className="mt-0.5 w-full text-xs rounded px-1 py-1" style={{ border: "1px solid #DDE0F0" }} value={Number(photo.widthPct ?? 16)} onChange={(e) => { const next = [...((p.collagePhotos as typeof photo[]) ?? [])]; next[idx] = { ...next[idx]!, widthPct: Number(e.target.value) }; up({ collagePhotos: next }); }} /></label>
            </div>
            <button type="button" className="text-[10px] font-bold uppercase text-red-600" onClick={() => { const next = ((p.collagePhotos as typeof photo[]) ?? []).filter((_, i) => i !== idx); up({ collagePhotos: next }); }}>Remove</button>
          </div>
        ))}
      </div>
    );
    if (activeTab === "Nav") return (
      <div className="space-y-2">
        <NavLinksEditor pages={namedPages} links={mapNavLinksForEditor((p.navLinks as Parameters<typeof mapNavLinksForEditor>[0]) ?? [])} onChange={(navLinks) => up({ navLinks })} />
        <NavSizeEditor scale={clampNavScale(p.navScale, 1)} size={parseNavSize(p.navSize)} layout={parseNavLayout(p.navLayout)} logoAlign={(p.logoAlign as "left" | "center" | "right" | undefined) ?? "left"} onChange={up} />
        <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: "#FF5500" }}>Social / music links</p>
        <SocialLinksEditor projectId={projectId} links={((p.socialLinks as { label?: string; href?: string; iconUrl?: string }[]) ?? []).map((l) => ({ label: String(l.label ?? ""), href: String(l.href ?? ""), iconUrl: String(l.iconUrl ?? "") }))} onChange={(socialLinks) => up({ socialLinks })} />
      </div>
    );
  }

  // ── kdirection-page ───────────────────────────────────────────────────────
  if (t === "kdirection-page") {
    if (activeTab === "Content") return (
      <div className="space-y-3">
        <PanelField label="Page title">
          <input className={INPUT} style={INPUT_STYLE} value={String(p.title ?? "")} onChange={(e) => up({ title: e.target.value })} placeholder="Page title" />
        </PanelField>
        <PanelField label="Body text">
          <textarea className={INPUT + " min-h-[80px]"} style={INPUT_STYLE} rows={4} value={String(p.body ?? "")} onChange={(e) => up({ body: e.target.value })} placeholder="Page content" />
        </PanelField>
        <SectionPhotoField projectId={projectId} label="Hero photo" value={String(p.heroImage ?? "")} onChange={(url) => up({ heroImage: url })} />
        <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider"><input type="checkbox" checked={p.showOverlay === true} onChange={(e) => up({ showOverlay: e.target.checked })} />Dark overlay</label>
      </div>
    );
    if (activeTab === "Nav") return (
      <div className="space-y-2">
        <NavLinksEditor pages={namedPages} links={mapNavLinksForEditor((p.navLinks as Parameters<typeof mapNavLinksForEditor>[0]) ?? [])} onChange={(navLinks) => up({ navLinks })} />
        <NavSizeEditor scale={clampNavScale(p.navScale, 1)} size={parseNavSize(p.navSize)} layout={parseNavLayout(p.navLayout)} logoAlign={(p.logoAlign as "left" | "center" | "right" | undefined) ?? "left"} onChange={up} />
      </div>
    );
  }

  // ── default (image, unknown) ───────────────────────────────────────────────
  return (
    <p className="text-[11px]" style={{ color: "#8A8578" }}>
      You can reorder or hide this section. Use Yande to rewrite copy.
    </p>
  );
}
