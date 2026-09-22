"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

/** Renders overlays on document.body so sticky/transform ancestors cannot clip them. */
export function OverlayPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
