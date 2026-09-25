import type { PlayerCareerStats } from "@/lib/statistics/player-career";
import { bowlingAverageFromCareer } from "@/lib/statistics/aggregate-career";

function fmt(value: number | null | undefined, suffix = ""): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value}${suffix}`;
}

interface CareerStatGridProps {
  stats: PlayerCareerStats;
  variant?: "summary" | "full";
}

export function CareerStatGrid({ stats, variant = "full" }: CareerStatGridProps) {
  const bowlAvg = bowlingAverageFromCareer(stats);

  const summary: Array<[string, string]> = [
    ["Matches", String(stats.matches)],
    ["Runs", String(stats.runs)],
    ["Wickets", String(stats.wickets)],
    ["Catches", String(stats.catches)],
  ];

  const batting: Array<[string, string]> = [
    ["Innings", String(stats.innings)],
    ["Runs", String(stats.runs)],
    ["Balls", String(stats.ballsFaced)],
    ["Highest", String(stats.highestScore)],
    ["Average", fmt(stats.average)],
    ["Strike rate", fmt(stats.strikeRate)],
    ["4s", String(stats.fours)],
    ["6s", String(stats.sixes)],
    ["Ducks", String(stats.ducks)],
  ];

  const bowling: Array<[string, string]> = [
    ["Overs", stats.oversBowled > 0 ? String(stats.oversBowled) : "—"],
    ["Maidens", String(stats.maidens)],
    ["Runs", String(stats.runsConceded)],
    ["Wickets", String(stats.wickets)],
    ["Economy", fmt(stats.economy)],
    ["Average", fmt(bowlAvg)],
    ["Best", stats.bestBowling ?? "—"],
  ];

  const team: Array<[string, string]> = [
    ["Wins", String(stats.wins)],
    ["Losses", String(stats.losses)],
    ["Captain (M)", String(stats.captaincyMatches)],
    ["Captain W/L", `${stats.captaincyWins}/${stats.captaincyLosses}`],
  ];

  const sections =
    variant === "summary"
      ? [{ title: "Career", rows: summary }]
      : [
          { title: "Batting", rows: batting },
          { title: "Bowling", rows: bowling },
          { title: "Team", rows: team },
        ];

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          {variant === "full" ? (
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--rw-muted)]">
              {section.title}
            </h3>
          ) : null}
          <dl
            className={
              variant === "summary"
                ? "mt-0 grid grid-cols-2 gap-4 sm:grid-cols-4"
                : "mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            }
          >
            {section.rows.map(([label, value]) => (
              <div key={`${section.title}-${label}`} className="min-w-0">
                <dt className="text-xs text-[var(--rw-muted)]">{label}</dt>
                <dd className="truncate text-lg font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
