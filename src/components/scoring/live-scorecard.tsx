"use client";

import { formatDeliveryLabel } from "@/lib/scoring-engine/format-ball";
import {
  deliveryChipClassName,
  deliveryChipTone,
} from "@/lib/scoring-engine/delivery-chip-style";
import {
  formatCurrentRunRate,
  formatRequiredRunRate,
} from "@/lib/scoring-engine/innings-live";
import type { DeliveryInput, InningsScoreState } from "@/lib/scoring-engine/types";
import type { CreaseDisplayBatter } from "@/lib/scoring/crease-sync";
import { economy, strikeRate } from "@/lib/scoring-engine/utils";
import { groupDeliveriesByOver } from "@/lib/scorecard/group-deliveries-by-over";
import {
  battingOrder,
  bowlingOrder,
} from "@/lib/scorecard/innings-player-order";
import { cn } from "@/lib/utils/cn";

export type MatchCentreTab = "scoring" | "scorecard" | "balls" | "info";

export interface LiveScorecardProps {
  opponentName: string;
  matchNumber: string;
  battingTeamLabel: string;
  inningsNumber: number;
  totalRuns: number;
  wickets: number;
  legalBalls: number;
  oversDisplay: string;
  oversLimit: number;
  extrasTotal: number;
  isChaseInnings: boolean;
  chaseComplete: boolean;
  target: number | null;
  runsRequired: number | null;
  ballsRemaining: number;
  requiredRunRate: number | null;
  strikerKey: string | null;
  nonStrikerKey: string | null;
  crease: {
    striker: CreaseDisplayBatter | null;
    nonStriker: CreaseDisplayBatter | null;
  };
  bowler: {
    name: string;
    legalBalls: number;
    runsConceded: number;
    wickets: number;
    maidens: number;
  } | null;
  currentOverDeliveries: DeliveryInput[];
  partnership: {
    batter1Name: string;
    batter2Name: string;
    runs: number;
    balls: number;
  } | null;
  state: InningsScoreState;
  guestPlayerIds: ReadonlySet<string>;
  inningsComplete?: boolean;
  /** Before first delivery — crease refs until engine keys exist. */
  pendingStriker?: { name: string } | null;
  pendingNonStriker?: { name: string } | null;
  canSwapInitialStrike?: boolean;
  onSwapInitialStrike?: () => void;
}

export function MatchCentreTabs({
  value,
  onChange,
}: {
  value: MatchCentreTab;
  onChange: (tab: MatchCentreTab) => void;
}) {
  const tabs: { id: MatchCentreTab; label: string }[] = [
    { id: "scoring", label: "Scoring" },
    { id: "scorecard", label: "Scorecard" },
    { id: "balls", label: "Balls" },
    { id: "info", label: "Info" },
  ];
  return (
    <nav
      aria-label="Match centre"
      className="flex border-b border-[var(--rw-border)]"
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "rw-focus-ring relative flex-1 py-2.5 text-[13px] tracking-wide",
              active
                ? "font-semibold text-[var(--rw-text)]"
                : "font-medium text-[var(--rw-muted)]",
            )}
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {active ? (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[var(--rw-primary)]" />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

/** Compact live block — keep above scoring controls on mobile. */
export function LiveScorecard(props: LiveScorecardProps) {
  const crr = formatCurrentRunRate(props.totalRuns, props.legalBalls);

  return (
    <div className="space-y-3">
      <ScoreHeader {...props} crrDisplay={crr} />
      {props.target != null ? (
        <ChaseStrip {...props} crrDisplay={crr} />
      ) : null}
      <PartnershipLine partnership={props.partnership} />
      <BatterBowlerTables {...props} />
      {!props.inningsComplete ? (
        <CurrentOverStrip
          deliveries={props.currentOverDeliveries}
          legalBalls={props.legalBalls}
        />
      ) : null}
    </div>
  );
}

export function InningsScorecardView({
  state,
  battingTeamLabel,
  guestPlayerIds,
}: {
  state: InningsScoreState;
  battingTeamLabel: string;
  guestPlayerIds: ReadonlySet<string>;
}) {
  const batters = battingOrder(state);
  const bowlers = bowlingOrder(state);
  return (
    <div className="space-y-5 px-1 pb-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--rw-muted)]">
          {battingTeamLabel} batting
        </p>
        <StatTable
          headers={["Batter", "R", "B", "4s", "6s", "SR"]}
          rows={batters.map((b) => {
            const guest =
              b.playerId != null && guestPlayerIds.has(b.playerId);
            return {
              key: b.key,
              highlight: false,
              cells: [
                `${b.name}${guest ? " (G)" : ""}${b.isOut ? "" : " *"}`,
                String(b.runs),
                String(b.balls),
                String(b.fours),
                String(b.sixes),
                strikeRate(b.runs, b.balls).toFixed(1),
              ],
              sub: b.isOut ? b.dismissalLabel : "not out",
            };
          })}
        />
        {batters.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--rw-muted)]">No batters yet.</p>
        ) : null}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--rw-muted)]">
          Bowling
        </p>
        <StatTable
          headers={["Bowler", "O", "M", "R", "W", "Eco"]}
          rows={bowlers.map((b) => ({
            key: b.key,
            highlight: false,
            cells: [
              b.name,
              formatOvers(b.legalBalls),
              String(b.maidens),
              String(b.runsConceded),
              String(b.wickets),
              economy(b.runsConceded, b.legalBalls).toFixed(1),
            ],
          }))}
        />
        {bowlers.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--rw-muted)]">No bowlers yet.</p>
        ) : null}
      </div>
    </div>
  );
}

export function BallByBallView({
  deliveries,
}: {
  deliveries: DeliveryInput[];
}) {
  const overs = groupDeliveriesByOver(deliveries);
  if (overs.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-[var(--rw-muted)]">
        No balls recorded yet.
      </p>
    );
  }
  return (
    <ol className="space-y-3 px-1 pb-4">
      {overs.map(([overNumber, balls]) => {
        const runs = balls.reduce((sum, d) => sum + d.totalRuns, 0);
        return (
          <li key={overNumber}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <p className="font-semibold">Over {overNumber + 1}</p>
              <p className="tabular-nums text-[var(--rw-muted)]">{runs} runs</p>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {balls.map((d) => (
                <li key={d.clientEventId}>
                  <OverChip delivery={d} />
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

export function MatchInfoView({
  opponentName,
  matchNumber,
  battingTeamLabel,
  inningsNumber,
  extrasTotal,
  extrasBreakdown,
  fallOfWickets,
  oversLimit,
}: {
  opponentName: string;
  matchNumber: string;
  battingTeamLabel: string;
  inningsNumber: number;
  extrasTotal: number;
  extrasBreakdown: InningsScoreState["extrasBreakdown"];
  fallOfWickets: InningsScoreState["fallOfWickets"];
  oversLimit: number;
}) {
  return (
    <div className="space-y-4 px-1 pb-4 text-sm">
      <dl className="space-y-2">
        <InfoRow label="Match" value={matchNumber} />
        <InfoRow label="Opponent" value={opponentName} />
        <InfoRow label="Batting" value={battingTeamLabel} />
        <InfoRow label="Innings" value={inningsOrdinal(inningsNumber)} />
        <InfoRow label="Overs" value={String(oversLimit)} />
      </dl>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--rw-muted)]">
          Extras {extrasTotal}
        </p>
        <p className="mt-1 tabular-nums text-[var(--rw-muted)]">
          Wd {extrasBreakdown.wides} · Nb {extrasBreakdown.noBalls} · B{" "}
          {extrasBreakdown.byes} · Lb {extrasBreakdown.legByes} · Pen{" "}
          {extrasBreakdown.penalty}
        </p>
      </div>
      {fallOfWickets.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--rw-muted)]">
            Fall of wickets
          </p>
          <ul className="mt-1.5 space-y-1 text-[var(--rw-muted)]">
            {fallOfWickets.map((f) => (
              <li key={f.wicketNumber} className="tabular-nums">
                {f.wicketNumber}–{f.scoreAtWicket} {f.dismissedPlayerName} (
                {f.overNumber}.{f.ballNumber})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ScoreHeader({
  battingTeamLabel,
  inningsNumber,
  totalRuns,
  wickets,
  oversDisplay,
  oversLimit,
  extrasTotal,
  crrDisplay,
}: LiveScorecardProps & { crrDisplay: string }) {
  return (
    <div className="px-1 pt-1 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rw-text)]">
        {battingTeamLabel}
      </p>
      <p className="mt-0.5 text-xs text-[var(--rw-muted)]">
        {inningsOrdinal(inningsNumber)}
      </p>
      <p className="mt-1 text-[2.65rem] font-bold leading-none tabular-nums tracking-tight text-[var(--rw-primary)]">
        {totalRuns}-{wickets}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 text-[12px] tabular-nums text-[var(--rw-muted)]">
        <span>
          Ex - <span className="font-semibold text-[var(--rw-text)]">{extrasTotal}</span>
        </span>
        <span>
          Ov -{" "}
          <span className="font-semibold text-[var(--rw-text)]">
            {oversDisplay} / {oversLimit}
          </span>
        </span>
        <span>
          CRR -{" "}
          <span className="font-semibold text-[var(--rw-text)]">{crrDisplay}</span>
        </span>
      </div>
    </div>
  );
}

function ChaseStrip({
  target,
  runsRequired,
  ballsRemaining,
  requiredRunRate: rrr,
  chaseComplete,
  totalRuns,
  wickets,
}: LiveScorecardProps & { crrDisplay: string }) {
  if (target == null) return null;

  const need = runsRequired ?? Math.max(target - totalRuns, 0);
  const rrrDisplay =
    formatRequiredRunRate(need, ballsRemaining) ??
    (rrr != null && Number.isFinite(rrr) ? rrr.toFixed(1) : null);

  if (chaseComplete) {
    return (
      <div className="rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-center text-sm">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
          Chase complete
        </p>
        <p className="mt-0.5 font-semibold tabular-nums">
          {totalRuns}-{wickets}
        </p>
        <p className="text-xs tabular-nums text-[var(--rw-muted)]">
          Target {target}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 px-1 text-center text-sm tabular-nums">
      <p className="flex items-center justify-center gap-4 font-semibold">
        <span>Target {target}</span>
        <span>
          Req. RR - {rrrDisplay ?? "—"}
        </span>
      </p>
      <p className="text-[13px] text-[var(--rw-muted)]">
        Need {need} runs of {ballsRemaining}
      </p>
    </div>
  );
}

function BatterBowlerTables({
  crease,
  strikerKey,
  nonStrikerKey,
  bowler,
  guestPlayerIds,
  state,
  pendingStriker,
  pendingNonStriker,
  canSwapInitialStrike,
  onSwapInitialStrike,
}: LiveScorecardProps) {
  const onStrikeKey = strikerKey;
  const offStrikeKey = nonStrikerKey;

  const onStrikeBatter =
    onStrikeKey && state.batters[onStrikeKey]
      ? creaseFromKey(state, onStrikeKey, true)
      : pendingStriker
        ? pendingCreaseRow(pendingStriker.name)
        : crease.striker;

  const offStrikeBatter =
    offStrikeKey && state.batters[offStrikeKey]
      ? creaseFromKey(state, offStrikeKey, false)
      : pendingNonStriker
        ? pendingCreaseRow(pendingNonStriker.name)
        : crease.nonStriker;

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-[var(--rw-text)]">
            Batsman
          </p>
          {canSwapInitialStrike && onSwapInitialStrike ? (
            <button
              type="button"
              className="rw-focus-ring text-[11px] font-semibold text-[var(--rw-primary)]"
              onClick={onSwapInitialStrike}
            >
              Swap strike
            </button>
          ) : null}
        </div>
        <StatTable
          headers={["", "R", "B", "4s", "6s", "SR"]}
          rows={[onStrikeBatter, offStrikeBatter].flatMap((batter, idx) => {
            if (!batter) return [];
            const onStrike = idx === 0;
            const batterKey = onStrike ? onStrikeKey : offStrikeKey;
            const playerId =
              batterKey && state.batters[batterKey]
                ? state.batters[batterKey].playerId
                : null;
            const isGuest = playerId != null && guestPlayerIds.has(playerId);
            const name = batter.pending ? "Select batter" : batter.name;
            return [
              {
                key: batterKey ?? `${onStrike ? "s" : "ns"}-${name}`,
                highlight: onStrike && !batter.pending,
                cells: [
                  `${name}${isGuest && !batter.pending ? " (G)" : ""}`,
                  batter.pending ? "—" : String(batter.runs),
                  batter.pending ? "—" : String(batter.balls),
                  batter.pending ? "—" : String(batter.fours),
                  batter.pending ? "—" : String(batter.sixes),
                  batter.pending
                    ? "—"
                    : strikeRate(batter.runs, batter.balls).toFixed(1),
                ],
              },
            ];
          })}
        />
      </div>
      {bowler ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold text-[var(--rw-text)]">
            Bowler
          </p>
          <StatTable
            headers={["", "O", "M", "R", "W", "Eco"]}
            rows={[
              {
                key: "current-bowler",
                highlight: false,
                cells: [
                  bowler.name,
                  formatOvers(bowler.legalBalls),
                  String(bowler.maidens),
                  String(bowler.runsConceded),
                  String(bowler.wickets),
                  economy(bowler.runsConceded, bowler.legalBalls).toFixed(1),
                ],
              },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}

function StatTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: {
    key: string;
    highlight: boolean;
    cells: string[];
    sub?: string | null;
  }[];
}) {
  return (
    <div className="overflow-hidden">
      <div
        className="grid gap-x-1 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--rw-muted)]"
        style={{ gridTemplateColumns: "minmax(0,1.6fr) repeat(5, minmax(1.6rem,1fr))" }}
      >
        {headers.map((h, i) => (
          <span
            key={`${h}-${i}`}
            className={i === 0 ? "text-left" : "text-right"}
          >
            {h}
          </span>
        ))}
      </div>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.key}>
            <div
              className={cn(
                "grid items-center gap-x-1 rounded-md px-2 py-1.5 text-[13px] tabular-nums",
                row.highlight
                  ? "bg-[var(--rw-primary)] font-semibold text-white"
                  : "text-[var(--rw-text)]",
              )}
              style={{
                gridTemplateColumns:
                  "minmax(0,1.6fr) repeat(5, minmax(1.6rem,1fr))",
              }}
            >
              {row.cells.map((cell, i) => (
                <span
                  key={`${row.key}-${i}`}
                  className={cn(
                    i === 0
                      ? "truncate text-left font-medium"
                      : "text-right font-semibold",
                    !row.highlight && i === 0 && "font-semibold",
                  )}
                >
                  {cell}
                </span>
              ))}
            </div>
            {row.sub ? (
              <p className="px-2 text-[11px] text-[var(--rw-muted)]">{row.sub}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function pendingCreaseRow(name: string): CreaseDisplayBatter {
  return {
    name,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    is_striker: true,
    isOut: false,
    dismissalLabel: null,
    pending: false,
  };
}

function creaseFromKey(
  state: InningsScoreState,
  key: string,
  onStrike: boolean,
): CreaseDisplayBatter {
  const b = state.batters[key]!;
  return {
    name: b.name,
    runs: b.runs,
    balls: b.balls,
    fours: b.fours,
    sixes: b.sixes,
    is_striker: onStrike,
    isOut: b.isOut,
    dismissalLabel: b.dismissalLabel,
    pending: false,
  };
}

function PartnershipLine({
  partnership,
}: {
  partnership: LiveScorecardProps["partnership"];
}) {
  if (!partnership) return null;
  return (
    <div className="rounded-lg bg-[var(--rw-surface-hover)] px-3 py-2 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--rw-muted)]">
        Partnership
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums">
        {partnership.runs} ({partnership.balls})
      </p>
      <p className="truncate text-[12px] text-[var(--rw-muted)]">
        {partnership.batter1Name} & {partnership.batter2Name}
      </p>
    </div>
  );
}

function formatOvers(legalBalls: number) {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

function CurrentOverStrip({
  deliveries,
  legalBalls,
}: {
  deliveries: DeliveryInput[];
  legalBalls: number;
}) {
  const legalInOver = legalBalls % 6;
  const remaining =
    deliveries.length === 0 && legalInOver === 0
      ? 6
      : Math.max(6 - legalInOver, 0);

  return (
    <div className="px-1">
      <p className="mb-1.5 text-[11px] font-semibold text-[var(--rw-text)]">
        This over
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {deliveries.map((d) => (
          <li key={d.clientEventId}>
            <OverChip delivery={d} />
          </li>
        ))}
        {Array.from({ length: remaining }, (_, i) => (
          <li
            key={`empty-${i}`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[var(--rw-border)] text-xs text-[var(--rw-muted)]"
            aria-hidden
          >
            ·
          </li>
        ))}
      </ul>
    </div>
  );
}

function OverChip({ delivery }: { delivery: DeliveryInput }) {
  const tone = deliveryChipTone(delivery);
  return (
    <span
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-full border px-1.5 text-[11px] font-bold tabular-nums",
        deliveryChipClassName(tone),
      )}
    >
      {formatDeliveryLabel(delivery)}
    </span>
  );
}

function inningsOrdinal(n: number) {
  if (n === 1) return "1st Innings";
  if (n === 2) return "2nd Innings";
  return `Innings ${n}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--rw-muted)]">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
