import type { MetadataRoute } from "next";
import { BRAND_LOGO_SRC } from "@/lib/brand/logo-src";

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
    background_color: "#f3f4f8",
    theme_color: "#b91c1c",
    icons: [
      {
        src: BRAND_LOGO_SRC,
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: BRAND_LOGO_SRC,
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: BRAND_LOGO_SRC,
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
