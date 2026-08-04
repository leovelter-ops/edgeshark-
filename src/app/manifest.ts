import type { MetadataRoute } from "next";

// Installable-web-app manifest. Served at /manifest.webmanifest and auto-linked
// by Next. Makes the app "Add to Home Screen" / installable on desktop + mobile.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VEX",
    short_name: "VEX",
    description: "Your trading command center — journal, edge, and discipline.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
