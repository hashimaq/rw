import { isInstallFirstGateEnabled } from "@/lib/pwa/install-gate-enabled";

function buildGateInitScript(gateEnabled: boolean): string {
  if (!gateEnabled) return "";
  return `(function(){try{var standalone=window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||window.navigator.standalone===true;if(standalone)return;document.documentElement.setAttribute('data-rw-install-gate','pending');document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}catch(e){}})();`;
}

export function PwaGateInitScript() {
  const gateEnabled = isInstallFirstGateEnabled();
  const code = buildGateInitScript(gateEnabled);
  if (!code) return null;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: code }}
      suppressHydrationWarning
    />
  );
}
