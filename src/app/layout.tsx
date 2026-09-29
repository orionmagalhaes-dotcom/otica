import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Ótica Central", template: "%s | Ótica Central" }, description: "Gestão integrada para ótica" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0d5c52" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}<Toaster richColors position="top-center" /></body></html>;
}
