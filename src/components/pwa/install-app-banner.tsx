"use client";

import Image from "next/image";
import { usePwaInstallOptional } from "@/components/pwa/pwa-provider";
import { cn } from "@/lib/utils/cn";

export function InstallAppBanner() {
  const pwa = usePwaInstallOptional();
  if (!pwa) return null;

  const {
    uiMode,
    canNativeInstall,
    dismissBanner,
    triggerInstall,
    sheetOpen,
    closeInstallSheet,
  } = pwa;

  const showBanner =
    sheetOpen ||
    uiMode === "native_prompt" ||
    uiMode === "ios_manual" ||
    uiMode === "manual_unsupported";

  if (!showBanner) return null;

  const isNative = canNativeInstall && (uiMode === "native_prompt" || sheetOpen);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] flex min-w-0 justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
      role="region"
      aria-label="Install Red Wings Cricket"
    >
      <div
        className={cn(
          "w-full min-w-0 max-w-lg overflow-hidden rounded-2xl border border-red-900/40 shadow-2xl",
          "bg-gradient-to-br from-[#1a0a0a] via-[#0f1218] to-[#0f1218]",
        )}
      >
        <div className="flex min-w-0 gap-3 p-4 sm:gap-4 sm:p-5">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-red-800/50 sm:h-16 sm:w-16">
            <Image
              src="/brand/red-wings-logo.jpg"
              alt=""
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-rw-slogan)] text-sm italic text-red-300/90 sm:text-base">
              PLAY BOLD. STAND UNITED.
            </p>
            <h2 className="font-[family-name:var(--font-rw-display)] text-xl leading-tight tracking-wide text-white sm:text-2xl">
              Install Red Wings Cricket App
            </h2>
            <p className="mt-1 text-xs leading-snug text-zinc-400 sm:text-sm">
              Get faster access, a better experience, and offline scoring
              support.
            </p>
          </div>
          <button
            type="button"
            className="rw-focus-ring shrink-0 self-start rounded-lg px-2 py-1 text-xs font-semibold text-zinc-400"
            onClick={() => {
              dismissBanner();
              closeInstallSheet();
            }}
            aria-label="Dismiss install prompt"
          >
            ✕
          </button>
        </div>

        {isNative ? (
          <div className="border-t border-white/10 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
            <button
              type="button"
              className="rw-focus-ring rw-btn-primary min-h-11 w-full text-base font-semibold"
              onClick={() => void triggerInstall()}
            >
              Install App
            </button>
          </div>
        ) : (
          <div className="space-y-3 border-t border-white/10 px-4 pb-4 sm:px-5 sm:pb-5">
            <p className="text-sm font-medium text-zinc-200">
              {uiMode === "ios_manual"
                ? "Add to Home Screen (iPhone / iPad)"
                : "Install manually"}
            </p>
            <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-zinc-400 sm:text-sm">
              {uiMode === "ios_manual" ? (
                <>
                  <li>Tap the Share button in Safari</li>
                  <li>Select &quot;Add to Home Screen&quot;</li>
                  <li>Tap Add to install Red Wings Cricket</li>
                </>
              ) : (
                <>
                  <li>Use Chrome or Edge on desktop or Android for one-tap install</li>
                  <li>Or open the browser menu and choose Install app / Add to Home Screen</li>
                </>
              )}
            </ol>
            <button
              type="button"
              className="rw-focus-ring w-full min-h-11 rounded-xl border border-zinc-600 font-semibold text-zinc-200"
              onClick={() => {
                dismissBanner();
                closeInstallSheet();
              }}
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
