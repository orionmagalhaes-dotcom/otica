"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const storageKey = "otica-theme";

function applyTheme(amoled: boolean) {
  const theme = amoled ? "amoled" : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = amoled ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", amoled ? "#000000" : "#0d5c52");
  try { localStorage.setItem(storageKey, theme); } catch {}
  window.dispatchEvent(new Event("otica-theme-change"));
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const amoled = useSyncExternalStore(
    (callback) => {
      window.addEventListener("otica-theme-change", callback);
      return () => window.removeEventListener("otica-theme-change", callback);
    },
    () => document.documentElement.dataset.theme === "amoled",
    () => false,
  );

  function toggle() {
    const next = !amoled;
    applyTheme(next);
  }

  const label = amoled ? "Usar modo claro" : "Usar modo AMOLED";
  return <button type="button" className={cn("theme-toggle", compact && "theme-toggle-compact")} onClick={toggle} aria-label={label} aria-pressed={amoled} title={label}>
    {amoled ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    {!compact && <span>{amoled ? "Modo claro" : "Modo AMOLED"}</span>}
  </button>;
}
