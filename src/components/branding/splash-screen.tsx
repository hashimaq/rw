"use client";

import { useEffect, useState } from "react";
import { RedWingsIdentityBlock } from "@/components/branding/red-wings-logo";

const SPLASH_KEY = "rw-splash-session";
const MIN_MS = 1200;
const MAX_MS = 1800;

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem(SPLASH_KEY);
    if (seen === "1") return;

    setVisible(true);
    sessionStorage.setItem(SPLASH_KEY, "1");

    const start = Date.now();
    const timer = window.setTimeout(() => {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_MS - elapsed);
      window.setTimeout(() => {
        setFadeOut(true);
        window.setTimeout(() => setVisible(false), 420);
      }, wait);
    }, 80);

    const safety = window.setTimeout(() => {
      setFadeOut(true);
      setVisible(false);
    }, MAX_MS);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(safety);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cnOverlay(fadeOut)}
      role="presentation"
      aria-hidden={fadeOut}
    >
      <div
        className="pointer-events-none flex flex-col items-center px-8"
        style={{ animation: "rw-splash-logo 0.9s ease both" }}
      >
        <RedWingsIdentityBlock logoSize={136} priority panel />
      </div>
    </div>
  );
}

function cnOverlay(fadeOut: boolean) {
  return [
    "fixed inset-0 z-[100] flex items-center justify-center",
    "bg-[var(--rw-bg)] rw-app-bg",
    "transition-opacity duration-500 ease-out",
    fadeOut ? "pointer-events-none opacity-0" : "opacity-100",
  ].join(" ");
}
