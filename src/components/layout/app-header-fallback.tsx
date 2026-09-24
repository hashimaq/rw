import { RedWingsLogo } from "@/components/branding/red-wings-logo";

/** Lightweight header placeholder while auth resolves (does not block page body). */
export function AppHeaderFallback() {
  return (
    <header className="sticky top-0 z-40 overflow-hidden border-b border-[var(--rw-border)] bg-[color-mix(in_srgb,var(--rw-bg)_88%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-[3.75rem] max-w-6xl items-center gap-3 px-4 sm:px-6">
        <RedWingsLogo size={36} variant="header" className="shrink-0" />
        <div className="min-w-0 flex-1" aria-hidden />
      </div>
    </header>
  );
}
