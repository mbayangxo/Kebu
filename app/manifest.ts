import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kebu — Africa's Opportunity OS",
    short_name: "Kebu",
    description:
      "Find the opportunity. Build the business. Grants, tenders, African resources, and a real site builder.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFBF7",
    theme_color: "#FF5500",
    orientation: "portrait-primary",
    categories: ["business", "education", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Opportunity", url: "/opportunity/countries", description: "Explore countries and what you can build" },
      { name: "Create", url: "/create", description: "Build and publish your website with Kebu" },
      { name: "Kebu Score", url: "/ka-score", description: "See your business readiness score" },
    ],
  };
}
