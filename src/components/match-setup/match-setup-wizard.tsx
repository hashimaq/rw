"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { MatchSetupOptions } from "@/lib/data/match-setup-options";
import { OVERS_PRESETS } from "@/lib/validation/match-setup";
import { PlayingXiStep } from "@/components/match-setup/playing-xi-step";
import {
  buildLineupPayload,
  createEmptyLineupState,
  resolveKeyDisplayName,
  xiSelectedCount,
  type WizardLineupState,
} from "@/lib/match-setup/build-payload";
import {
  firstInningsScoreFieldLabel,
  type RedWingsInnings,
  type RedWingsRole,
} from "@/lib/match/match-setup-plan";
import { redWingsInningsLabel } from "@/lib/match/red-wings-innings";
import { BackButton } from "@/components/ui/back-button";
import { rememberScorerPinForSlug } from "@/lib/scoring/scorer-pin-client";
import { cn } from "@/lib/utils/cn";

const STEPS = [
  { id: "match", label: "Match" },
  { id: "innings", label: "Innings" },
  { id: "xi", label: "Players" },
  { id: "review", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type StructureMode = "standalone" | "series" | "tournament";

interface MatchSetupWizardProps {
  options: MatchSetupOptions;
}

export function MatchSetupWizard({ options }: MatchSetupWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("match");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [opponent, setOpponent] = useState("");
  const [overs, setOvers] = useState<number>(20);
  const [customOvers, setCustomOvers] = useState(false);
  const [structure, setStructure] = useState<StructureMode>("standalone");
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [venue, setVenue] = useState("");

  const [redWingsRole, setRedWingsRole] = useState<RedWingsRole | null>(null);
  const [redWingsInnings, setRedWingsInnings] = useState<RedWingsInnings | null>(
    null,
  );
  const [firstInnRuns, setFirstInnRuns] = useState("");
  const [firstInnWickets, setFirstInnWickets] = useState("");

  const [lineup, setLineup] = useState<WizardLineupState>(createEmptyLineupState);

  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const pinReady = pin.length === 4 && pin === pinConfirm;

  const chaseTargetPreview = useMemo(() => {
    if (redWingsInnings !== 2) return null;
    const runs = Number(firstInnRuns);
    if (!Number.isFinite(runs) || firstInnRuns.trim() === "") return null;
    return runs + 1;
  }, [redWingsInnings, firstInnRuns]);

  const firstInningsLabel = useMemo(() => {
    if (!redWingsRole || !redWingsInnings) return null;
    return firstInningsScoreFieldLabel(redWingsRole, redWingsInnings);
  }, [redWingsRole, redWingsInnings]);

  const playersById = useMemo(
    () => new Map(options.players.map((p) => [p.id, p])),
    [options.players],
  );

  function goNext() {
    setError(null);
    if (step === "match") {
      if (!opponent.trim()) {
        setError("Enter the opponent team name.");
        return;
      }
      if (overs < 1 || overs > 100) {
        setError("Choose a valid overs limit.");
        return;
      }
      setStep("innings");
      return;
    }
    if (step === "innings") {
      if (!redWingsRole) {
        setError("Select whether Red Wings are batting or bowling.");
        return;
      }
      if (!redWingsInnings) {
        setError("Select 1st or 2nd innings.");
        return;
      }
      if (redWingsInnings === 2) {
        const runs = Number(firstInnRuns);
        const wkts = Number(firstInnWickets);
        if (!Number.isInteger(runs) || runs < 0) {
          setError("Enter completed first innings runs.");
          return;
        }
        if (!Number.isInteger(wkts) || wkts < 0 || wkts > 10) {
          setError("Enter completed first innings wickets (0–10).");
          return;
        }
      }
      setStep("xi");
      return;
    }
    if (step === "xi") {
      if (xiSelectedCount(lineup) < 1) {
        setError("Select at least one available match player.");
        return;
      }
      if (!lineup.captainKey) {
        setError("Select a captain from the match squad.");
        return;
      }
      if (!lineup.wicketkeeperKey) {
        setError("Select a wicketkeeper from the match squad.");
        return;
      }
      setStep("review");
      return;
    }
  }

  function goBack() {
    setError(null);
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  }

  const xiStepComplete =
    xiSelectedCount(lineup) >= 1 &&
    Boolean(lineup.captainKey) &&
    Boolean(lineup.wicketkeeperKey);

  async function createMatch() {
    if (creating) return;
    if (pin.length !== 4) {
      setError("Enter a 4-digit scorer PIN.");
      return;
    }
    if (pin !== pinConfirm) {
      setError("PIN confirmation does not match.");
      return;
    }
    if (structure === "series" && !seriesId) {
      setError("Select a series or choose Standalone.");
      return;
    }
    if (structure === "tournament" && !tournamentId) {
      setError("Select a tournament or choose Standalone.");
      return;
    }
    setCreating(true);
    setError(null);

    const payload = {
      opponent_name: opponent.trim(),
      venue: venue.trim() || null,
      overs_limit: overs,
      series_id: structure === "series" ? seriesId : null,
      tournament_id: structure === "tournament" ? tournamentId : null,
      red_wings_role: redWingsRole!,
      red_wings_innings: redWingsInnings!,
      first_innings_runs:
        redWingsInnings === 2 ? Number(firstInnRuns) : undefined,
      first_innings_wickets:
        redWingsInnings === 2 ? Number(firstInnWickets) : undefined,
      lineup: buildLineupPayload(lineup),
      scorer_pin: pin,
      scorer_pin_confirm: pinConfirm,
    };

    try {
      const res = await fetch("/api/matches/setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Could not create match");
      }
      const slug = body.match?.share_slug as string | undefined;
      if (!slug) {
        throw new Error("Match created but could not open scoring.");
      }
      rememberScorerPinForSlug(slug, pin);
      router.push(`/live/${slug}/score`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create match");
      setCreating(false);
    }
  }

  const xiCount = xiSelectedCount(lineup);

  return (
    <div className="flex w-full flex-col pb-28">
      <nav aria-label="Setup progress" className="mb-6">
        <ol className="flex items-center justify-between gap-1">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                  i <= stepIndex
                    ? "bg-[var(--rw-primary)] text-white"
                    : "border border-[var(--rw-border)] text-[var(--rw-muted)]",
                )}
              >
                {i + 1}
              </span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-[var(--rw-muted)] sm:block">
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {step === "match" ? (
        <section className="rw-card space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Match details</h2>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Opponent *</span>
            <input
              className="rw-input w-full"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              maxLength={120}
              placeholder="Opponent team name"
            />
          </label>
          <div>
            <span className="mb-2 block text-sm font-medium">Overs *</span>
            <div className="flex flex-wrap gap-2">
              {OVERS_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={cn(
                    "rw-focus-ring min-h-11 min-w-[3rem] rounded-full border px-4 text-sm font-semibold",
                    !customOvers && overs === n
                      ? "border-[var(--rw-primary)] bg-red-500/10 text-[var(--rw-primary)]"
                      : "border-[var(--rw-border)]",
                  )}
                  onClick={() => {
                    setCustomOvers(false);
                    setOvers(n);
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className={cn(
                  "rw-focus-ring min-h-11 rounded-full border px-4 text-sm font-semibold",
                  customOvers
                    ? "border-[var(--rw-primary)] bg-red-500/10 text-[var(--rw-primary)]"
                    : "border-[var(--rw-border)]",
                )}
                onClick={() => setCustomOvers(true)}
              >
                Custom
              </button>
            </div>
            {customOvers ? (
              <input
                type="number"
                min={1}
                max={100}
                className="rw-input mt-3 w-full"
                value={overs}
                onChange={(e) => setOvers(Number(e.target.value))}
              />
            ) : null}
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Match structure</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["standalone", "Standalone"],
                  ["series", "Series"],
                  ["tournament", "Tournament"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "rw-focus-ring min-h-11 rounded-xl border px-3 text-sm font-semibold",
                    structure === mode
                      ? "border-[var(--rw-primary)] bg-red-500/10 text-[var(--rw-primary)]"
                      : "border-[var(--rw-border)]",
                  )}
                  onClick={() => setStructure(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          {structure === "series" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Series</span>
              <select
                className="rw-input w-full"
                value={seriesId ?? ""}
                onChange={(e) => setSeriesId(e.target.value || null)}
              >
                <option value="">Select series…</option>
                {options.series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {options.series.length === 0 ? (
                <p className="mt-1 text-xs text-[var(--rw-muted)]">
                  No series in the database yet.
                </p>
              ) : null}
            </label>
          ) : null}
          {structure === "tournament" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Tournament</span>
              <select
                className="rw-input w-full"
                value={tournamentId ?? ""}
                onChange={(e) => setTournamentId(e.target.value || null)}
              >
                <option value="">Select tournament…</option>
                {options.tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {options.tournaments.length === 0 ? (
                <p className="mt-1 text-xs text-[var(--rw-muted)]">
                  No tournaments in the database yet.
                </p>
              ) : null}
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Venue (optional)</span>
            <input
              className="rw-input w-full"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              maxLength={200}
            />
          </label>
          <p className="text-xs text-[var(--rw-muted)]">
            Match number will be generated automatically (e.g. RW-001) when the
            match is created.
          </p>
        </section>
      ) : null}

      {step === "innings" ? (
        <section className="rw-card space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Innings setup</h2>
            <p className="mt-1 text-xs text-[var(--rw-muted)]">
              Who is batting and which innings are you scoring?
            </p>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Red Wings are</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["batting", "Batting"],
                  ["bowling", "Bowling"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "rw-focus-ring min-h-12 rounded-xl border px-4 text-sm font-semibold",
                    redWingsRole === value
                      ? "border-[var(--rw-primary)] bg-red-500/10 text-[var(--rw-primary)]"
                      : "border-[var(--rw-border)]",
                  )}
                  onClick={() => setRedWingsRole(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Innings</legend>
            <div className="grid gap-2">
              {(
                [
                  [1, "1st Innings"],
                  [2, "2nd Innings"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "rw-focus-ring min-h-12 rounded-xl border px-4 text-left text-sm font-semibold",
                    redWingsInnings === value
                      ? "border-[var(--rw-primary)] bg-red-500/10 text-[var(--rw-primary)]"
                      : "border-[var(--rw-border)]",
                  )}
                  onClick={() => setRedWingsInnings(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          {redWingsInnings === 2 ? (
            <div className="space-y-3 rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface-hover)] p-4">
              <p className="text-sm font-medium">
                {firstInningsLabel ?? "Completed 1st innings"}
              </p>
              <p className="text-xs text-[var(--rw-muted)]">
                Used to set the chase target automatically (runs + 1). Do not
                enter the target itself.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Runs</span>
                  <input
                    type="number"
                    min={0}
                    className="rw-input w-full"
                    value={firstInnRuns}
                    onChange={(e) => setFirstInnRuns(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Wickets</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    className="rw-input w-full"
                    value={firstInnWickets}
                    onChange={(e) => setFirstInnWickets(e.target.value)}
                  />
                </label>
              </div>
              {chaseTargetPreview != null ? (
                <p className="text-sm font-semibold tabular-nums">
                  Chase target: {chaseTargetPreview}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {step === "xi" ? (
        <PlayingXiStep
          players={options.players}
          lineup={lineup}
          onLineupChange={setLineup}
        />
      ) : null}

      {step === "review" ? (
        <section className="space-y-4">
          <div className="rw-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Review</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--rw-muted)]">Match number</dt>
                <dd className="font-medium">Will be generated automatically</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--rw-muted)]">Opponent</dt>
                <dd className="font-medium">{opponent.trim()}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--rw-muted)]">Red Wings are</dt>
                <dd className="font-medium capitalize">
                  {redWingsRole ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--rw-muted)]">Innings</dt>
                <dd className="font-medium">
                  {redWingsInnings
                    ? redWingsInningsLabel(redWingsInnings)
                    : "—"}
                </dd>
              </div>
              {redWingsInnings === 2 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--rw-muted)]">1st inn. score</dt>
                  <dd className="font-medium tabular-nums">
                    {firstInnRuns || "—"}/{firstInnWickets || "—"}
                    {chaseTargetPreview != null
                      ? ` · Target ${chaseTargetPreview}`
                      : ""}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--rw-muted)]">Overs</dt>
                <dd className="font-medium">{overs}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--rw-muted)]">Structure</dt>
                <dd className="font-medium capitalize">{structure}</dd>
              </div>
            </dl>
          </div>
          <div className="rw-card p-5 text-sm">
            <h3 className="font-semibold">Match squad ({xiCount})</h3>
            <ul className="mt-2 space-y-1">
              {lineup.xiSlots.map((key) => (
                  <li key={key}>
                    {resolveKeyDisplayName(key, lineup, playersById)}
                    {key.startsWith("guest:") ? " · Guest" : ""}
                    {lineup.captainKey === key ? " · C" : ""}
                    {lineup.wicketkeeperKey === key ? " · WK" : ""}
                  </li>
              ))}
            </ul>
          </div>
          <div className="rw-card space-y-4 p-5 sm:p-6">
            <h3 className="font-semibold">Scorer PIN</h3>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">4-digit PIN</span>
              <input
                inputMode="numeric"
                maxLength={4}
                className="rw-input w-full text-center text-2xl tracking-[0.5em]"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                autoComplete="off"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Confirm PIN</span>
              <input
                inputMode="numeric"
                maxLength={4}
                className="rw-input w-full text-center text-2xl tracking-[0.5em]"
                value={pinConfirm}
                onChange={(e) =>
                  setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                autoComplete="off"
              />
            </label>
          </div>
        </section>
      ) : null}

      <div className="rw-wizard-actions fixed inset-x-0 bottom-0 z-30 border-t border-[var(--rw-border)] bg-[color-mix(in_srgb,var(--rw-bg)_92%,transparent)] p-4 backdrop-blur-lg lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto flex w-full max-w-2xl gap-3 px-4 sm:px-0">
          {stepIndex > 0 ? (
            <BackButton
              onClick={goBack}
              className="min-w-0 flex-1 justify-center sm:flex-initial"
              ariaLabel="Go back to previous step"
            />
          ) : (
            <BackButton
              href="/matches"
              className="min-w-0 flex-1 justify-center sm:flex-initial"
              ariaLabel="Leave match setup"
            />
          )}
          {step !== "review" ? (
            <button
              type="button"
              className="rw-focus-ring rw-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={step === "xi" && !xiStepComplete}
              onClick={goNext}
            >
              {step === "xi" && !xiStepComplete
                ? xiCount < 1
                  ? "Select players"
                  : "Set C & WK"
                : "Continue"}
            </button>
          ) : (
            <button
              type="button"
              className="rw-focus-ring rw-btn-primary flex-1 disabled:opacity-60"
              disabled={creating || !pinReady}
              onClick={createMatch}
            >
              {creating ? "Creating match…" : "Create Match"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
