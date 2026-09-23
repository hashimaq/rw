"use client";

import { useMemo, useState } from "react";
import type { ScoringBootstrap } from "@/lib/data/scoring-bootstrap";
import { InningsTransitionPanel } from "@/components/scoring/innings-transition-panel";
import { MatchCompleteSummary } from "@/components/scoring/match-complete-summary";
import {
  BallByBallView,
  InningsScorecardView,
  LiveScorecard,
  MatchCentreTabs,
  MatchInfoView,
  type MatchCentreTab,
} from "@/components/scoring/live-scorecard";
import {
  RwBatterPickSheet,
  RwBatterSelect,
  type RwBatterOption,
} from "@/components/scoring/rw-batter-picker";
import {
  OpponentBatterField,
  ScoringKeypad,
} from "@/components/scoring/scoring-controls";
import { OpponentBowlerPickSheet } from "@/components/scoring/scoring-controls-opponent-bowler-sheet";
import {
  useLiveScoring,
  type ParticipantRef,
} from "@/lib/scoring/use-live-scoring";
import { authoritativeCreaseRefs } from "@/lib/scoring/crease-sync";
import { validateWicketConfirm } from "@/lib/scoring/wicket-flow";
import { WicketFlowSheet } from "@/components/scoring/wicket-flow-sheet";
import type { NoBallRunKind } from "@/lib/scoring-engine/delivery-builders";
import { participantKey } from "@/lib/scoring-engine/utils";
import {
  createOpponentBowler,
  createOpponentParticipant,
} from "@/lib/scoring/opponent-participant";
import { ScorerMatchDeleteInfoTrigger } from "@/components/scoring/scorer-match-delete-info-trigger";
import { cn } from "@/lib/utils/cn";

interface BallScoringPanelProps {
  bootstrap: ScoringBootstrap;
  isController: boolean;
}

export function BallScoringPanel({
  bootstrap,
  isController,
}: BallScoringPanelProps) {
  const scoring = useLiveScoring(bootstrap, isController);
  const [tab, setTab] = useState<MatchCentreTab>("scoring");
  const [moreOpen, setMoreOpen] = useState(false);
  const [wicketOpen, setWicketOpen] = useState(false);
  const [extraRunsPicker, setExtraRunsPicker] = useState<
    null | "wide" | "bye" | "leg_bye"
  >(null);
  const [noBallFlow, setNoBallFlow] = useState<
    null | { step: "kind" } | { step: "runs"; kind: NoBallRunKind }
  >(null);
  const [undoConfirm, setUndoConfirm] = useState(false);
  const [saveInningsPending, setSaveInningsPending] = useState(false);
  const [strikerToast, setStrikerToast] = useState<string | null>(null);

  const { summary } = scoring;
  const inningsTransition =
    scoring.phase === "innings_complete" ||
    scoring.phase === "innings_saved";
  const inningsComplete =
    inningsTransition || scoring.phase === "match_complete";
  const matchComplete = scoring.phase === "match_complete";
  const canScore = isController && scoring.phase === "scoring";
  const canUndoLast =
    isController &&
    scoring.state.deliveries.length > 0 &&
    !matchComplete &&
    !inningsTransition &&
    (scoring.phase === "scoring" ||
      scoring.phase === "need_batter" ||
      scoring.phase === "need_bowler");
  const showScoringKeypad = canScore || canUndoLast;
  const battingLabel =
    scoring.battingIsRedWings ? "Red Wings" : bootstrap.opponentName;

  const rwBatterOptions: RwBatterOption[] = useMemo(
    () => [
      ...scoring.rwOfficialBatters.map((p) => ({
        id: p.id,
        name: p.name,
        isGuest: false,
      })),
      ...scoring.rwGuestBatters.map((p) => ({
        id: p.id,
        name: p.name,
        isGuest: true,
      })),
    ],
    [scoring.rwOfficialBatters, scoring.rwGuestBatters],
  );

  const dismissedKeys = useMemo(
    () =>
      new Set(
        Object.values(scoring.state.batters)
          .filter((b) => b.isOut)
          .map((b) => b.key),
      ),
    [scoring.state.batters],
  );

  const engineCrease = useMemo(
    () =>
      authoritativeCreaseRefs(scoring.state, {
        striker: scoring.striker,
        nonStriker: scoring.nonStriker,
      }),
    [scoring.state, scoring.striker, scoring.nonStriker],
  );

  const fieldingSide = useMemo(() => {
    if (scoring.bowlingIsRedWings) {
      return scoring.bowlingXi.map((p) => ({
        playerId: p.id,
        name: p.name,
      }));
    }
    const names = new Set<string>();
    for (const b of scoring.opponentBatters) {
      if (b.name.trim()) names.add(b.name.trim());
    }
    for (const n of scoring.opponentBowlerSuggestions) {
      if (n.trim()) names.add(n.trim());
    }
    return [...names].map((name) => ({ playerId: null, name }));
  }, [
    scoring.bowlingIsRedWings,
    scoring.bowlingXi,
    scoring.opponentBatters,
    scoring.opponentBowlerSuggestions,
  ]);

  const fielderSuggestions = useMemo(
    () => fieldingSide.map((f) => f.name),
    [fieldingSide],
  );

  const atCreaseKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const key of [scoring.state.strikerKey, scoring.state.nonStrikerKey]) {
      if (!key) continue;
      const b = scoring.state.batters[key];
      if (b && !b.isOut) keys.add(key);
    }
    return keys;
  }, [scoring.state]);

  if (!scoring.hydrated) {
    return (
      <p
        className="flex-1 px-4 py-6 text-sm text-[var(--rw-muted)]"
        aria-live="polite"
      >
        Loading score…
      </p>
    );
  }

  const liveScorecard = (
    <LiveScorecard
      opponentName={bootstrap.opponentName}
      matchNumber={bootstrap.matchNumber}
      battingTeamLabel={battingLabel}
      inningsNumber={scoring.activeInnings.inningsNumber}
      totalRuns={summary.totalRuns}
      wickets={summary.wickets}
      legalBalls={summary.legalBalls}
      oversDisplay={summary.oversDisplay}
      oversLimit={scoring.state.oversLimit}
      extrasTotal={summary.extras}
      isChaseInnings={summary.isChaseInnings}
      chaseComplete={summary.chaseComplete}
      target={summary.target}
      runsRequired={summary.runsRequired}
      ballsRemaining={summary.ballsRemaining}
      requiredRunRate={summary.requiredRunRate}
      strikerKey={scoring.state.strikerKey}
      nonStrikerKey={scoring.state.nonStrikerKey}
      crease={scoring.creaseDisplay}
      bowler={
        summary.bowler
          ? {
              name: summary.bowler.name,
              legalBalls: summary.bowler.legalBalls,
              runsConceded: summary.bowler.runsConceded,
              wickets: summary.bowler.wickets,
              maidens: summary.bowler.maidens,
            }
          : null
      }
      currentOverDeliveries={summary.currentOverDeliveries}
      partnership={
        summary.partnership
          ? {
              batter1Name: summary.partnership.batter1Name,
              batter2Name: summary.partnership.batter2Name,
              runs: summary.partnership.runs,
              balls: summary.partnership.balls,
            }
          : null
      }
      state={scoring.state}
      guestPlayerIds={scoring.guestPlayerIds}
      inningsComplete={inningsComplete}
      pendingStriker={
        scoring.state.deliveries.length === 0 && scoring.striker
          ? { name: scoring.striker.name }
          : null
      }
      pendingNonStriker={
        scoring.state.deliveries.length === 0 && scoring.nonStriker
          ? { name: scoring.nonStriker.name }
          : null
      }
      pendingStrikerRef={
        scoring.state.deliveries.length === 0 ? scoring.striker : null
      }
      pendingNonStrikerRef={
        scoring.state.deliveries.length === 0 ? scoring.nonStriker : null
      }
      canSelectManualStriker={scoring.canSelectManualStriker}
      onSelectManualStriker={(ref) => {
        const msg = scoring.setManualStriker(ref);
        if (msg) {
          setStrikerToast(msg);
          window.setTimeout(() => setStrikerToast(null), 2200);
        }
      }}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MatchCentreTabs value={tab} onChange={setTab} />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {tab === "scoring" ? (
          <div className="space-y-3">
            {strikerToast ? (
              <p
                className="rounded-lg bg-[var(--rw-surface-hover)] px-3 py-2 text-center text-sm font-medium text-[var(--rw-text)]"
                role="status"
              >
                {strikerToast}
              </p>
            ) : null}
            <section aria-label="Live match">{liveScorecard}</section>

            {matchComplete ? (
              <MatchCompleteSummary
                shareSlug={bootstrap.shareSlug}
                opponentName={bootstrap.opponentName}
                innings={scoring.inningsList}
                resultSummary={scoring.resultSummary ?? bootstrap.resultSummary}
              />
            ) : null}
            {inningsTransition &&
            scoring.activeInnings.inningsNumber === 1 &&
            !matchComplete ? (
              <InningsTransitionPanel
                phase={
                  scoring.phase === "innings_saved"
                    ? "innings_saved"
                    : "innings_complete"
                }
                shareSlug={bootstrap.shareSlug}
                battingTeamLabel={battingLabel}
                inningsNumber={1}
                state={scoring.state}
                isController={isController}
                savePending={saveInningsPending}
                onSaveInnings={async () => {
                  setSaveInningsPending(true);
                  try {
                    await scoring.saveInnings();
                  } finally {
                    setSaveInningsPending(false);
                  }
                }}
                onStartSecondInnings={() => scoring.startSecondInnings()}
                startSecondPending={scoring.startSecondInningsPending}
                startSecondError={scoring.startSecondInningsError}
              />
            ) : null}

            {isController ? (
              <PhasePanels
                scoring={scoring}
                bootstrap={bootstrap}
                dismissedKeys={dismissedKeys}
                atCreaseKeys={atCreaseKeys}
                rwBatterOptions={rwBatterOptions}
              />
            ) : null}
          </div>
        ) : null}

        {tab === "scorecard" ? (
          <InningsScorecardView
            state={scoring.state}
            battingTeamLabel={battingLabel}
            guestPlayerIds={scoring.guestPlayerIds}
          />
        ) : null}

        {tab === "balls" ? (
          <BallByBallView deliveries={scoring.state.deliveries} />
        ) : null}

        {tab === "info" ? (
          <>
            <MatchInfoView
              opponentName={bootstrap.opponentName}
              matchNumber={bootstrap.matchNumber}
              battingTeamLabel={battingLabel}
              inningsNumber={scoring.activeInnings.inningsNumber}
              extrasTotal={summary.extras}
              extrasBreakdown={summary.extrasBreakdown}
              fallOfWickets={scoring.state.fallOfWickets}
              oversLimit={scoring.state.oversLimit}
            />
            {isController ? (
              <ScorerMatchDeleteInfoTrigger
                matchId={bootstrap.matchId}
                matchNumber={bootstrap.matchNumber}
                opponentName={bootstrap.opponentName}
                status={bootstrap.status}
              />
            ) : null}
          </>
        ) : null}
      </div>

      {showScoringKeypad && tab === "scoring" ? (
        <div className="sticky bottom-0 z-20 shrink-0">
          <ScoringKeypad
            scoringEnabled={canScore}
            onRun={(n) => void scoring.recordRun(n)}
            onLegBye={() => setExtraRunsPicker("leg_bye")}
            onBye={() => setExtraRunsPicker("bye")}
            onWide={() => setExtraRunsPicker("wide")}
            onNoBall={() => setNoBallFlow({ step: "kind" })}
            onMore={() => setMoreOpen(true)}
            onDeadBall={() => void scoring.recordDeadBall()}
            onUndo={() => {
              if (undoConfirm) {
                void scoring.undo();
                setUndoConfirm(false);
              } else {
                setUndoConfirm(true);
                window.setTimeout(() => setUndoConfirm(false), 4000);
              }
            }}
            onOut={() => setWicketOpen(true)}
            undoConfirm={undoConfirm}
          />
        </div>
      ) : null}

      {moreOpen ? (
        <MoreOptionsSheet
          onClose={() => setMoreOpen(false)}
          onDeadBall={() => {
            void scoring.recordDeadBall();
            setMoreOpen(false);
          }}
          onFive={() => {
            void scoring.recordRun(5);
            setMoreOpen(false);
          }}

        />
      ) : null}

      {extraRunsPicker ? (
        <RunsPickerSheet
          title={
            extraRunsPicker === "wide"
              ? "Wide"
              : extraRunsPicker === "bye"
                ? "Byes"
                : "Leg byes"
          }
          wideAdditionalRuns={extraRunsPicker === "wide"}
          onPick={(n) => {
            if (extraRunsPicker === "wide") {
              void scoring.recordWide(n);
            } else if (extraRunsPicker === "bye") void scoring.recordBye(n);
            else void scoring.recordLegBye(n);
            setExtraRunsPicker(null);
          }}
          onClose={() => setExtraRunsPicker(null)}
        />
      ) : null}

      {noBallFlow?.step === "kind" ? (
        <NoBallKindSheet
          onPick={(kind) => {
            if (kind === "none") {
              void scoring.recordNoBall("none", 0);
              setNoBallFlow(null);
              return;
            }
            setNoBallFlow({ step: "runs", kind });
          }}
          onClose={() => setNoBallFlow(null)}
        />
      ) : null}

      {noBallFlow?.step === "runs" ? (
        <RunsPickerSheet
          title={
            noBallFlow.kind === "bat"
              ? "Runs off the bat (no-ball)"
              : noBallFlow.kind === "bye"
                ? "Byes off the no-ball"
                : "Leg byes off the no-ball"
          }
          onPick={(n) => {
            void scoring.recordNoBall(noBallFlow.kind, n);
            setNoBallFlow(null);
          }}
          onClose={() => setNoBallFlow(null)}
        />
      ) : null}

      {scoring.phase === "need_batter" && isController ? (
        <NeedBatterOverlay
          scoring={scoring}
          dismissedKeys={dismissedKeys}
          atCreaseKeys={atCreaseKeys}
          rwBatterOptions={rwBatterOptions}
        />
      ) : null}

      {scoring.phase === "need_bowler" && isController ? (
        <NeedBowlerOverlay scoring={scoring} />
      ) : null}

      {wicketOpen ? (
        <WicketFlowSheet
          striker={engineCrease.striker}
          nonStriker={engineCrease.nonStriker}
          fielders={fieldingSide}
          fielderSuggestions={fielderSuggestions}
          onClose={() => setWicketOpen(false)}
          onConfirm={(payload) => {
            const err = validateWicketConfirm(payload);
            if (err) return;
            void scoring.recordWicket(payload);
            setWicketOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function NeedBowlerOverlay({
  scoring,
}: {
  scoring: ReturnType<typeof useLiveScoring>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex min-w-0 items-end bg-black/40 p-3 sm:items-center sm:justify-center sm:p-4">
      <div className="flex max-h-[min(85vh,100dvh)] w-full min-w-0 max-w-md flex-col overflow-hidden rounded-2xl bg-[var(--rw-bg)] shadow-xl">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4">
          {scoring.bowlingIsRedWings ? (
            <PlayerPickSheet
              title="Select next bowler"
              subtitle="Cannot bowl consecutive overs"
              players={scoring.bowlingXi.map((p) => ({
                playerId: p.id,
                name: p.name,
              }))}
              disabledKeys={scoring.forbiddenBowlerKeys}
              onPick={scoring.confirmBowler}
            />
          ) : (
            <OpponentBowlerPickSheet
              title="Next over — opponent bowler"
              subtitle="Previously used bowlers stay available except the last over"
              bowlers={scoring.opponentBowlerOptions}
              forbiddenKey={
                scoring.forbiddenBowlerKeys.size > 0
                  ? [...scoring.forbiddenBowlerKeys][0] ?? null
                  : null
              }
              onPick={scoring.confirmBowler}
              onConfirmNew={scoring.confirmOpponentBowler}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function NeedBatterOverlay({
  scoring,
  dismissedKeys,
  atCreaseKeys,
  rwBatterOptions,
}: {
  scoring: ReturnType<typeof useLiveScoring>;
  dismissedKeys: Set<string>;
  atCreaseKeys: Set<string>;
  rwBatterOptions: RwBatterOption[];
}) {
  const slotLabel =
    scoring.wicketReplacementSlot === "non_striker"
      ? "Select non-striker"
      : "Select striker";

  if (!scoring.battingIsRedWings) {
    return (
      <div className="fixed inset-0 z-50 flex min-w-0 items-end bg-black/40 p-3 sm:items-center sm:justify-center sm:p-4">
        <div className="max-h-[min(85vh,100dvh)] w-full min-w-0 max-w-md overflow-y-auto overscroll-y-contain rounded-2xl bg-[var(--rw-bg)] p-4 shadow-xl">
          <OpponentBatterField
            title="New opponent batter"
            suggestions={scoring.opponentBatterSuggestions}
            onConfirm={(name) => void scoring.confirmOpponentBatter(name)}
          />
        </div>
      </div>
    );
  }

  const candidates = rwBatterOptions.filter((p) => {
    const key = participantKey(p.id, p.name);
    if (dismissedKeys.has(key)) return false;
    if (atCreaseKeys.has(key)) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex min-w-0 items-end bg-black/40 p-3 sm:items-center sm:justify-center sm:p-4">
      <div className="flex max-h-[min(85vh,100dvh)] w-full min-w-0 max-w-md flex-col overflow-hidden rounded-2xl bg-[var(--rw-bg)] shadow-xl">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4">
          <RwBatterPickSheet
            title={slotLabel}
            subtitle="Choose the next batter to continue scoring"
            options={candidates}
            onCreateGuest={(name) => scoring.createMatchGuestPlayer(name)}
            onPick={(p) => void scoring.confirmNewBatter(p)}
          />
        </div>
      </div>
    </div>
  );
}

function PhasePanels({
  scoring,
  bootstrap,
  dismissedKeys,
  atCreaseKeys,
  rwBatterOptions,
}: {
  scoring: ReturnType<typeof useLiveScoring>;
  bootstrap: ScoringBootstrap;
  dismissedKeys: Set<string>;
  atCreaseKeys: Set<string>;
  rwBatterOptions: RwBatterOption[];
}) {
  const phase = scoring.phase;

  if (phase === "setup_openers") {
    return (
      <SetupOpenersPanel
        battingIsRedWings={scoring.battingIsRedWings}
        bowlingIsRedWings={scoring.bowlingIsRedWings}
        rwBatterOptions={rwBatterOptions}
        battingXi={scoring.battingXi}
        bowlingXi={scoring.bowlingXi}
        opponentBatterSuggestions={scoring.opponentBatterSuggestions}
        opponentBowlerSuggestions={scoring.opponentBowlerSuggestions}
        onCreateGuest={(name) => scoring.createMatchGuestPlayer(name)}
        onConfirm={scoring.confirmOpeners}
      />
    );
  }

  if (phase === "match_complete") {
    return null;
  }

  if (phase === "innings_complete" || phase === "innings_saved") {
    return null;
  }

  return null;
}

function SetupOpenersPanel({
  battingIsRedWings,
  bowlingIsRedWings,
  rwBatterOptions,
  battingXi,
  bowlingXi,
  opponentBatterSuggestions,
  opponentBowlerSuggestions,
  onCreateGuest,
  onConfirm,
}: {
  battingIsRedWings: boolean;
  bowlingIsRedWings: boolean;
  rwBatterOptions: RwBatterOption[];
  battingXi: { id?: string; name: string }[];
  bowlingXi: { id: string; name: string }[];
  opponentBatterSuggestions: string[];
  opponentBowlerSuggestions: string[];
  onCreateGuest: (name: string) => Promise<{ id: string; name: string } | null>;
  onConfirm: (s: ParticipantRef, ns: ParticipantRef, b: ParticipantRef) => void;
}) {
  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [oppStrikerName, setOppStrikerName] = useState("");
  const [oppNonStrikerName, setOppNonStrikerName] = useState("");
  const [bowlerId, setBowlerId] = useState("");
  const [oppBowlerName, setOppBowlerName] = useState("");

  const batterListId = "setup-opp-batter-list";
  const bowlerListId = "setup-opp-bowler-list";

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--rw-border)] bg-[var(--rw-surface)] p-4 shadow-sm">
      <p className="font-semibold">Start innings</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--rw-muted)]">
        Openers
      </p>
      {battingIsRedWings ? (
        <>
          <RwBatterSelect
            label="Striker"
            value={strikerId}
            onChange={setStrikerId}
            options={rwBatterOptions}
            disabledIds={
              nonStrikerId && nonStrikerId !== "__other__"
                ? new Set([nonStrikerId])
                : undefined
            }
            onCreateGuest={async (name) => {
              const created = await onCreateGuest(name);
              if (!created) return null;
              return {
                id: created.id,
                name: created.name,
                isGuest: true,
              };
            }}
          />
          <RwBatterSelect
            label="Non-striker"
            value={nonStrikerId}
            onChange={setNonStrikerId}
            options={rwBatterOptions}
            disabledIds={
              strikerId && strikerId !== "__other__"
                ? new Set([strikerId])
                : undefined
            }
            onCreateGuest={async (name) => {
              const created = await onCreateGuest(name);
              if (!created) return null;
              return {
                id: created.id,
                name: created.name,
                isGuest: true,
              };
            }}
          />
        </>
      ) : (
        <>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Striker</span>
            <input
              className="rw-input w-full"
              list={batterListId}
              placeholder="Enter opponent batter"
              value={oppStrikerName}
              onChange={(e) => setOppStrikerName(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Non-striker</span>
            <input
              className="rw-input w-full"
              list={batterListId}
              placeholder="Enter opponent batter"
              value={oppNonStrikerName}
              onChange={(e) => setOppNonStrikerName(e.target.value)}
              autoComplete="off"
            />
          </label>
          <datalist id={batterListId}>
            {opponentBatterSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </>
      )}
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--rw-muted)]">
        Bowler
      </p>
      {bowlingIsRedWings ? (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Red Wings bowler</span>
          <select
            className="rw-input w-full"
            value={bowlerId}
            onChange={(e) => setBowlerId(e.target.value)}
          >
            <option value="">Select…</option>
            {bowlingXi.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Opponent bowler</span>
          <input
            className="rw-input w-full"
            list={bowlerListId}
            value={oppBowlerName}
            onChange={(e) => setOppBowlerName(e.target.value)}
            placeholder="Enter opponent bowler"
            autoComplete="off"
          />
          <datalist id={bowlerListId}>
            {opponentBowlerSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
      )}
      <button
        type="button"
        className="rw-focus-ring w-full min-h-10 rounded-xl border border-[var(--rw-border)] text-sm font-semibold"
        onClick={() => {
          if (battingIsRedWings) {
            setStrikerId(nonStrikerId);
            setNonStrikerId(strikerId);
          } else {
            setOppStrikerName(oppNonStrikerName);
            setOppNonStrikerName(oppStrikerName);
          }
        }}
      >
        Swap strike
      </button>
      <button
        type="button"
        className="rw-focus-ring rw-btn-primary w-full min-h-11"
        onClick={() => {
          let sRef: ParticipantRef;
          let nsRef: ParticipantRef;
          if (battingIsRedWings) {
            if (
              !strikerId ||
              !nonStrikerId ||
              strikerId === "__other__" ||
              nonStrikerId === "__other__" ||
              strikerId === nonStrikerId
            ) {
              return;
            }
            const s = battingXi.find((p) => p.id === strikerId);
            const ns = battingXi.find((p) => p.id === nonStrikerId);
            if (!s?.id || !ns?.id) return;
            sRef = { playerId: s.id, name: s.name };
            nsRef = { playerId: ns.id, name: ns.name };
          } else {
            const s = oppStrikerName.trim();
            const ns = oppNonStrikerName.trim();
            if (!s || !ns || s.toLowerCase() === ns.toLowerCase()) return;
            sRef = createOpponentParticipant(s);
            nsRef = createOpponentParticipant(ns);
          }
          let b: ParticipantRef;
          if (bowlingIsRedWings) {
            const rw = bowlingXi.find((p) => p.id === bowlerId);
            if (!rw) return;
            b = { playerId: rw.id, name: rw.name };
          } else {
            const trimmed = oppBowlerName.trim();
            if (!trimmed) return;
            b = createOpponentBowler(trimmed);
          }
          onConfirm(sRef, nsRef, b);
        }}
      >
        Start innings
      </button>
    </div>
  );
}

function PlayerPickSheet({
  title,
  subtitle,
  players,
  disabledKeys,
  onPick,
}: {
  title: string;
  subtitle?: string;
  players: ParticipantRef[];
  disabledKeys?: Set<string>;
  onPick: (p: ParticipantRef) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, search]);

  return (
    <div className="rounded-2xl border border-[var(--rw-primary)]/40 bg-red-500/[0.04] p-4 shadow-sm">
      <p className="font-semibold">{title}</p>
      {subtitle ? (
        <p className="mt-1 text-xs text-[var(--rw-muted)]">{subtitle}</p>
      ) : null}
      {players.length > 6 ? (
        <input
          type="search"
          className="rw-input mt-3 w-full text-sm"
          placeholder="Search bowlers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search bowlers"
        />
      ) : null}
      <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto overscroll-contain">
        {filtered.map((p) => {
          const key = participantKey(p.playerId, p.name);
          const disabled = disabledKeys?.has(key);
          return (
            <li key={key}>
              <button
                type="button"
                disabled={disabled}
                className={cn(
                  "rw-focus-ring w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold",
                  disabled
                    ? "cursor-not-allowed border-[var(--rw-border)] opacity-40"
                    : "border-[var(--rw-border)] bg-[var(--rw-surface)] hover:border-[var(--rw-primary)]/40",
                )}
                onClick={() => onPick(p)}
              >
                {p.name}
                {disabled ? (
                  <span className="mt-0.5 block text-[11px] font-normal text-[var(--rw-muted)]">
                    Bowled last over
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MoreOptionsSheet({
  onClose,
  onDeadBall,
  onFive,
}: {
  onClose: () => void;
  onDeadBall: () => void;
  onFive: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4 sm:items-center sm:justify-center">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--rw-bg)] p-4 shadow-xl">
        <p className="font-semibold">More</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rw-focus-ring min-h-12 rounded-xl border font-bold"
            onClick={onFive}
          >
            5 runs
          </button>
          <button
            type="button"
            className="rw-focus-ring min-h-12 rounded-xl border font-bold"
            onClick={onDeadBall}
          >
            Dead ball
          </button>
        </div>
        <button
          type="button"
          className="rw-focus-ring mt-3 w-full min-h-10 text-sm font-semibold text-[var(--rw-muted)]"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function NoBallKindSheet({
  onPick,
  onClose,
}: {
  onPick: (kind: NoBallRunKind) => void;
  onClose: () => void;
}) {
  const options: { kind: NoBallRunKind; label: string }[] = [
    { kind: "none", label: "No extra run" },
    { kind: "bat", label: "Off the bat" },
    { kind: "bye", label: "Byes" },
    { kind: "leg_bye", label: "Leg byes" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4 sm:items-center sm:justify-center">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--rw-bg)] p-4 shadow-xl">
        <p className="font-semibold">No ball</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {options.map((opt) => (
            <button
              key={opt.kind}
              type="button"
              className="rw-focus-ring min-h-12 rounded-xl border px-2 text-sm font-semibold"
              onClick={() => onPick(opt.kind)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rw-focus-ring mt-3 w-full min-h-10 text-sm font-semibold text-[var(--rw-muted)]"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function RunsPickerSheet({
  title,
  onPick,
  onClose,
  wideAdditionalRuns = false,
}: {
  title: string;
  onPick: (n: number) => void;
  onClose: () => void;
  /** Wide: n = additional runs beyond the mandatory wide penalty (+1 team run). */
  wideAdditionalRuns?: boolean;
}) {
  const opts = [0, 1, 2, 3, 4, 5, 6];
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4 sm:items-center sm:justify-center">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--rw-bg)] p-4 shadow-xl">
        <p className="font-semibold">{title}</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {opts.map((n) => (
            <button
              key={n}
              type="button"
              className="rw-focus-ring min-h-12 rounded-xl border font-bold"
              onClick={() => onPick(n)}
            >
              {wideAdditionalRuns ? `Wide +${n}` : n}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rw-focus-ring mt-3 w-full min-h-10 text-sm font-semibold text-[var(--rw-muted)]"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
