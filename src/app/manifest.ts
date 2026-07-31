import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "timetoeat System",
    short_name: "timetoeat",
    description:
      "ระบบจัดการซื้อเข้า คลังวัตถุดิบ สูตรอาหาร และต้นทุนของแต่ละสาขา",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    background_color: "#f6f8fb",
    theme_color: "#1f6f8b",
    icons: [
      {
        src: "/icons/timetoeat-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/timetoeat-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/timetoeat-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/timetoeat-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
