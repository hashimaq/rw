"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePwaInstallOptional } from "@/components/pwa/pwa-provider";
import { cn } from "@/lib/utils/cn";

import { BRAND_LOGO_SRC } from "@/lib/brand/logo-src";

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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!pwa) return null;

  const { installPromptMode, canNativeInstall } = pwa;
  const showNativeCta = canNativeInstall && installPromptMode === "native_prompt";
  const showIosGuide = installPromptMode === "ios_manual";
  const showManualGuide = installPromptMode === "manual_unsupported";

  const onInstall = async () => {
    if (!canNativeInstall) return;
    setInstalling(true);
    try {
      await pwa.triggerInstall();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      className="flex min-h-dvh min-w-0 flex-col overflow-x-hidden overflow-y-auto bg-[#0a0c10] text-white"
      role="main"
      aria-labelledby="rw-install-title"
    >
      <div className="pointer-events-none fixed inset-0 opacity-90" aria-hidden>
        <div className="absolute -left-1/4 top-0 h-[55vh] w-[70vw] max-w-full rounded-full bg-red-700/25 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-[45vh] w-[65vw] max-w-full rounded-full bg-red-900/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col justify-center px-5 py-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8">
        <div className="flex w-full min-w-0 flex-col items-center text-center">
          <div className="relative mb-6 h-32 w-32 shrink-0 overflow-hidden rounded-3xl border-2 border-red-600/50 shadow-[0_0_48px_rgba(185,28,28,0.4)] sm:h-36 sm:w-36">
            <Image
              src={BRAND_LOGO_SRC}
              alt="Red Wings Cricket"
              fill
              className="object-cover"
              priority
              sizes="144px"
            />
          </div>
          <p className="font-[family-name:var(--font-rw-display)] text-4xl tracking-[0.14em] text-white sm:text-5xl">
            RED WINGS
          </p>
          <p className="mt-2 font-[family-name:var(--font-rw-slogan)] text-lg italic text-red-300/95 sm:text-xl">
            PLAY BOLD. STAND UNITED.
          </p>
          <h1
            id="rw-install-title"
            className="mt-5 font-[family-name:var(--font-rw-display)] text-3xl tracking-wide text-white sm:text-4xl"
          >
            INSTALL RED WINGS APP
          </h1>
          <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base">
            Install the Red Wings Cricket App for the complete experience —
            live scoring, scorecards, and offline match-day scoring on your
            device.
          </p>
        </div>

        <div className="mt-8 w-full min-w-0 shrink-0 space-y-4">
          {showNativeCta ? (
            <button
              type="button"
              disabled={installing}
              className={cn(
                "rw-focus-ring flex w-full min-h-[4rem] items-center justify-center gap-3 rounded-2xl",
                "bg-gradient-to-b from-red-500 to-red-700 text-lg font-bold uppercase tracking-wide text-white",
                "shadow-[0_8px_32px_rgba(185,28,28,0.45)] active:scale-[0.98] disabled:opacity-70",
                "sm:min-h-[4.5rem] sm:text-xl",
              )}
              onClick={() => void onInstall()}
            >
              <InstallIcon className="h-8 w-8 shrink-0" />
              {installing ? "Opening install…" : "Install App"}
            </button>
          ) : null}

          {showIosGuide ? (
            <div className="w-full min-w-0 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
              <p className="text-center text-base font-semibold text-zinc-100">
                Add Red Wings to your Home Screen
              </p>
              <ol className="space-y-3 text-sm text-zinc-300">
                <li className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600/30 text-red-200">
                    <ShareIcon className="h-5 w-5" />
                  </span>
                  <span className="pt-2 text-left">
                    Tap the Safari <strong>Share</strong> button
                  </span>
                </li>
                <li className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600/30 text-xs font-bold text-red-100">
                    +
                  </span>
                  <span className="pt-2 text-left">
                    Select <strong>Add to Home Screen</strong>
                  </span>
                </li>
                <li className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600/30 text-xs font-bold text-red-100">
                    4
                  </span>
                  <span className="pt-2 text-left">
                    Tap <strong>Add</strong>, then open Red Wings from your Home
                    Screen
                  </span>
                </li>
              </ol>
            </div>
          ) : null}

          {showManualGuide ? (
            <div className="w-full min-w-0 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm leading-relaxed text-zinc-300 sm:p-5">
              <p className="mb-2 font-semibold text-zinc-100">
                Install from a supported browser
              </p>
              <p>
                This browser cannot install Red Wings directly. Open this link
                in <strong>Chrome</strong> or <strong>Edge</strong> on Android
                or desktop, then use the browser menu →{" "}
                <strong>Install app</strong>. Red Wings is available only as an
                installed application.
              </p>
            </div>
          ) : null}

          {!showNativeCta && !showIosGuide && !showManualGuide ? (
            <p className="text-center text-sm text-zinc-500">
              Checking install availability…
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
