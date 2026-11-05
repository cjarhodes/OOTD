import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OOTD",
    short_name: "OOTD",
    description: "Outfit of the day from the wardrobe you already own, layered for the weather.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfbf9",
    theme_color: "#fbfbf9",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
