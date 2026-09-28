import { RedWingsLogo } from "@/components/branding/red-wings-logo";
import { cn } from "@/lib/utils/cn";

/** Home hero — official rwings.jpg lockup (mobile-first size). */
export function HomeHeroBranding({
  logoSize = 152,
  priority = false,
  animate = false,
}: {
  logoSize?: number;
  priority?: boolean;
  animate?: boolean;
}) {
  const displaySize = Math.max(logoSize, 128);

  return (
    <div className="rw-home-identity">
      <div className={cn("flex flex-col items-center text-center", animate && "rw-animate-in")}>
        <RedWingsLogo
          size={displaySize}
          variant="brand"
          priority={priority}
          animate={animate}
        />
        <div
          className={cn(
            "rw-home-identity-type",
            animate && "rw-animate-in rw-animate-in-delay-2",
          )}
        >
          <h1 className="rw-home-wordmark" aria-label="Red Wings">
            RED WINGS
          </h1>
          <p className="rw-home-slogan" aria-label="Play Bold. Stand United.">
            <span className="rw-home-slogan-quote" aria-hidden>
              &ldquo;
            </span>
            PLAY BOLD. STAND UNITED.
            <span className="rw-home-slogan-quote" aria-hidden>
              &rdquo;
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
