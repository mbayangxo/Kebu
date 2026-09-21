"use client";

import { useState } from "react";
import { SiteImageUpload } from "@/app/components/create/site-image-upload";
import { GalaxyButton, GalaxyEmptyState } from "@/app/components/galaxy/editor-primitives";

export type NavGrandchildEdit = { label: string; href: string };
export type NavChildEdit = { label: string; href: string; iconUrl?: string; grandchildren?: NavGrandchildEdit[] };
export type NavLinkEdit = {
  label: string;
  href: string;
  iconUrl?: string;
  showLabel?: boolean;
  multiNav?: boolean;
  children?: NavChildEdit[];
};

export function mapNavLinksForEditor(
  links: Array<{
    label?: string;
    href?: string;
    iconUrl?: string;
    showLabel?: boolean;
    multiNav?: boolean;
    children?: Array<{ label?: string; href?: string; iconUrl?: string; grandchildren?: Array<{ label?: string; href?: string }> }>;
  }>,
): NavLinkEdit[] {
  return links.map((link) => ({
    label: String(link.label ?? ""),
    href: String(link.href ?? ""),
    iconUrl: String(link.iconUrl ?? ""),
    showLabel: link.showLabel !== false,
    multiNav: Boolean(link.multiNav || link.children?.length),
    children: Array.isArray(link.children)
      ? link.children.map((child) => ({
          label: String(child.label ?? ""),
          href: String(child.href ?? ""),
          iconUrl: String(child.iconUrl ?? ""),
          grandchildren: Array.isArray(child.grandchildren)
            ? child.grandchildren.map((grandchild) => ({ label: String(grandchild.label ?? ""), href: String(grandchild.href ?? "") }))
            : [],
        }))
      : [],
  }));
}

const INPUT = "min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-black outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/15";

export function NavLinksEditor({
  links,
  onChange,
  projectId,
  allowIcons = false,
  allowMultiNav = true,
  pages = [],
}: {
  links: NavLinkEdit[];
  onChange: (next: NavLinkEdit[]) => void;
  projectId?: string;
  allowIcons?: boolean;
  allowMultiNav?: boolean;
  pages?: Array<{ id: string; slug: string; title: string }>;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= links.length || to >= links.length) return;
    const next = [...links];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    onChange(next);
  }

  function patchLink(index: number, patch: Partial<NavLinkEdit>) {
    const next = [...links];
    next[index] = { ...next[index]!, ...patch };
    onChange(next);
  }

  function patchChild(index: number, childIndex: number, patch: Partial<NavChildEdit>) {
    const children = [...(links[index]?.children ?? [])];
    children[childIndex] = { ...children[childIndex]!, ...patch };
    patchLink(index, { children, multiNav: true });
  }

  const pageHrefSet = new Set(pages.map((page) => `/${page.slug}`));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold text-black/55">Menu structure</p>
        <p className="mt-1 text-[10px] leading-relaxed text-black/45">
          Drag top-level items to reorder. Nest pages for dropdowns and deeper navigation.
        </p>
      </div>

      {links.length ? (
        <div className="space-y-2">
          {links.map((link, index) => (
            <article
              key={index}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedIndex !== null) move(draggedIndex, index);
                setDraggedIndex(null);
              }}
              onDragEnd={() => setDraggedIndex(null)}
              className="rounded-lg border border-black/[0.08] bg-white p-2.5 transition-colors focus-within:border-black/20"
              style={{ opacity: draggedIndex === index ? 0.5 : 1 }}
            >
              <div className="flex items-center gap-2">
                <span className="cursor-grab select-none text-black/25" title="Drag to reorder" aria-hidden><svg className="h-4 w-3" viewBox="0 0 12 16" fill="currentColor"><circle cx="3" cy="4" r="1"/><circle cx="9" cy="4" r="1"/><circle cx="3" cy="8" r="1"/><circle cx="9" cy="8" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="9" cy="12" r="1"/></svg></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-black">{link.label || "Untitled link"}</p>
                  <p className="truncate text-[9px] text-black/40">{link.href || "No destination yet"}</p>
                </div>
                {link.href ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md px-1.5 py-1 text-[9px] font-bold text-black/45 hover:bg-black/[.04]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Test ↗
                  </a>
                ) : null}
                <button type="button" className="rounded-md px-1.5 py-1 text-[9px] font-bold text-red-600 hover:bg-red-50" onClick={() => onChange(links.filter((_, i) => i !== index))}>Remove</button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <input className={INPUT} value={link.label} placeholder="Label" onChange={(event) => patchLink(index, { label: event.target.value })} />
                <input className={INPUT} value={link.href} placeholder="/page or https://…" onChange={(event) => patchLink(index, { href: event.target.value })} />
              </div>

              {allowMultiNav ? (
                <div className="mt-2 rounded-lg bg-black/[0.025] p-2">
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span>
                      <span className="block text-[10px] font-bold text-black/65">Dropdown / mega navigation</span>
                      <span className="block text-[9px] text-black/40">Nest pages beneath this item.</span>
                    </span>
                    <input
                      type="checkbox"
                      className="accent-[#FF6A00]"
                      checked={Boolean(link.multiNav)}
                      onChange={(event) => {
                        const enabled = event.target.checked;
                        patchLink(index, {
                          multiNav: enabled,
                          children: enabled
                            ? link.children?.length
                              ? link.children
                              : [{ label: "", href: pages[0] ? `/${pages[0].slug}` : "/", iconUrl: "", grandchildren: [] }]
                            : [],
                        });
                      }}
                    />
                  </label>

                  {link.multiNav ? (
                    <div className="mt-2 space-y-2 border-l-2 border-[#FF6A00]/35 pl-2">
                      {(link.children ?? []).map((child, childIndex) => {
                        const customHref = pages.length > 0 && child.href && !pageHrefSet.has(child.href);
                        return (
                          <div key={childIndex} className="rounded-lg border border-black/[0.07] bg-white p-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-semibold text-black/35">Level 2 · {childIndex + 1}</span>
                              <button type="button" className="text-[9px] font-bold text-red-600" onClick={() => patchLink(index, { children: (link.children ?? []).filter((_, i) => i !== childIndex) })}>Remove</button>
                            </div>
                            {pages.length ? (
                              <select
                                className={`${INPUT} mt-1.5`}
                                value={customHref ? "__custom__" : child.href}
                                onChange={(event) => {
                                  if (event.target.value === "__custom__") {
                                    patchChild(index, childIndex, { href: "" });
                                    return;
                                  }
                                  const href = event.target.value;
                                  const page = pages.find((candidate) => `/${candidate.slug}` === href);
                                  patchChild(index, childIndex, { href, label: child.label || page?.title || "" });
                                }}
                              >
                                <option value="">Choose a page</option>
                                {pages.map((page) => <option key={page.id} value={`/${page.slug}`}>{page.title}</option>)}
                                <option value="__custom__">Custom URL…</option>
                              </select>
                            ) : null}
                            <input className={`${INPUT} mt-1.5`} value={child.label} placeholder="Display label" onChange={(event) => patchChild(index, childIndex, { label: event.target.value })} />
                            {pages.length === 0 || customHref || child.href === "" ? (
                              <input className={`${INPUT} mt-1.5`} value={child.href} placeholder="/page or https://…" onChange={(event) => patchChild(index, childIndex, { href: event.target.value })} />
                            ) : null}

                            <div className="mt-2 space-y-1.5">
                              {(child.grandchildren ?? []).map((grandchild, grandIndex) => (
                                <div key={grandIndex} className="grid grid-cols-[1fr_1fr_28px] gap-1">
                                  <input className={INPUT} value={grandchild.label} placeholder="Nested label" onChange={(event) => {
                                    const grandchildren = [...(child.grandchildren ?? [])];
                                    grandchildren[grandIndex] = { ...grandchildren[grandIndex]!, label: event.target.value };
                                    patchChild(index, childIndex, { grandchildren });
                                  }} />
                                  <input className={INPUT} value={grandchild.href} placeholder="/page" onChange={(event) => {
                                    const grandchildren = [...(child.grandchildren ?? [])];
                                    grandchildren[grandIndex] = { ...grandchildren[grandIndex]!, href: event.target.value };
                                    patchChild(index, childIndex, { grandchildren });
                                  }} />
                                  <button type="button" aria-label="Remove nested link" className="rounded-md text-red-600 hover:bg-red-50" onClick={() => patchChild(index, childIndex, { grandchildren: (child.grandchildren ?? []).filter((_, i) => i !== grandIndex) })}>×</button>
                                </div>
                              ))}
                              {(child.grandchildren ?? []).length < 8 ? (
                                <button type="button" className="text-[9px] font-semibold text-[#FF6A00]" onClick={() => patchChild(index, childIndex, { grandchildren: [...(child.grandchildren ?? []), { label: "", href: "/" }] })}>+ Add level 3 link</button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                      <GalaxyButton className="w-full" onClick={() => patchLink(index, { children: [...(link.children ?? []), { label: "", href: pages[0] ? `/${pages[0].slug}` : "/", iconUrl: "", grandchildren: [] }] })}>+ Add dropdown item</GalaxyButton>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {allowIcons && projectId ? (
                <div className="mt-2">
                  <SiteImageUpload projectId={projectId} kind="section" value={link.iconUrl ?? ""} onChange={(url) => patchLink(index, { iconUrl: url })} label="Menu image or icon" />
                  <label className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold text-black/55">
                    <input type="checkbox" checked={link.showLabel !== false} onChange={(event) => patchLink(index, { showLabel: event.target.checked })} />
                    Show text with image
                  </label>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <GalaxyEmptyState title="Your menu is empty" detail="Add the first link below. Site pages can be linked directly or grouped into dropdowns." />
      )}

      <GalaxyButton
        className="w-full"
        variant="primary"
        onClick={() => onChange([...links, { label: "New link", href: pages[0] ? `/${pages[0].slug}` : "/", iconUrl: "", showLabel: true, multiNav: false, children: [] }])}
      >
        + Add menu link
      </GalaxyButton>
    </div>
  );
}
