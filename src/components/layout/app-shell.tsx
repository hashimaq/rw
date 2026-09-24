import { Suspense } from "react";
import { AppHeaderFallback } from "@/components/layout/app-header-fallback";
import { AppHeaderShell } from "@/components/layout/app-header-shell";
import { AppProviders } from "@/components/layout/app-providers";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="rw-app-bg flex min-h-full flex-col text-[var(--rw-text)]">
        <Suspense fallback={<AppHeaderFallback />}>
          <AppHeaderShell />
        </Suspense>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
          {children}
        </main>
        <MobileTabBar />
      </div>
    </AppProviders>
  );
}
