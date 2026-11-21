import { z } from "zod";

export const storeSlug = z.string().min(1).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const storefrontSchema = z.strictObject({
  subdomain: storeSlug,
  url: z.url().refine(value => {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password &&
      !url.search && !url.hash && /^\/sites\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(url.pathname);
  }),
}).refine(value => {
  const [, , slug] = new URL(value.url).pathname.split("/");
  return slug === value.subdomain;
});
export type Storefront = z.infer<typeof storefrontSchema>;

export function storefrontLink(store: Storefront): string {
  const { url } = storefrontSchema.parse(store);
  // Validation restricts the path; escape the complete attribute regardless.
  const href = url.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<a href="${href}">Shop on Kebu</a>`;
}
