import { ScorecardTemplateBar } from "@/components/scorecard/scorecard-template-bar";
import type { PlayerOfMatchDisplay } from "@/lib/scorecard/player-of-match-display";

export function ManOfTheMatchSection({
  display,
}: {
  display: PlayerOfMatchDisplay;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-[var(--rw-border)] bg-[var(--rw-surface)]">
      <ScorecardTemplateBar>Man of the Match</ScorecardTemplateBar>
      <div className="px-3 py-4 sm:px-4">
        {!display.assigned ? (
          <p className="text-[13px] font-medium text-[var(--rw-muted)]">
            Man of the Match — Not Assigned
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-lg font-bold text-[var(--rw-primary)]">
              {display.name}
            </p>
            {display.teamLabel ? (
              <p className="text-[13px] font-semibold text-[var(--rw-muted)]">
                {display.teamLabel}
              </p>
            ) : null}
            {display.performanceSummary ? (
              <p className="pt-1 text-[13px] leading-relaxed text-[var(--rw-text)]">
                {display.performanceSummary}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
