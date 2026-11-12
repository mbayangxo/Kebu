export const CLOUD_USER_STORAGE_BUCKET = "cloud-user-storage";
export const CLOUD_DEPLOYMENTS_BUCKET = "cloud-deployments";

/** Matches the storage.buckets file_size_limit set in the migration. */
export const MAX_STORAGE_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_DEPLOYMENT_ASSET_BYTES = 10 * 1024 * 1024;

/** Hard ceiling on one zip upload's total extracted size, independent of plan quota. */
export const MAX_DEPLOYMENT_BUNDLE_BYTES = 200 * 1024 * 1024;
export const MAX_DEPLOYMENT_FILE_COUNT = 2000;

export const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
export const DEPLOYMENT_SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

const DEPLOYMENT_MIME_BY_EXT: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "application/javascript",
  mjs: "application/javascript",
  json: "application/json",
  txt: "text/plain",
  md: "text/markdown",
  xml: "application/xml",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  wasm: "application/wasm",
};

export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "file";
}

export function mimeFromExtension(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return DEPLOYMENT_MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export function isAllowedDeploymentExtension(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ext in DEPLOYMENT_MIME_BY_EXT;
}

/** Uploaded pages execute in a sandbox with an opaque origin, never the app origin. */
export const CLOUD_STATIC_CSP = "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https:; style-src 'unsafe-inline' https:; img-src https: data: blob:; font-src https: data:; media-src https: blob:; connect-src https:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
