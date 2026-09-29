import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ótica Central", template: "%s | Ótica Central" },
  description: "Gestão integrada para ótica",
  applicationName: "Ótica Central",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Ótica Central" },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0d5c52" };

const themeScript = `(()=>{try{const t=localStorage.getItem("otica-theme")==="amoled"?"amoled":"light",c=t==="amoled"?"#000000":"#0d5c52",u=()=>document.querySelector('meta[name="theme-color"]')?.setAttribute("content",c);document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t==="amoled"?"dark":"light";u();document.addEventListener("DOMContentLoaded",u,{once:true})}catch{document.documentElement.dataset.theme="light"}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body>{children}<PwaRegister/><Toaster richColors position="top-center" toastOptions={{style:{background:"var(--surface)",color:"var(--ink)",border:"1px solid var(--line)"}}}/></body></html>;
}
