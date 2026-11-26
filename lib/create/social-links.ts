export type SocialLink = { label: string; iconUrl: string; href: string };
export type SocialPlatform = "spotify" | "apple" | "youtube" | "soundcloud" | "instagram" | "facebook";
const stock: Record<string, SocialPlatform> = {
  e3496b0865884e4ca74ea5377ed41068: "soundcloud",
  b2a4e7e9c56a45df9961c749501f1139: "apple",
  e18eec328e7446079b7c7cef09488b18: "spotify",
  "81af6121f84c41a5b4391d7d37fce12a": "instagram",
  "23fd2a2be53141ed810f4d3dcdcd01fa": "facebook",
  "203dcdc2ac8b48de89313f90d2a4cda1": "youtube",
};
export function stockSocialPlatform(iconUrl: string): SocialPlatform | undefined {
  const match = /^https:\/\/static\.wixstatic\.com\/media\/([a-f0-9]+)\.png(?:\/|\?|$)/.exec(iconUrl.trim());
  return match ? stock[match[1]!] : undefined;
}
export function socialPlatform(label: string): SocialPlatform | undefined {
  const name = label.toLowerCase().replace(/[\s_-]/g, "");
  return name === "applemusic" || name === "apple" ? "apple" : ["spotify", "youtube", "soundcloud", "instagram", "facebook"].includes(name) ? name as SocialPlatform : undefined;
}
/** Social destinations must be intentional web URLs; blanks and template anchors are unset. */
export function socialDestination(value: string): string | null {
  const text = value.trim();
  try {
    const url = new URL(text);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
