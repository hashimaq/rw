import { RedWingsLogo } from "@/components/branding/red-wings-logo";
import { cn } from "@/lib/utils/cn";

/** Home-only team lockup: logo → crimson wordmark → gold quoted slogan. */
export function HomeHeroBranding({
  logoSize = 152,
  priority = false,
  animate = false,
}: {
  logoSize?: number;
  priority?: boolean;
  animate?: boolean;
}) {
  return (
    <div className="rw-home-identity">
      <div className={cn("rw-home-identity-panel", animate && "rw-animate-in")}>
        <RedWingsLogo
          size={logoSize}
          variant="hero"
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
