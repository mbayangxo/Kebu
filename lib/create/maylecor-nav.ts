import { z } from "zod";
import {
  MAYLECOR_NAV_SLUGS,
  MAYLECOR_WORLD_SLUGS,
  maylecorNavLabel,
  maylecorWorldLabel,
  type MaylecorNavSlug,
} from "./maylecor-site-i18n";
import { MAYJOR_GOOD_SITE_HREF } from "./maylecor-defaults";

const safeHref = z
  .string()
  .trim()
  .max(300)
  .refine(
    (v) =>
      v === "" ||
      v === "#" ||
      v.startsWith("#") ||
      v.startsWith("/") ||
      v.startsWith("https://") ||
      v.startsWith("http://") ||
      v.startsWith("mailto:") ||
      v.startsWith("tel:") ||
      /^[a-z0-9][a-z0-9-]*$/.test(v),
    { message: "Invalid URL" },
  );

/** One child under a multi-nav parent (Shopify-style dropdown). */
export const navChildLinkSchema = z.object({
  label: z.string().trim().min(1).max(60),
  href: safeHref,
  /** Optional photo/icon for the child row. */
  iconUrl: z
    .union([
      z.literal(""),
      z.string().trim().url().max(500),
      z
        .string()
        .trim()
        .max(500)
        .regex(/^\/[a-zA-Z0-9._\-/]+$/),
    ])
    .optional()
    .default(""),
});

/**
 * Top-level menu item. When multiNav is true, children render as a dropdown.
 * User chooses which pages get multi-navigation in Shop → Pages / builder.
 * iconUrl = photo or icon instead of (or with) words; showLabel false = icon-only.
 */
export const navLinkSchema = z.object({
  label: z.string().trim().min(1).max(60),
  href: safeHref,
  multiNav: z.boolean().optional().default(false),
  children: z.array(navChildLinkSchema).max(16).optional().default([]),
  iconUrl: z
    .union([
      z.literal(""),
      z.string().trim().url().max(500),
      z
        .string()
        .trim()
        .max(500)
        .regex(/^\/[a-zA-Z0-9._\-/]+$/),
    ])
    .optional()
    .default(""),
  /** When false and iconUrl is set, hide text label (icon/photo-only nav). */
  showLabel: z.boolean().optional().default(true),
});

export type NavChildLink = z.infer<typeof navChildLinkSchema>;
export type NavLinkItem = z.infer<typeof navLinkSchema>;

export const navLinksArraySchema = z.array(navLinkSchema).max(12);

export function defaultMaylecorShopChildren(): NavChildLink[] {
  return [
    { label: "All products", href: "/shop", iconUrl: "" },
    { label: "New drops", href: "/shop", iconUrl: "" },
  ];
}

export function defaultMaylecorWorldChildren(): NavChildLink[] {
  return MAYLECOR_WORLD_SLUGS.map((slug) => ({
    label: maylecorWorldLabel(slug, "en"),
    href: `/${slug}`,
    iconUrl: "",
  }));
}

/** Relative top nav — Shop + May's World open as multi-nav by default. */
export function defaultMaylecorNavLinks(): NavLinkItem[] {
  return MAYLECOR_NAV_SLUGS.map((slug) => {
    const base: NavLinkItem = {
      label: maylecorNavLabel(slug, "en"),
      href: slug === "mayjor-good" ? MAYJOR_GOOD_SITE_HREF : `/${slug}`,
      multiNav: false,
      children: [],
      iconUrl: "",
      showLabel: true,
    };
    if (slug === "shop") {
      return {
        ...base,
        multiNav: true,
        children: defaultMaylecorShopChildren(),
      };
    }
    if (slug === "mays-world") {
      return {
        ...base,
        multiNav: true,
        children: defaultMaylecorWorldChildren(),
      };
    }
    return base;
  });
}

function rewriteHref(
  label: string,
  href: string,
): { label: string; href: string } {
  let next = href.trim();
  const lower = next.toLowerCase();
  const labelLower = label.toLowerCase();

  if (
    lower.includes("maylecor.com") ||
    lower.includes("wixsite.com") ||
    lower.includes("wix.com") ||
    lower.includes("static.wixstatic.com")
  ) {
    if (labelLower.includes("video") || lower.includes("video")) next = "/videos";
    else if (labelLower.includes("music") || lower.includes("music")) next = "/music";
    else if (labelLower.includes("photo") || lower.includes("photo") || lower.includes("gallery"))
      next = "/photos";
    else if (labelLower.includes("shop") || labelLower.includes("store") || lower.includes("shop"))
      next = "/shop";
    else if (labelLower.includes("world") || lower.includes("world")) next = "/mays-world";
    else if (labelLower.includes("about")) next = "/about";
    else if (labelLower.includes("press")) next = "/press";
    else if (labelLower.includes("update") || labelLower.includes("actu") || labelLower.includes("news"))
      next = "/updates";
    else if (
      labelLower.includes("mayjor") ||
      labelLower.includes("foundation") ||
      labelLower.includes("inquire") ||
      labelLower.includes("contact")
    )
      next = MAYJOR_GOOD_SITE_HREF;
    else if (labelLower.includes("home") || lower.endsWith("/") || lower.includes("maylecor.com"))
      next = "/";
    else next = "/mays-world";
  }

  // Mayinutes → May by May (cooking lane inside May's World)
  if (
    lower === "mayinutes" ||
    lower === "/mayinutes" ||
    labelLower.includes("mayinute") ||
    labelLower === "may by may"
  ) {
    return { label: "May by May", href: "/may-by-may" };
  }

  if (
    (labelLower.includes("video") || labelLower === "videos") &&
    (lower.includes("youtube.com") || lower.includes("youtu.be"))
  ) {
    next = "/videos";
  }

  if (
    labelLower.includes("inquire") ||
    labelLower === "contact" ||
    labelLower.includes("foundation") ||
    labelLower.includes("mayjor") ||
    lower.includes("/inquire") ||
    lower.includes("/contact") ||
    lower.includes("/mayjor-good")
  ) {
    return {
      label:
        labelLower.includes("mayjor") || labelLower.includes("foundation") ? label : "Mayjor Good",
      href:
        lower.startsWith("http") && !lower.includes("wix")
          ? next || href
          : MAYJOR_GOOD_SITE_HREF,
    };
  }

  const finalHref = next || "/";
  if (finalHref === "/about" || finalHref === "about") {
    return {
      label: labelLower === "about" || labelLower === "about may" ? "About May" : label,
      href: "/about",
    };
  }

  return { label, href: finalHref };
}

function sanitizeChild(
  c: { label?: string; href?: string; iconUrl?: string } | null | undefined,
): NavChildLink | null {
  if (!c) return null;
  const label = String(c.label ?? "").trim();
  const href = String(c.href ?? "").trim();
  if (!label && !href) return null;
  const rewritten = rewriteHref(label || "Page", href || "/");
  return {
    label: rewritten.label,
    href: rewritten.href,
    iconUrl: typeof c.iconUrl === "string" ? c.iconUrl.trim() : "",
  };
}

/**
 * Rewrite old May Lecor / Wix URLs; preserve multi-nav children.
 * Shop + May's World get default dropdowns when multi-nav is on (or unset) and children empty.
 */
export function sanitizeMaylecorNavLinks(
  links:
    | {
        label?: string;
        href?: string;
        multiNav?: boolean;
        children?: { label?: string; href?: string; iconUrl?: string }[];
        iconUrl?: string;
        showLabel?: boolean;
      }[]
    | undefined
    | null,
): NavLinkItem[] {
  const raw = Array.isArray(links) ? links : [];
  if (raw.length === 0) return defaultMaylecorNavLinks();

  const mapped: NavLinkItem[] = raw.map((l) => {
    const label = String(l.label ?? "").trim() || "Page";
    const rewritten = rewriteHref(label, String(l.href ?? "").trim());
    const childrenRaw = Array.isArray(l.children) ? l.children : [];
    const children = childrenRaw
      .map((c) => sanitizeChild(c))
      .filter((c): c is NavChildLink => Boolean(c));

    const slug = rewritten.href.replace(/^\//, "").split("/")[0] || "";
    const isHub = slug === "shop" || slug === "mays-world";
    // Explicit false = user turned multi-nav off. Otherwise hubs default on.
    const multiNav =
      l.multiNav === false ? false : Boolean(l.multiNav) || (isHub && children.length > 0) || isHub;

    let nextChildren = children;
    if (multiNav && nextChildren.length === 0 && isHub) {
      nextChildren =
        slug === "shop" ? defaultMaylecorShopChildren() : defaultMaylecorWorldChildren();
    }
    if (!multiNav) nextChildren = [];

    return {
      label: rewritten.label,
      href: rewritten.href,
      multiNav,
      children: nextChildren,
      iconUrl: typeof l.iconUrl === "string" ? l.iconUrl.trim() : "",
      showLabel: l.showLabel !== false,
    };
  });

  const hrefs = mapped.map((m) => m.href.replace(/^\//, ""));
  const rawHrefs = raw.map((l) => String(l.href ?? "").replace(/^\//, "").toLowerCase());
  const looksLikeLegacyMediaNav =
    hrefs.includes("music") &&
    hrefs.includes("videos") &&
    !hrefs.includes("about") &&
    !hrefs.includes("mayjor-good") &&
    !hrefs.includes("inquire");
  if (looksLikeLegacyMediaNav) return defaultMaylecorNavLinks();

  const looksLikeInquirePrimary =
    (rawHrefs.includes("inquire") || hrefs.includes("inquire")) &&
    (hrefs.includes("shop") || rawHrefs.includes("shop")) &&
    (hrefs.includes("press") || rawHrefs.includes("press")) &&
    !raw.some((l) => String(l.label ?? "").toLowerCase().includes("mayjor"));
  if (looksLikeInquirePrimary) return defaultMaylecorNavLinks();

  const withUpdates = ensureUpdatesNavLink(mapped.length ? mapped : defaultMaylecorNavLinks());
  return withUpdates;
}

/** Insert Updates after May's World when missing (existing May sites). */
export function ensureUpdatesNavLink(links: NavLinkItem[]): NavLinkItem[] {
  if (links.some((l) => l.href === "/updates" || l.href.replace(/^\//, "") === "updates")) {
    return links;
  }
  const item: NavLinkItem = {
    label: maylecorNavLabel("updates", "en"),
    href: "/updates",
    multiNav: false,
    children: [],
    iconUrl: "",
    showLabel: true,
  };
  const worldIdx = links.findIndex(
    (l) => l.href === "/mays-world" || l.href.replace(/^\//, "") === "mays-world",
  );
  if (worldIdx >= 0) {
    const next = [...links];
    next.splice(worldIdx + 1, 0, item);
    return next;
  }
  return [...links, item];
}

export function navSlugFromHref(href: string): MaylecorNavSlug | "home" | string {
  const slug = href.replace(/^\//, "").split("/")[0] || "home";
  return slug;
}

export function navLinkHasDropdown(link: NavLinkItem): boolean {
  return Boolean(link.multiNav && (link.children?.length ?? 0) > 0);
}
