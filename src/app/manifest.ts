import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Red Wings Cricket",
    short_name: "Red Wings",
    description:
      "PLAY BOLD. STAND UNITED. Live scoring, scorecards, and offline-capable match scoring for Red Wings Cricket.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f1218",
    theme_color: "#b91c1c",
    icons: [
      {
        src: "/brand/red-wings-logo.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/brand/red-wings-logo.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
