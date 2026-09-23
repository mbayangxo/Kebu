export const PERSONAL_MAIL_DOMAIN = (process.env.KEBU_MAIL_DOMAIN || "kebu.africa").toLowerCase();

export function normalizeMailboxLocalPart(input: string): string {
  const value = input.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const cleaned = value.replace(/[^a-z0-9._-]+/g, ".").replace(/^[._-]+|[._-]+$/g, "").replace(/\.{2,}/g, ".");
  return cleaned.slice(0, 48) || "kebu";
}

export function personalMailboxCandidates(opts: { name?: string | null; email?: string | null; userId: string }): string[] {
  const emailLocal = opts.email?.split("@")[0] ?? "";
  const name = opts.name ?? "";
  const base = normalizeMailboxLocalPart(name || emailLocal || opts.userId.slice(0, 8));
  const fallback = normalizeMailboxLocalPart(emailLocal || base);
  const suffix = opts.userId.replace(/-/g, "").slice(0, 6);
  return [...new Set([base, fallback, base + "." + suffix])].map((local) => local + "@" + PERSONAL_MAIL_DOMAIN);
}
