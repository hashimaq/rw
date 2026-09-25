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
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    document.documentElement.removeAttribute("data-rw-install-gate");

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!pwa) return null;

  const { installPromptMode, canNativeInstall, hydrated } = pwa;
  const showNativeCta = canNativeInstall && installPromptMode === "native_prompt";
  const showIosGuide = installPromptMode === "ios_manual";
  const showAndroidGuide = installPromptMode === "android_manual";
  const showDesktopGuide = installPromptMode === "manual_unsupported";

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
      className="fixed inset-0 z-[10000] flex min-h-dvh min-w-0 flex-col overflow-x-hidden overflow-y-auto bg-[#f3f4f8] text-[#0f1218]"
      role="main"
      aria-labelledby="rw-install-title"
    >
      <div className="pointer-events-none fixed inset-0 opacity-80" aria-hidden>
        <div className="absolute -left-1/4 top-0 h-[50vh] w-[70vw] max-w-full rounded-full bg-red-200/50 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-[40vh] w-[65vw] max-w-full rounded-full bg-red-100/60 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col justify-center px-5 py-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8">
        <div className="flex w-full min-w-0 flex-col items-center text-center">
          <div className="relative mb-6 h-32 w-32 shrink-0 overflow-hidden rounded-3xl border-2 border-red-200 shadow-[0_8px_32px_rgba(185,28,28,0.2)] sm:h-36 sm:w-36">
            <Image
              src={BRAND_LOGO_SRC}
              alt="Red Wings Cricket"
              fill
              className="object-cover"
              priority
              sizes="144px"
            />
          </div>
          <p className="font-[family-name:var(--font-rw-display)] text-4xl tracking-[0.14em] text-[#b91c1c] sm:text-5xl">
            RED WINGS CRICKET
          </p>
          <h1
            id="rw-install-title"
            className="mt-6 font-[family-name:var(--font-rw-display)] text-2xl tracking-wide text-[#0f1218] sm:text-3xl"
          >
            Install the Red Wings app to continue
          </h1>
          <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-zinc-600 sm:text-base">
            Red Wings is designed to run as an installed app for the complete
            experience.
          </p>
        </div>

        <div className="mt-8 w-full min-w-0 shrink-0 space-y-4">
          {showNativeCta ? (
            <button
              type="button"
              disabled={installing}
              className={cn(
                "rw-focus-ring flex w-full min-h-[3rem] items-center justify-center gap-3 rounded-2xl",
                "bg-gradient-to-b from-red-600 to-red-700 text-lg font-bold uppercase tracking-wide text-white",
                "shadow-[0_8px_28px_rgba(185,28,28,0.35)] active:scale-[0.98] disabled:opacity-70",
                "sm:min-h-[3.25rem] sm:text-xl",
              )}
              onClick={() => void onInstall()}
            >
              <InstallIcon className="h-7 w-7 shrink-0" />
              {installing ? "Opening install…" : "Install App"}
            </button>
          ) : null}

          {showIosGuide ? (
            <div className="w-full min-w-0 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-center text-base font-semibold text-[#0f1218]">
                Add Red Wings to your Home Screen
              </p>
              <ol className="space-y-3 text-sm text-zinc-700">
                <li className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                    <ShareIcon className="h-5 w-5" />
                  </span>
                  <span className="pt-2.5 text-left">
                    Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
                  </span>
                </li>
                <li className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-xs font-bold text-red-700">
                    ✓
                  </span>
                  <span className="pt-2.5 text-left">
                    Open <strong>Red Wings Cricket</strong> from your Home Screen
                    to continue
                  </span>
                </li>
              </ol>
            </div>
          ) : null}

          {showAndroidGuide ? (
            <div className="w-full min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-700 shadow-sm sm:p-5">
              <p className="mb-2 font-semibold text-[#0f1218]">
                Install from Chrome
              </p>
              <p>
                Use your browser&apos;s <strong>Install app</strong> or{" "}
                <strong>Add to Home screen</strong> option (menu or address bar),
                then open Red Wings from your home screen.
              </p>
            </div>
          ) : null}

          {showDesktopGuide ? (
            <div className="w-full min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-700 shadow-sm sm:p-5">
              <p className="mb-2 font-semibold text-[#0f1218]">
                Install from your browser
              </p>
              <p>
                Use the browser&apos;s <strong>Install app</strong> option in the
                address bar or menu, then launch Red Wings from your installed
                apps.
              </p>
            </div>
          ) : null}

          {!hydrated && !showNativeCta && !showIosGuide && !showAndroidGuide && !showDesktopGuide ? (
            <p className="text-center text-sm text-zinc-500">
              Checking install availability…
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
