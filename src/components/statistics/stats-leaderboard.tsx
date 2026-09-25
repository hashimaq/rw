import Link from "next/link";
import type { Player } from "@/lib/database/types";
import type { PlayerCareerStats } from "@/lib/statistics/player-career";
import { bowlingAverageFromCareer } from "@/lib/statistics/aggregate-career";
import { PlayerStatLink } from "@/components/statistics/player-stat-link";

export type StatsLeaderMetric =
  | "runs"
  | "wickets"
  | "strikeRate"
  | "economy"
  | "highestScore";

interface StatsLeaderboardProps {
  title: string;
  players: Player[];
  statsByPlayerId: Record<string, PlayerCareerStats>;
  metric: StatsLeaderMetric;
  minQualification?: { innings?: number; legalBalls?: number };
  limit?: number;
}

function metricValue(
  stats: PlayerCareerStats,
  metric: StatsLeaderMetric,
): number | null {
  switch (metric) {
    case "runs":
      return stats.runs;
    case "wickets":
      return stats.wickets;
    case "highestScore":
      return stats.highestScore;
    case "strikeRate":
      return stats.strikeRate;
    case "economy": {
      const avg = bowlingAverageFromCareer(stats);
      return stats.economy ?? avg;
    }
    default:
      return null;
  }
}

function formatMetric(
  stats: PlayerCareerStats,
  metric: StatsLeaderMetric,
): string {
  switch (metric) {
    case "runs":
      return String(stats.runs);
    case "wickets":
      return String(stats.wickets);
    case "highestScore":
      return stats.highestScore > 0 ? String(stats.highestScore) : "—";
    case "strikeRate":
      return stats.strikeRate != null ? stats.strikeRate.toFixed(1) : "—";
    case "economy":
      return stats.economy != null ? stats.economy.toFixed(2) : "—";
    default:
      return "—";
  }
}

export function StatsLeaderboard({
  title,
  players,
  statsByPlayerId,
  metric,
  minQualification,
  limit = 15,
}: StatsLeaderboardProps) {
  const rows = players
    .map((p) => ({
      player: p,
      stats: statsByPlayerId[p.id] ?? null,
    }))
    .filter(({ stats }) => {
      if (!stats) return false;
      if (minQualification?.innings && stats.innings < minQualification.innings) {
        return false;
      }
      if (
        minQualification?.legalBalls &&
        stats.ballsFaced < minQualification.legalBalls
      ) {
        return false;
      }
      const v = metricValue(stats, metric);
      return v != null && v > 0;
    })
    .sort((a, b) => {
      const av = metricValue(a.stats!, metric) ?? 0;
      const bv = metricValue(b.stats!, metric) ?? 0;
      if (metric === "economy") return av - bv;
      return bv - av;
    })
    .slice(0, limit);

  return (
    <section className="min-w-0 rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link
          href="/players"
          prefetch
          className="text-sm font-semibold text-[var(--rw-primary)]"
        >
          All profiles
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--rw-muted)]">
          No qualifying completed-match data yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--rw-border)]">
          {rows.map(({ player, stats }, index) => (
            <li
              key={player.id}
              className="flex min-w-0 items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-sm tabular-nums text-[var(--rw-muted)]">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <PlayerStatLink playerId={player.id} className="block truncate">
                    {player.full_name}
                  </PlayerStatLink>
                  {player.jersey_number != null ? (
                    <p className="text-xs text-[var(--rw-muted)]">
                      #{player.jersey_number}
                    </p>
                  ) : null}
                </div>
              </div>
              <span className="shrink-0 text-lg font-bold tabular-nums">
                {formatMetric(stats!, metric)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
