import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
] as const;

const NO_STORE = "private, no-cache, no-store, max-age=0, must-revalidate";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "vumbnail.com" },
      { protocol: "https", hostname: "static.wixstatic.com" },
      { protocol: "https", hostname: "static.tildacdn.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      // Fingerprinted Next assets — safe to cache forever.
      {
        source: "/_next/static/:path*",
        headers: [
          ...SECURITY_HEADERS,
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Service workers must revalidate every time or kill-switch never runs.
      {
        source: "/sw.js",
        headers: [
          ...SECURITY_HEADERS,
          { key: "Cache-Control", value: NO_STORE },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/sw-site.js",
        headers: [...SECURITY_HEADERS, { key: "Cache-Control", value: NO_STORE }],
      },
      {
        source: "/sw-kebu-app.js",
        headers: [
          ...SECURITY_HEADERS,
          { key: "Cache-Control", value: NO_STORE },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      // Published public site pages — shared CDN cache, revalidated every 60 s.
      {
        source: "/sites/:subdomain/:path*",
        headers: [
          ...SECURITY_HEADERS,
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=3600" },
        ],
      },
      {
        source: "/sites/:subdomain",
        headers: [
          ...SECURITY_HEADERS,
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=3600" },
        ],
      },
      // Short-link published sites (/e/:id, /id/:id)
      {
        source: "/e/:publicId/:path*",
        headers: [
          ...SECURITY_HEADERS,
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=3600" },
        ],
      },
      {
        source: "/id/:publicId/:path*",
        headers: [
          ...SECURITY_HEADERS,
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=3600" },
        ],
      },
      // HTML, APIs, and app routes — never serve a stale landing / login / builder shell.
      {
        source: "/:path*",
        headers: [...SECURITY_HEADERS, { key: "Cache-Control", value: NO_STORE }],
      },
    ];
  },
};

export default nextConfig;
