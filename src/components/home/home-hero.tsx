import { HomeHeroBranding } from "@/components/home/home-hero-branding";
import { RwButton } from "@/components/ui/rw-button";
import { cn } from "@/lib/utils/cn";

interface HomeHeroProps {
  /** Shorter hero when a live match is the main focus on Home. */
  compact?: boolean;
}

export function HomeHero({ compact = false }: HomeHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-[var(--rw-border)] bg-gradient-to-br from-[var(--rw-ivory)] via-[var(--rw-bg-elevated)] to-[var(--rw-hero-to)] shadow-[var(--rw-shadow-md)]",
        compact ? "px-5 py-6 sm:px-8 sm:py-7" : "px-6 py-10 sm:px-10 sm:py-12",
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--rw-primary-glow)] blur-3xl opacity-80"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-[var(--rw-slogan-gold-soft)] blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col items-center text-center">
        <HomeHeroBranding
          logoSize={compact ? 112 : 152}
          priority
          animate={!compact}
        />
        {compact ? null : (
          <div className="rw-animate-in rw-animate-in-delay-3 mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <RwButton href="/start-scoring" className="w-full sm:w-auto sm:min-w-[11rem]">
              Start Scoring
            </RwButton>
            <RwButton
              href="/matches"
              variant="secondary"
              className="w-full sm:w-auto sm:min-w-[11rem]"
            >
              View Matches
            </RwButton>
          </div>
        )}
      </div>
    </section>
  );
}
