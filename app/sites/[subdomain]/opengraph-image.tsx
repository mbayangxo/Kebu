import { ImageResponse } from "next/og";
import { loadPublicDeployment } from "@/lib/create/public-site-loader";

export const runtime = "edge";
export const alt = "Shop preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ subdomain: string }> };

/**
 * Auto-generated OG image for shops that haven't set a custom one.
 * If the shop has seo.ogImageUrl set, Next.js metadata won't call this route
 * because layout.tsx passes the explicit URL directly in openGraph.images.
 */
export default async function Image({ params }: Props) {
  const { subdomain } = await params;
  const deployment = await loadPublicDeployment(subdomain);

  const seo = deployment?.seo;
  const name = seo?.metaTitle || seo?.businessName || deployment?.definition?.title || subdomain;
  const tagline = seo?.metaDescription || "";
  const businessType = seo?.businessType || "Shop";
  const location = [seo?.city, seo?.country].filter(Boolean).join(", ");
  const host = deployment?.httpsUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") || `${subdomain}.kebu.africa`;

  // Count products for social proof
  let productCount = 0;
  if (deployment) {
    for (const page of deployment.definition.pages) {
      for (const section of page.sections ?? []) {
        const items = (section as Record<string, unknown>).items;
        if (Array.isArray(items)) productCount += items.length;
      }
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0F0F0F",
          padding: "60px 72px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Kebu brand mark top-left */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "auto" }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "#FF5500",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 18, height: 20, background: "#FFF8F2", borderRadius: "40% 45% 42% 48%" }} />
          </div>
          <span style={{ color: "#FF5500", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>kebu</span>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 40 }}>
          <div
            style={{
              display: "flex",
              background: "rgba(255,85,0,0.12)",
              border: "1px solid rgba(255,85,0,0.3)",
              borderRadius: 8,
              padding: "6px 14px",
              width: "fit-content",
            }}
          >
            <span style={{ color: "#FF8040", fontSize: 14, fontWeight: 600, letterSpacing: "0.04em" }}>
              {businessType.toUpperCase()}{location ? ` · ${location.toUpperCase()}` : ""}
            </span>
          </div>

          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            {name.length > 28 ? name.slice(0, 28) + "…" : name}
          </div>

          {tagline ? (
            <div style={{ display: "flex", fontSize: 24, color: "#A0A0A0", lineHeight: 1.4, maxWidth: 700 }}>
              {tagline.length > 100 ? tagline.slice(0, 100) + "…" : tagline}
            </div>
          ) : null}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: 32,
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <span style={{ color: "#606060", fontSize: 16 }}>{host}</span>
          {productCount > 0 ? (
            <span style={{ color: "#606060", fontSize: 16 }}>{productCount} product{productCount !== 1 ? "s" : ""}</span>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, background: "#22C55E", borderRadius: "50%" }} />
            <span style={{ color: "#22C55E", fontSize: 16, fontWeight: 600 }}>Live on Kebu</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
