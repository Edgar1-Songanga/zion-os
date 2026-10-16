import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ZION OS — RESA",
    short_name: "RESA",
    description: "Comunidade, mensagens e partilha espiritual no ZION OS.",
    start_url: "/resa",
    scope: "/",
    display: "standalone",
    background_color: "#0C1A3D",
    theme_color: "#0C1A3D",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
