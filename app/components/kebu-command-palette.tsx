"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KEBU } from "@/lib/kebu-brand";
import type { SearchResult } from "@/app/api/me/search/route";

type Section = { label: string; items: SearchResult[] };

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  page: "Page",
  site: "Site",
  design: "Design",
  business: "Business",
  opportunity: "Opportunity",
};

const KIND_ACCENT: Record<SearchResult["kind"], string> = {
  page:        KEBU.black,
  site:        KEBU.orange,
  design:      "#9333EA",
  business:    "#10B981",
  opportunity: KEBU.red,
};

function KindBadge({ kind }: { kind: SearchResult["kind"] }) {
  return (
    <span
      className="shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: `${KIND_ACCENT[kind]}18`, color: KIND_ACCENT[kind] }}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

function ResultRow({
  item,
  active,
  onSelect,
}: {
  item: SearchResult;
  active: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
      style={{
        background: active ? `${KEBU.orange}12` : "transparent",
        borderLeft: active ? `3px solid ${KEBU.orange}` : "3px solid transparent",
      }}
    >
      <KindBadge kind={item.kind} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate" style={{ color: KEBU.black }}>
          {item.label}
        </p>
        {item.sublabel ? (
          <p className="text-[11px] truncate" style={{ color: KEBU.muted }}>
            {item.sublabel}
          </p>
        ) : null}
      </div>
      {active ? (
        <span className="shrink-0 text-xs font-bold" style={{ color: KEBU.orange }}>
          ↵
        </span>
      ) : null}
    </button>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      className="px-4 pt-3 pb-1 text-[9px] font-black uppercase tracking-[0.2em]"
      style={{ color: KEBU.muted }}
    >
      {label}
    </p>
  );
}

export function KebuCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const allItems = sections.flatMap((s) => s.items);

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSections([]);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Debounced search
  const search = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/me/search?q=${encodeURIComponent(q)}`,
        { credentials: "include", signal: ctrl.signal }
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        results: SearchResult[];
        pages: SearchResult[];
      };

      const built: Section[] = [];

      if (data.pages.length > 0) {
        built.push({ label: "Pages & actions", items: data.pages });
      }

      const byKind: Record<string, SearchResult[]> = {};
      for (const r of data.results) {
        (byKind[r.kind] ??= []).push(r);
      }
      for (const [kind, items] of Object.entries(byKind)) {
        built.push({ label: KIND_LABEL[kind as SearchResult["kind"]] + "s", items });
      }

      setSections(built);
      setActiveIdx(0);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void search(query), query ? 200 : 0);
    return () => clearTimeout(t);
  }, [query, open, search]);

  // Keyboard navigation inside palette
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const item = allItems[activeIdx];
      if (item) navigate(item);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function navigate(item: SearchResult) {
    setOpen(false);
    router.push(item.href);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{ background: "rgba(10,10,10,0.55)", backdropFilter: "blur(4px)" }}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Palette */}
      <div
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
        className="fixed z-[9999] left-1/2 -translate-x-1/2 w-full max-w-xl"
        style={{ top: "10vh" }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: KEBU.white,
            border: `2px solid ${KEBU.black}`,
            boxShadow: "8px 8px 0 rgba(10,10,10,0.9), 0 20px 60px rgba(10,10,10,0.4)",
          }}
        >
          {/* Search bar */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: `1px solid rgba(10,10,10,0.1)` }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={loading ? KEBU.orange : KEBU.muted}
              strokeWidth="2"
              strokeLinecap="round"
              className={loading ? "animate-spin" : ""}
              style={{ flexShrink: 0 }}
            >
              {loading ? (
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              ) : (
                <>
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </>
              )}
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search sites, designs, businesses, pages…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIdx(0);
              }}
              onKeyDown={onKeyDown}
              className="flex-1 bg-transparent text-sm font-medium outline-none"
              style={{ color: KEBU.black }}
              autoComplete="off"
              spellCheck={false}
            />
            <kbd
              className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(10,10,10,0.06)", color: KEBU.muted }}
            >
              esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {sections.length === 0 && !loading ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-bold" style={{ color: KEBU.muted }}>
                  {query ? "No results found" : "Type to search"}
                </p>
                <p className="text-xs mt-1" style={{ color: KEBU.faint }}>
                  {query
                    ? "Try a site name, design title, or business name"
                    : "Sites, designs, businesses, pages — everything"}
                </p>
              </div>
            ) : (
              <>
                {sections.map((section) => {
                  const sectionStart = sections
                    .slice(0, sections.indexOf(section))
                    .reduce((n, s) => n + s.items.length, 0);
                  return (
                    <div key={section.label}>
                      <SectionHeader label={section.label} />
                      {section.items.map((item, i) => (
                        <ResultRow
                          key={item.id}
                          item={item}
                          active={activeIdx === sectionStart + i}
                          onSelect={() => navigate(item)}
                        />
                      ))}
                    </div>
                  );
                })}
                <div
                  className="px-4 py-2 flex items-center justify-between"
                  style={{ borderTop: `1px solid rgba(10,10,10,0.06)` }}
                >
                  <span className="text-[10px]" style={{ color: KEBU.faint }}>
                    ↑↓ navigate · ↵ open · esc close
                  </span>
                  <span
                    className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: KEBU.black, color: KEBU.orange }}
                  >
                    Kebu
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** Trigger button shown in the desktop topbar. */
export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
      }}
      className="hidden md:flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors hover:bg-black/5"
      style={{ color: KEBU.muted, border: `1px solid rgba(10,10,10,0.12)` }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
      Search
      <kbd
        className="text-[9px] font-bold px-1 py-0.5 rounded"
        style={{ background: "rgba(10,10,10,0.07)", color: KEBU.faint }}
      >
        ⌘K
      </kbd>
    </button>
  );
}
