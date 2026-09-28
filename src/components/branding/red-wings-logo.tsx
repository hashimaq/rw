import { BRAND_LOGO_SRC } from "@/lib/brand/logo-src";
import { BrandLogoImage } from "@/components/branding/brand-logo-image";
import { cn } from "@/lib/utils/cn";

export const LOGO_SRC = BRAND_LOGO_SRC;

type LogoVariant = "plain" | "square" | "hero" | "header" | "brand";

interface RedWingsLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
  variant?: LogoVariant;
  animate?: boolean;
}

export function RedWingsLogo({
  size = 48,
  className,
  priority = false,
  variant = "plain",
  animate = false,
}: RedWingsLogoProps) {
  const image = (
    <BrandLogoImage
      size={size}
      priority={priority}
      className={className}
    />
  );

  if (variant === "brand" || variant === "hero") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 overflow-hidden rounded-3xl border-2 border-red-200 shadow-[0_8px_32px_rgba(185,28,28,0.2)]",
          animate && "rw-animate-in",
          variant === "hero" && "rw-animate-in-delay-1",
        )}
        style={{ width: size, height: size }}
      >
        {image}
      </span>
    );
  }

  if (variant === "header") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-red-200/80 bg-white shadow-sm",
          animate && "rw-animate-in",
        )}
        style={{ width: size, height: size }}
      >
        {image}
      </span>
    );
  }

  if (variant === "plain" || variant === "square") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 overflow-hidden rounded-2xl border border-red-200/80 bg-white shadow-sm",
          animate && "rw-animate-in",
        )}
        style={{ width: size, height: size }}
      >
        {image}
      </span>
    );
  }

  return image;
}

export function RedWingsWordmark({
  compact = false,
  hero = false,
  animate = false,
  showSlogan = true,
}: {
  compact?: boolean;
  hero?: boolean;
  animate?: boolean;
  showSlogan?: boolean;
}) {
  return (
    <div
      className={cn(
        hero ? "mt-6 space-y-2" : compact ? "leading-tight" : "mt-2 space-y-0.5",
        animate && !compact && "rw-animate-in rw-animate-in-delay-2",
      )}
    >
      <p
        className={cn(
          "font-bold tracking-[0.24em] text-[var(--rw-text)]",
          hero ? "text-2xl sm:text-[1.75rem]" : "text-sm sm:text-base",
        )}
      >
        RED WINGS
      </p>
      {!compact && showSlogan && (
        <p className={cn("rw-slogan", !hero && "text-[10px] tracking-[0.12em]")}>
          &ldquo;PLAY BOLD. STAND UNITED.&rdquo;
        </p>
      )}
    </div>
  );
}

/** Logo + wordmark + gold slogan — primary team identity block. */
export function RedWingsIdentityBlock({
  logoSize = 148,
  priority = false,
  animate = false,
  panel = false,
  logoOnly = false,
}: {
  logoSize?: number;
  priority?: boolean;
  animate?: boolean;
  panel?: boolean;
  logoOnly?: boolean;
}) {
  const inner = logoOnly ? (
    <RedWingsLogo
      size={logoSize}
      variant="brand"
      priority={priority}
      animate={animate}
    />
  ) : (
    <>
      <RedWingsLogo
        size={logoSize}
        variant="brand"
        priority={priority}
        animate={animate}
      />
      <RedWingsWordmark hero animate={animate} />
    </>
  );

  if (panel && !logoOnly) {
    return (
      <div className="rw-identity-block">
        <div className="rw-identity-panel">{inner}</div>
      </div>
    );
  }

  return <div className="rw-identity-block">{inner}</div>;
}
