import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kebu — The African Cloud",
    short_name: "Kebu",
    description: "Discover opportunities, create a business or store, and operate online — the African Cloud for builders.",
    start_url: "/",
    display: "standalone",
    background_color: "#0F0D33",
    theme_color: "#00C851",
    orientation: "portrait-primary",
    categories: ["business", "education", "finance"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Discover", url: "/build", description: "Find what you can build from resources you have" },
      { name: "Create", url: "/create", description: "Build and publish your website with Kebu" },
      { name: "Launch a store", url: "/store/new", description: "Publish a business site online" },
    ],
  };
}
