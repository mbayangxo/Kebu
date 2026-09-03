export const KDIRECTION_ASSET_DIR = "/templates/kdirection";

export const KDIRECTION_PORTRAIT = `${KDIRECTION_ASSET_DIR}/portrait.jpg`;

export const KDIRECTION_ICON_ASSETS = {
  Instagram: `${KDIRECTION_ASSET_DIR}/icons/instagram.svg`,
  YouTube: `${KDIRECTION_ASSET_DIR}/icons/youtube.svg`,
  Spotify: `${KDIRECTION_ASSET_DIR}/icons/spotify.svg`,
} as const;

/** User-uploaded assets must not be overwritten by Wix restore. */
export function isUserUploadedSiteAsset(url: string): boolean {
  const u = url.trim();
  if (!u || u.startsWith("blob:")) return Boolean(u);
  return (
    u.includes("/storage/v1/object/public/site-assets/") ||
    u.includes("/api/projects/") ||
    u.includes("/site-assets/")
  );
}

export function isBlockedRemoteMedia(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("wixstatic.com") ||
    u.includes("wixsite.com") ||
    u.includes("tildacdn.com") ||
    u.includes("tilda.ws")
  );
}

/** Map hotlinked Wix/Tilda URLs (403 in builder) → Kebu-hosted files. */
export function localizeKdirectionAssetUrl(url: string | null | undefined): string {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return "";
  if (isUserUploadedSiteAsset(trimmed)) return trimmed;
  if (isBlockedRemoteMedia(trimmed)) return KDIRECTION_PORTRAIT;
  return trimmed;
}

export function localizeKdirectionIconUrl(label: string, url: string | null | undefined): string {
  const trimmed = String(url ?? "").trim();
  if (trimmed && isUserUploadedSiteAsset(trimmed)) return trimmed;
  if (trimmed && !isBlockedRemoteMedia(trimmed) && trimmed.startsWith("/")) return trimmed;
  const key = Object.keys(KDIRECTION_ICON_ASSETS).find((name) =>
    name.toLowerCase() === label.trim().toLowerCase(),
  ) as keyof typeof KDIRECTION_ICON_ASSETS | undefined;
  if (key) return KDIRECTION_ICON_ASSETS[key];
  if (trimmed && isBlockedRemoteMedia(trimmed)) return KDIRECTION_ICON_ASSETS.Instagram;
  return trimmed;
}

export function projectUsesKdirectionLayout(
  description: string | null | undefined,
  sectionTypes: string[],
): boolean {
  if (description?.includes("portfolio:kdirection")) return true;
  return sectionTypes.some((t) => t === "kdirection-home" || t === "kdirection-page");
}
