export type KebuMediaKind = "image" | "video" | "audio";

export type KebuDragAsset = {
  url: string;
  kind: KebuMediaKind;
};

export const KEBU_ASSET_DRAG_MIME = "application/x-kebu-asset";

export function parseKebuDragAsset(raw: string | null | undefined): KebuDragAsset | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<KebuDragAsset>;
    if (typeof parsed.url !== "string" || !parsed.url.trim()) return null;
    const kind =
      parsed.kind === "video" || parsed.kind === "audio" || parsed.kind === "image" ? parsed.kind : "image";
    return { url: parsed.url.trim(), kind };
  } catch {
    return null;
  }
}

/** New collage cutout for K-Direction — optional drop % for Desktop layout. */
export function collagePhotoFromAsset(
  url: string,
  existingCount: number,
  drop?: { leftPct: number; topPct: number },
) {
  const rotate = -10 + Math.round(Math.random() * 20);
  const topPct = drop?.topPct ?? 20 + Math.round(Math.random() * 40);
  const leftPct = drop?.leftPct ?? 20 + Math.round(Math.random() * 40);
  const widthPct = 16;
  return {
    src: url,
    alt: "Uploaded photo",
    rotate,
    topPct,
    leftPct,
    widthPct,
    zIndex: 5 + existingCount,
    tablet: {
      rotate,
      topPct,
      leftPct: Math.min(70, leftPct),
      widthPct: Math.min(28, widthPct * 1.2),
      hidden: false,
    },
    mobile: {
      rotate: Math.max(-18, Math.min(18, rotate)),
      topPct: 10 + (existingCount % 3) * 28,
      leftPct: existingCount % 2 === 0 ? 8 : 52,
      widthPct: 40,
      hidden: existingCount >= 4,
    },
  };
}

export function dropPercentFromClient(
  el: HTMLElement,
  clientX: number,
  clientY: number,
): { leftPct: number; topPct: number } {
  const rect = el.getBoundingClientRect();
  const leftPct = Math.max(2, Math.min(90, ((clientX - rect.left) / Math.max(1, rect.width)) * 100));
  const topPct = Math.max(2, Math.min(90, ((clientY - rect.top) / Math.max(1, rect.height)) * 100));
  return { leftPct, topPct };
}

export type MediaApplyTarget =
  | { action: "collage"; sectionId: string; photos: ReturnType<typeof collagePhotoFromAsset>[] }
  | { action: "hero"; sectionId: string; heroImage: string }
  | { action: "gallery"; sectionId: string; items: { src: string; alt: string }[] }
  | { action: "patch-src"; sectionId: string; src: string }
  | { action: "add-section"; type: "image" | "video" | "audio"; props: Record<string, unknown> };

type SectionLike = {
  id: string;
  page_id: string;
  section_type: string;
  props: Record<string, unknown>;
};

/** Decide where a Media library asset should land on the current page. */
export function planMediaAssetApply(
  asset: KebuDragAsset,
  opts: {
    pageId: string;
    sections: SectionLike[];
    selectedSectionId: string | null;
    drop?: { leftPct: number; topPct: number };
  },
): MediaApplyTarget {
  const pageSections = opts.sections.filter((s) => s.page_id === opts.pageId);
  const selected = opts.sections.find((s) => s.id === opts.selectedSectionId) ?? null;

  if (asset.kind === "image") {
    const kdHome =
      selected?.section_type === "kdirection-home" && selected.page_id === opts.pageId
        ? selected
        : pageSections.find((s) => s.section_type === "kdirection-home");
    if (kdHome) {
      const existing = (kdHome.props.collagePhotos as Record<string, unknown>[]) ?? [];
      const photo = collagePhotoFromAsset(asset.url, existing.length, opts.drop);
      return {
        action: "collage",
        sectionId: kdHome.id,
        photos: [...existing, photo] as ReturnType<typeof collagePhotoFromAsset>[],
      };
    }
    const kdPage =
      selected?.section_type === "kdirection-page" && selected.page_id === opts.pageId
        ? selected
        : pageSections.find((s) => s.section_type === "kdirection-page");
    if (kdPage) {
      return { action: "hero", sectionId: kdPage.id, heroImage: asset.url };
    }
    const gallery =
      selected?.section_type === "gallery" && selected.page_id === opts.pageId
        ? selected
        : pageSections.find((s) => s.section_type === "gallery");
    if (gallery) {
      const items = Array.isArray(gallery.props.items) ? [...(gallery.props.items as { src: string; alt: string }[])] : [];
      items.push({ src: asset.url, alt: "" });
      return { action: "gallery", sectionId: gallery.id, items };
    }
    return { action: "add-section", type: "image", props: { src: asset.url, alt: "" } };
  }

  const type = asset.kind === "video" ? "video" : "audio";
  const empty = pageSections.find((s) => s.section_type === type && !String(s.props.src ?? "").trim());
  if (empty) {
    return { action: "patch-src", sectionId: empty.id, src: asset.url };
  }
  const existing = pageSections.find((s) => s.section_type === type);
  if (existing) {
    return { action: "patch-src", sectionId: existing.id, src: asset.url };
  }
  return {
    action: "add-section",
    type,
    props: type === "video" ? { src: asset.url, heading: "" } : { src: asset.url, title: "Track", artist: "" },
  };
}
