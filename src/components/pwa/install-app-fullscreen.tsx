"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePwaInstallOptional } from "@/components/pwa/pwa-provider";
import { cn } from "@/lib/utils/cn";

function InstallIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

export function InstallAppFullScreen() {
  const pwa = usePwaInstallOptional();
  const [installing, setInstalling] = useState(false);

  const visible = pwa?.fullScreenVisible ?? false;
  const uiMode = pwa?.uiMode ?? "hidden_installed";
  const canNative = pwa?.canNativeInstall ?? false;

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!pwa || !visible) return null;

  const showNativeCta =
    canNative && (uiMode === "native_prompt" || pwa.forceShow);
  const showIosGuide = uiMode === "ios_manual" && !canNative;
  const showManualGuide =
    uiMode === "manual_unsupported" && !canNative && !showIosGuide;

  const onInstall = async () => {
    if (!canNative) return;
    setInstalling(true);
    try {
      const outcome = await pwa.triggerInstall();
      if (outcome === "dismissed") {
        pwa.skipForSession();
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-dvh min-w-0 flex-col overflow-hidden bg-[#0a0c10] text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rw-install-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
      >
        <div className="absolute -left-1/4 top-0 h-[55vh] w-[70vw] rounded-full bg-red-700/25 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-[45vh] w-[65vw] rounded-full bg-red-900/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-12deg, transparent, transparent 48px, rgba(255,255,255,0.15) 48px, rgba(255,255,255,0.15) 49px)",
          }}
        />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 sm:pb-8 sm:pt-10">
        <div className="mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col items-center justify-between gap-6 sm:gap-8">
          <div className="flex w-full min-w-0 flex-col items-center text-center">
            <div className="relative mb-5 h-28 w-28 shrink-0 overflow-hidden rounded-3xl border-2 border-red-600/50 shadow-[0_0_40px_rgba(185,28,28,0.35)] sm:h-32 sm:w-32">
              <Image
                src="/brand/red-wings-logo.jpg"
                alt="Red Wings Cricket"
                fill
                className="object-cover"
                priority
                sizes="128px"
              />
            </div>
            <p className="font-[family-name:var(--font-rw-display)] text-4xl tracking-[0.12em] text-white sm:text-5xl">
              RED WINGS
            </p>
            <p className="mt-2 font-[family-name:var(--font-rw-slogan)] text-lg italic text-red-300/95 sm:text-xl">
              PLAY BOLD. STAND UNITED.
            </p>
            <h1
              id="rw-install-title"
              className="mt-4 text-balance text-xl font-semibold leading-snug text-zinc-100 sm:text-2xl"
            >
              Install the Red Wings Cricket App
            </h1>
            <p className="mt-3 max-w-sm text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base">
              Faster access, offline scoring, and a dedicated match-day
              experience on your device.
            </p>
          </div>

          <div className="w-full min-w-0 shrink-0 space-y-4">
            {showNativeCta ? (
              <button
                type="button"
                disabled={installing}
                className={cn(
                  "rw-focus-ring flex w-full min-h-[3.75rem] items-center justify-center gap-3 rounded-2xl",
                  "bg-gradient-to-b from-red-500 to-red-700 text-lg font-bold uppercase tracking-wide text-white",
                  "shadow-[0_8px_32px_rgba(185,28,28,0.45)] active:scale-[0.98] disabled:opacity-70",
                  "sm:min-h-[4.25rem] sm:text-xl",
                )}
                onClick={() => void onInstall()}
              >
                <InstallIcon className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
                {installing ? "Opening install…" : "Install App"}
              </button>
            ) : null}

            {showIosGuide ? (
              <div className="w-full min-w-0 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <p className="text-center text-base font-semibold text-zinc-100">
                  Install Red Wings on iPhone / iPad
                </p>
                <ol className="space-y-3 text-sm text-zinc-300">
                  <li className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600/30 text-red-200">
                      <ShareIcon className="h-5 w-5" />
                    </span>
                    <span className="pt-1.5 text-left">
                      Tap the <strong>Share</strong> button in Safari
                    </span>
                  </li>
                  <li className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600/30 text-xs font-bold text-red-100">
                      +
                    </span>
                    <span className="pt-1.5 text-left">
                      Select <strong>Add to Home Screen</strong>
                    </span>
                  </li>
                  <li className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600/30 text-xs font-bold text-red-100">
                      ✓
                    </span>
                    <span className="pt-1.5 text-left">
                      Tap <strong>Add</strong> to install
                    </span>
                  </li>
                </ol>
              </div>
            ) : null}

            {showManualGuide ? (
              <div className="w-full min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-zinc-300 sm:p-5">
                <p className="mb-2 font-semibold text-zinc-100">
                  Install from your browser
                </p>
                <p>
                  Use <strong>Chrome</strong> or <strong>Edge</strong> on
                  Android or desktop for one-tap install. Open the browser menu
                  and choose <strong>Install app</strong> or{" "}
                  <strong>Add to Home Screen</strong>.
                </p>
              </div>
            ) : null}

            <button
              type="button"
              className="rw-focus-ring mx-auto block py-2 text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-400 hover:underline sm:text-sm"
              onClick={() => pwa.continueInBrowser()}
            >
              Continue in Browser
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
