/** Canonical media properties used by website-v1 section/chrome schemas. */
const MEDIA_KEYS = new Set([
  "src", "poster", "captionsSrc", "image", "imageUrl", "backgroundImage",
  "backgroundImageUrl", "logoUrl", "faviconUrl", "logoImage", "logoBanner",
  "logoSmall", "coverUrl", "avatar", "avatarUrl", "iconUrl", "videoUrl",
  "audioUrl", "soundtrackUrl", "photoUrl", "backgroundLayer", "titleLogo",
  "cutoutLeft", "cutoutRight", "cutoutAccent", "cutoutSparkle", "macbook",
  "sparkleGif", "heroPhoto",
  "featuredImage", "thumbnail", "beforeImageUrl", "afterImageUrl",
  "portraitMain", "collageTop", "collageMiddle", "bottomLeft", "bottomRight",
  "albumArt", "chromeLogo", "featuredArtistImage", "heroImage",
]);
const BACKGROUND_KEYS = new Set(["background", "backgroundCss"]);

/**
 * No fetching or URL guessing. Media uses exact owner-supplied references.
 * Ordinary CSS url() references use the same exact-reference boundary. More
 * complex/escaped media CSS is opaque and may only be retained unchanged.
 */
export function websiteMediaReferences(value: unknown): Set<string> {
  const references = new Set<string>();
  function collect(input: unknown) {
    if (!input || typeof input !== "object") return;
    for (const [key, child] of Object.entries(input)) {
      if (typeof child === "string" && child.trim()) {
        if (MEDIA_KEYS.has(key)) references.add(child.trim());
        else if (BACKGROUND_KEYS.has(key) && /(?:url\s*\(|image(?:-set)?\s*\(|\\|@import)/i.test(child)) {
          const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi;
          const urls = [...child.matchAll(urlPattern)];
          const remainder = child.replace(urlPattern, "");
          if (!urls.length || /(?:url\s*\(|image(?:-set)?\s*\(|\\|@import)/i.test(remainder) || child.includes("\\")) {
            references.add(`css:${child}`);
          } else {
            for (const match of urls) references.add((match[1] ?? match[2] ?? match[3]).trim());
          }
        }
      } else if (child && typeof child === "object") collect(child);
    }
  }
  collect(value);
  return references;
}

export function usesOnlyApprovedWebsiteMedia(value: unknown, approved: ReadonlySet<string>): boolean {
  return [...websiteMediaReferences(value)].every(reference => approved.has(reference));
}
