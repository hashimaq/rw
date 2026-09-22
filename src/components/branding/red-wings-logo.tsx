import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export const LOGO_SRC = "/brand/red-wings-logo.jpg";

type LogoVariant = "plain" | "square" | "hero" | "header";

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
  const fitClass =
    variant === "header" ? "object-contain object-center" : "object-cover object-center";

  const image = (
    <Image
      src={LOGO_SRC}
      alt="Red Wings Cricket logo"
      width={size}
      height={size}
      priority={priority}
      className={cn("h-full w-full", fitClass, className)}
    />
  );

  if (variant === "header") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--rw-logo-square-border)] bg-[var(--rw-logo-square-bg)] shadow-sm",
          animate && "rw-animate-in",
        )}
        style={{ width: size, height: size }}
      >
        {image}
      </span>
    );
  }

  if (variant === "plain") {
    return (
      <span
        className={cn(
          "inline-block overflow-hidden rounded-lg border border-[var(--rw-logo-square-border)] bg-[var(--rw-logo-square-bg)] shadow-sm",
          animate && "rw-animate-in",
        )}
        style={{ width: size, height: size }}
      >
        {image}
      </span>
    );
  }

  const isHero = variant === "hero";

  return (
    <span
      className={cn(
        "rw-logo-square inline-flex",
        isHero && "rw-logo-square-hero",
        animate && "rw-animate-in",
        isHero && "rw-animate-in-delay-1",
      )}
    >
      <span
        className="rw-logo-square-inner inline-flex shrink-0"
        style={{ width: size, height: size }}
      >
        {image}
      </span>
    </span>
  );
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
}: {
  logoSize?: number;
  priority?: boolean;
  animate?: boolean;
  panel?: boolean;
}) {
  const inner = (
    <>
      <RedWingsLogo
        size={logoSize}
        variant="hero"
        priority={priority}
        animate={animate}
      />
      <RedWingsWordmark hero animate={animate} />
    </>
  );

  return (
    <div className="rw-identity-block">
      {panel ? <div className="rw-identity-panel">{inner}</div> : inner}
    </div>
  );
}
