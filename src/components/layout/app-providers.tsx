"use client";

import { SplashScreen } from "@/components/branding/splash-screen";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      {children}
    </>
  );
}
