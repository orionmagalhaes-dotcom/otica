import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ótica Central — Gestão",
    short_name: "Ótica Central",
    description: "Gestão integrada de clientes, exames, estoque, vendas e financeiro.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f6f2",
    theme_color: "#0d5c52",
    lang: "pt-BR",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Exames", short_name: "Exames", url: "/agenda", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Nova venda", short_name: "Venda", url: "/vendas/nova", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Clientes", short_name: "Clientes", url: "/clientes", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
