/**
 * Paths that use the Level-2 site merchant rail (hide product sidebar).
 * Site home · Themes · Shop admin for one project.
 */
export function isMerchantWorkspacePath(pathname: string): boolean {
  if (/^\/my-sites\/[^/]+$/.test(pathname)) return true;
  if (/^\/create\/[^/]+\/themes$/.test(pathname)) return true;
  if (/^\/shop\/[^/]+$/.test(pathname)) return true;
  return false;
}

/** Prefer “My Sites” when leaving a site workspace. */
export function merchantWorkspaceBackHref(pathname: string): string | null {
  if (!isMerchantWorkspacePath(pathname)) return null;
  return "/my-sites";
}

/** Derive /my-sites/{id} from /create/{id} editor URLs used in portfolio lists. */
export function merchantHomeFromEditorUrl(editorUrl: string | null | undefined): string | null {
  if (!editorUrl) return null;
  const m = editorUrl.match(/^\/create\/([^/?#]+)$/);
  return m ? `/my-sites/${m[1]}` : null;
}
