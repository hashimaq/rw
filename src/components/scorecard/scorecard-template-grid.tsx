import { cn } from "@/lib/utils/cn";

/**
 * Single responsive grid for all viewports — stats columns use fixed fr units
 * so the table fits without horizontal scroll (master mobile template).
 */
const BATTING_STAT_COLS = "repeat(5, minmax(1.65rem, 0.42fr))";
const BATTING_GRID = `minmax(0, 1fr) ${BATTING_STAT_COLS}`;
const BOWLING_GRID = `minmax(0, 1fr) repeat(5, minmax(1.65rem, 0.42fr))`;

function StatHeadRow({
  playerLabel,
  statLabels,
  gridTemplate,
}: {
  playerLabel: string;
  statLabels: string[];
  gridTemplate: string;
}) {
  return (
    <div
      className="grid items-end gap-x-1 border-b border-[var(--rw-border)] bg-[var(--rw-surface-hover)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--rw-primary)] sm:gap-x-1.5 sm:px-4 sm:text-[11px]"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <span className="min-w-0 text-left">{playerLabel}</span>
      {statLabels.map((h) => (
        <span key={h} className="min-w-0 text-right">
          {h}
        </span>
      ))}
    </div>
  );
}

export interface TemplateBattingRow {
  key: string;
  name: string;
  dismissal: string;
  runs: string;
  balls: string;
  fours: string;
  sixes: string;
  strikeRate: string;
  didNotBat?: boolean;
}

export function ScorecardBattingTable({ rows }: { rows: TemplateBattingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-3 py-4 text-sm text-[var(--rw-muted)] sm:px-4">
        No batters recorded.
      </p>
    );
  }

  return (
    <div className="min-w-0 w-full max-w-full">
      <StatHeadRow
        playerLabel="Batsman"
        statLabels={["R", "B", "4s", "6s", "SR"]}
        gridTemplate={BATTING_GRID}
      />
      <ul className="divide-y divide-[var(--rw-border)]">
        {rows.map((row) => (
          <li
            key={row.key}
            className="grid items-center gap-x-1 px-3 py-2.5 sm:gap-x-1.5 sm:px-4"
            style={{ gridTemplateColumns: BATTING_GRID }}
          >
            <div className="min-w-0">
              <p className="break-words text-[13px] font-bold leading-snug text-[var(--rw-text)] sm:text-sm">
                {row.name}
              </p>
              <p className="mt-0.5 break-words text-[11px] italic leading-snug text-[var(--rw-muted)] sm:text-[12px]">
                {row.dismissal}
              </p>
            </div>
              {!row.didNotBat ? (
                <>
                  <span className="text-right text-[12px] font-bold tabular-nums sm:text-[13px]">
                    {row.runs}
                  </span>
                  <span className="text-right text-[12px] font-semibold tabular-nums text-[var(--rw-text)] sm:text-[13px]">
                    {row.balls}
                  </span>
                  <span className="text-right text-[12px] font-semibold tabular-nums sm:text-[13px]">
                    {row.fours}
                  </span>
                  <span className="text-right text-[12px] font-semibold tabular-nums sm:text-[13px]">
                    {row.sixes}
                  </span>
                  <span className="text-right text-[12px] font-semibold tabular-nums sm:text-[13px]">
                    {row.strikeRate}
                  </span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                </>
              )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface TemplateBowlingRow {
  key: string;
  name: string;
  overs: string;
  maidens: string;
  runs: string;
  wickets: string;
  noBalls: string;
  wides: string;
  economy: string;
}

export function ScorecardBowlingTable({ rows }: { rows: TemplateBowlingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-3 py-4 text-sm text-[var(--rw-muted)] sm:px-4">
        No bowlers recorded.
      </p>
    );
  }

  return (
    <div className="min-w-0 w-full max-w-full">
      <StatHeadRow
        playerLabel="Bowler"
        statLabels={["O", "M", "R", "W", "Eco"]}
        gridTemplate={BOWLING_GRID}
      />
      <ul className="divide-y divide-[var(--rw-border)]">
        {rows.map((row) => {
          const extraBowling =
            Number(row.noBalls) > 0 || Number(row.wides) > 0
              ? [
                  Number(row.noBalls) > 0 ? `NB ${row.noBalls}` : null,
                  Number(row.wides) > 0 ? `WD ${row.wides}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : null;

          return (
            <li
              key={row.key}
              className="grid items-center gap-x-1 px-3 py-2.5 sm:gap-x-1.5 sm:px-4"
              style={{ gridTemplateColumns: BOWLING_GRID }}
            >
              <div className="min-w-0">
                <p className="break-words text-[13px] font-bold leading-snug sm:text-sm">
                  {row.name}
                </p>
                {extraBowling ? (
                  <p className="mt-0.5 text-[10px] text-[var(--rw-muted)] sm:text-[11px]">
                    {extraBowling}
                  </p>
                ) : null}
              </div>
              <span className="text-right text-[12px] font-semibold tabular-nums sm:text-[13px]">
                {row.overs}
              </span>
              <span className="text-right text-[12px] font-semibold tabular-nums sm:text-[13px]">
                {row.maidens}
              </span>
              <span className="text-right text-[12px] font-semibold tabular-nums sm:text-[13px]">
                {row.runs}
              </span>
              <span
                className={cn(
                  "text-right text-[12px] font-bold tabular-nums sm:text-[13px]",
                )}
              >
                {row.wickets}
              </span>
              <span className="text-right text-[12px] font-semibold tabular-nums sm:text-[13px]">
                {row.economy}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
