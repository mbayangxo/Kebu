/**
 * Nested “blocks” under a section for the left-rail accordion (Shopify theme editor).
 * Derived from section props — not a separate DB table yet.
 */

export type SectionBlockPreview = {
  id: string;
  label: string;
};

export function blocksForSection(
  sectionType: string,
  props: Record<string, unknown> | undefined,
): SectionBlockPreview[] {
  if (!props) return [];
  const blocks: SectionBlockPreview[] = [];

  if (sectionType === "free-text" && Array.isArray(props.blocks)) {
    for (const raw of props.blocks) {
      const b = raw as { id?: string; text?: string };
      const id = String(b.id ?? "");
      if (!id) continue;
      const text = String(b.text ?? "").trim();
      blocks.push({
        id,
        label: text ? (text.length > 28 ? `${text.slice(0, 28)}…` : text) : "Text block",
      });
    }
    return blocks;
  }

  if (Array.isArray(props.items)) {
    props.items.forEach((raw, i) => {
      const item = raw as { title?: string; question?: string; label?: string; heading?: string; name?: string };
      const label =
        String(item.title ?? item.question ?? item.label ?? item.heading ?? item.name ?? "").trim() ||
        `Item ${i + 1}`;
      blocks.push({ id: `item-${i}`, label: label.length > 32 ? `${label.slice(0, 32)}…` : label });
    });
    return blocks;
  }

  if (Array.isArray(props.links)) {
    props.links.forEach((raw, i) => {
      const link = raw as { label?: string; href?: string };
      const label = String(link.label ?? link.href ?? `Link ${i + 1}`).trim();
      blocks.push({ id: `link-${i}`, label });
    });
    return blocks;
  }

  if (Array.isArray(props.navLinks)) {
    props.navLinks.forEach((raw, i) => {
      const link = raw as { label?: string; href?: string };
      const label = String(link.label ?? `Nav ${i + 1}`).trim();
      blocks.push({ id: `nav-${i}`, label });
    });
  }

  if (Array.isArray(props.socialLinks)) {
    props.socialLinks.forEach((raw, i) => {
      const link = raw as { label?: string; href?: string };
      const label = String(link.label ?? `Social ${i + 1}`).trim();
      blocks.push({ id: `social-${i}`, label });
    });
  }

  if (Array.isArray(props.collagePhotos)) {
    props.collagePhotos.forEach((raw, i) => {
      const photo = raw as { id?: string; label?: string; href?: string };
      const id = String(photo.id ?? `photo-${i}`);
      blocks.push({
        id,
        label: String(photo.label ?? `Photo ${i + 1}`).trim() + (photo.href ? " · link" : ""),
      });
    });
  }

  if (Array.isArray(props.extraCutouts)) {
    props.extraCutouts.forEach((raw, i) => {
      const cut = raw as { id?: string };
      const id = String(cut.id ?? `cutout-${i}`);
      blocks.push({ id, label: `Photo ${i + 1}` });
    });
  }

  if (typeof props.heading === "string" && props.heading.trim()) {
    blocks.unshift({ id: "heading", label: `Heading — ${props.heading.trim().slice(0, 24)}` });
  } else if (typeof props.title === "string" && props.title.trim() && blocks.length === 0) {
    blocks.push({ id: "title", label: `Title — ${props.title.trim().slice(0, 24)}` });
  }

  if (typeof props.buttonLabel === "string" && props.buttonLabel.trim()) {
    blocks.push({ id: "button", label: `Button — ${props.buttonLabel.trim()}` });
  }

  return blocks;
}
