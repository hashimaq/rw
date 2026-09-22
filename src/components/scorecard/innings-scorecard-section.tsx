import { FallOfWicketsDisplay } from "@/components/scorecard/fall-of-wickets-display";
import { InningsSummaryPanel } from "@/components/scorecard/innings-summary-panel";
import { ScorecardOverByOver } from "@/components/scorecard/scorecard-over-by-over";
import {
  ScorecardBattingTable,
  ScorecardBowlingTable,
} from "@/components/scorecard/scorecard-template-grid";
import { ScorecardTemplateBar } from "@/components/scorecard/scorecard-template-bar";
import {
  inningsScorecardDisplayState,
  inningsStatusBanner,
} from "@/lib/scorecard/scorecard-innings-display";
import type {
  ScorecardInningsBuilt,
  ScorecardInningsDocument,
} from "@/lib/scorecard/types";
import type { MatchStatus } from "@/lib/database/types";

function inningsOrdinal(n: number): string {
  if (n === 1) return "1st Innings";
  if (n === 2) return "2nd Innings";
  return `${n}th Innings`;
}

function dismissalCell(isNotOut: boolean, dismissal: string | null): string {
  if (isNotOut) return "not out";
  return dismissal ?? "out";
}

function mapBattingRows(doc: ScorecardInningsDocument) {
  return doc.battingFigures.map((b, i) => {
    if (b.didNotBat) {
      return {
        key: `dnb-${b.name}-${i}`,
        name: b.name,
        dismissal: "Did not bat",
        runs: "",
        balls: "",
        fours: "",
        sixes: "",
        strikeRate: "",
        didNotBat: true,
      };
    }
    return {
      key: `${b.name}-${b.runs}-${b.balls}`,
      name: `${b.name}${b.isNotOut ? " *" : ""}`,
      dismissal: dismissalCell(b.isNotOut, b.dismissal),
      runs: String(b.runs),
      balls: String(b.balls),
      fours: String(b.fours),
      sixes: String(b.sixes),
      strikeRate: b.balls > 0 ? b.strikeRate.toFixed(2) : "—",
      didNotBat: false,
    };
  });
}

function yetToBatNames(doc: ScorecardInningsDocument): string[] {
  return doc.battingFigures
    .filter((b) => b.didNotBat)
    .map((b) => b.name);
}

function mapBowlingRows(doc: ScorecardInningsDocument) {
  return doc.bowlingFigures.map((b) => ({
    key: b.name,
    name: b.name,
    overs: b.overs,
    maidens: String(b.maidens),
    runs: String(b.runs),
    wickets: String(b.wickets),
    noBalls: String(b.noBalls),
    wides: String(b.wides),
    economy: b.economy.toFixed(2),
  }));
}

export function InningsNotStartedPlaceholder({
  inningsNumber,
}: {
  inningsNumber: number;
}) {
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-dashed border-[var(--rw-border)] bg-[var(--rw-surface)]">
      <ScorecardTemplateBar>{inningsOrdinal(inningsNumber)} — Not Started</ScorecardTemplateBar>
    </section>
  );
}

export function InningsScorecardSection({
  built,
  opponentName,
  matchStatus,
}: {
  built: ScorecardInningsBuilt;
  opponentName: string;
  matchStatus: MatchStatus;
  redWingsPlayingXi?: unknown;
}) {
  const doc = built.innings;
  const display = inningsScorecardDisplayState(built);

  if (display === "not_started") {
    return <InningsNotStartedPlaceholder inningsNumber={doc.inningsNumber} />;
  }

  const battingRows = mapBattingRows(doc);
  const bowlingRows = mapBowlingRows(doc);
  const yetToBat = yetToBatNames(doc);

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-[var(--rw-border)] bg-[var(--rw-surface)]">
      <p className="min-w-0 break-words border-b border-[var(--rw-border)] px-3 py-2 text-[12px] text-[var(--rw-muted)] sm:px-4">
        {inningsOrdinal(doc.inningsNumber)} · {inningsStatusBanner(built, matchStatus)}
      </p>

      {/* Master template order: batting → summary → yet to bat → bowling → FOW → extras sections */}
      <ScorecardBattingTable rows={battingRows} />
      <InningsSummaryPanel doc={doc} />

      {yetToBat.length > 0 ? (
        <p className="min-w-0 break-words border-t border-[var(--rw-border)] px-3 py-3 text-[13px] leading-relaxed sm:px-4">
          <span className="font-semibold text-[var(--rw-text)]">Yet To Bat — </span>
          <span className="text-[var(--rw-muted)]">{yetToBat.join(", ")}</span>
        </p>
      ) : null}

      <div className="border-t border-[var(--rw-border)]">
        <ScorecardBowlingTable rows={bowlingRows} />
      </div>

      {doc.fallOfWickets.length > 0 ? (
        <div className="border-t border-[var(--rw-border)]">
          <ScorecardTemplateBar>Fall of wickets</ScorecardTemplateBar>
          <FallOfWicketsDisplay fallOfWickets={doc.fallOfWickets} />
        </div>
      ) : null}

      {doc.partnerships.length > 0 ? (
        <div className="border-t border-[var(--rw-border)]">
          <ScorecardTemplateBar>Partnerships</ScorecardTemplateBar>
          <ul className="divide-y divide-[var(--rw-border)] px-3 py-1 text-[13px] sm:px-4">
            {doc.partnerships.map((p, i) => (
              <li key={`${p.batters[0]}-${p.batters[1]}-${i}`} className="py-2">
                <span className="font-semibold text-[var(--rw-primary)]">
                  {p.batters[0]}
                </span>
                <span className="text-[var(--rw-muted)]"> & </span>
                <span className="font-semibold text-[var(--rw-primary)]">
                  {p.batters[1]}
                </span>
                <span className="tabular-nums text-[var(--rw-text)]">
                  {" "}
                  — {p.runs} runs
                  {p.balls > 0 ? ` (${p.balls} balls)` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t border-[var(--rw-border)]">
        <ScorecardTemplateBar>Over by Over</ScorecardTemplateBar>
        <ScorecardOverByOver overs={built.overByOver} />
      </div>
    </section>
  );
}
