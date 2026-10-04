import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Praxis",
    short_name: "Praxis",
    description: "Your private, offline life dashboard.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f2f7",
    theme_color: "#0a84ff",
    categories: ["productivity", "lifestyle", "health", "finance"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add expense", url: "/money/expenses/?new=1" },
      { name: "Journal", url: "/life/journal/?new=1" },
      { name: "Focus timer", url: "/life/focus/" },
    ],
  };
}
