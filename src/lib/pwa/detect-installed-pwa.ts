/** True when this origin’s PWA is already on the device (browser tab, not standalone). */
export async function isRedWingsAlreadyInstalledOnDevice(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<{ id?: string; platform?: string }[]>;
  };
  if (!nav.getInstalledRelatedApps) return false;
  try {
    const related = await nav.getInstalledRelatedApps();
    if (related.length === 0) return false;
    const origin = window.location.origin;
    return related.some((app) => {
      const entry = app as { platform?: string; id?: string; url?: string };
      if (entry.platform === "webapp") return true;
      if (entry.url?.startsWith(origin)) return true;
      return entry.id === "/" || entry.id === origin;
    });
  } catch {
    return false;
  }
}
