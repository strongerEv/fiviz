import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Firman Service",
    short_name: "Fiviz",
    description: "Servis HP Firman Service: estimasi biaya, reservasi, dan lacak servis.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fc",
    theme_color: "#1748d9",
    lang: "id",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
