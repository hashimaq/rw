import { BRAND_LOGO_SRC } from "@/lib/brand/logo-src";
import { cn } from "@/lib/utils/cn";

/**
 * Official logo only — plain <img> to /brand/rwings.jpg (no Next/Image optimizer cache).
 */
export function BrandLogoImage({
  size,
  priority = false,
  className,
}: {
  size: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
      alt="Red Wings Cricket logo"
      width={size}
      height={size}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn("h-full w-full object-cover object-center", className)}
    />
  );
}
