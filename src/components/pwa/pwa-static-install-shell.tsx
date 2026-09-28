import { isInstallFirstGateEnabled } from "@/lib/pwa/install-gate-enabled";
import { BRAND_LOGO_SRC } from "@/lib/brand/logo-src";

/** Shown synchronously before React hydrates when the PWA gate is active. */
export function PwaStaticInstallShell() {
  if (!isInstallFirstGateEnabled()) return null;

  return (
    <div
      id="rw-install-gate-static"
      aria-hidden
      className="fixed inset-0 z-[9999] flex min-h-dvh flex-col items-center justify-center bg-[#f3f4f8] px-5 text-[#0f1218]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BRAND_LOGO_SRC}
        alt=""
        width={96}
        height={96}
        className="mb-4 h-24 w-24 rounded-2xl border border-red-200 object-cover shadow-md"
      />
      <p className="font-[family-name:var(--font-rw-display)] text-3xl tracking-[0.12em] text-[#b91c1c]">
        RED WINGS CRICKET
      </p>
      <p className="mt-3 max-w-xs text-center text-sm text-zinc-600">
        Install the Red Wings app to continue
      </p>
      <p className="mt-6 min-h-[3.25rem] w-full max-w-sm rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-4 py-3 text-center text-lg font-bold uppercase tracking-wide text-white shadow-md">
        INSTALL APP
      </p>
    </div>
  );
}
