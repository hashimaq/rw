"use client";

import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label={
        resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      className="rw-focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] text-[var(--rw-text)] shadow-sm transition-transform active:scale-95"
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
    >
      {resolved === "dark" ? (
        <span aria-hidden className="text-lg">
          ☀
        </span>
      ) : (
        <span aria-hidden className="text-lg">
          ☽
        </span>
      )}
    </button>
  );
}
