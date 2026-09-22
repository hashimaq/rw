"use client";

import { useMemo, useState } from "react";
import type { WicketType } from "@/lib/database/types";
import type { ParticipantRef } from "@/lib/scoring/participant";
import { participantKey } from "@/lib/scoring-engine/utils";
import {
  dismissedStrikerForAutoWicket,
  isStrikerAutoDismissal,
  requiresDismissedBatsmanSelection,
  requiresFielder,
  validateWicketConfirm,
  type WicketConfirmPayload,
} from "@/lib/scoring/wicket-flow";
import { cn } from "@/lib/utils/cn";

const WICKET_TYPES: { id: WicketType; label: string }[] = [
  { id: "bowled", label: "Bowled" },
  { id: "caught", label: "Caught" },
  { id: "lbw", label: "LBW" },
  { id: "run_out", label: "Run out" },
  { id: "stumped", label: "Stumped" },
  { id: "hit_wicket", label: "Hit wicket" },
  { id: "retired", label: "Retired" },
  { id: "other", label: "Other" },
];

type Step = "type" | "batter" | "fielder";

export function WicketFlowSheet({
  striker,
  nonStriker,
  fielders,
  fielderSuggestions,
  onClose,
  onConfirm,
}: {
  striker: ParticipantRef | null;
  nonStriker: ParticipantRef | null;
  fielders: ParticipantRef[];
  fielderSuggestions: string[];
  onClose: () => void;
  onConfirm: (p: WicketConfirmPayload) => void;
}) {
  const [step, setStep] = useState<Step>("type");
  const [type, setType] = useState<WicketType | null>(null);
  const [dismissed, setDismissed] = useState<ParticipantRef | null>(null);
  const [fielderName, setFielderName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const autoDismissed = useMemo(
    () => dismissedStrikerForAutoWicket(striker),
    [striker],
  );

  const pickType = (t: WicketType) => {
    setError(null);
    setType(t);
    if (isStrikerAutoDismissal(t)) {
      const d = dismissedStrikerForAutoWicket(striker);
      if (!d) {
        setError("No striker on crease.");
        return;
      }
      setDismissed(d);
      if (requiresFielder(t)) {
        setStep("fielder");
        return;
      }
      onConfirm({ wicketType: t, dismissed: d });
      return;
    }
    if (requiresDismissedBatsmanSelection(t)) {
      setStep("batter");
      return;
    }
  };

  const pickBatter = (b: ParticipantRef) => {
    setDismissed(b);
    setError(null);
    if (type && requiresFielder(type)) {
      setStep("fielder");
      return;
    }
    if (type) {
      onConfirm({ wicketType: type, dismissed: b });
    }
  };

  const fielderRef = (): ParticipantRef | null => {
    const trimmed = fielderName.trim();
    if (!trimmed) return null;
    const match = fielders.find(
      (f) => f.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    return match ?? { playerId: null, name: trimmed };
  };

  const confirmFielder = () => {
    if (!type || !dismissed) return;
    const payload: WicketConfirmPayload = {
      wicketType: type,
      dismissed,
      fielder: fielderRef(),
    };
    const validation = validateWicketConfirm(payload);
    if (validation) {
      setError(validation);
      return;
    }
    onConfirm(payload);
  };

  const listId = "wicket-fielder-suggestions";

  return (
    <div className="fixed inset-0 z-50 flex min-w-0 items-end bg-black/40 p-3 sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[min(85vh,100dvh)] w-full min-w-0 max-w-md overflow-y-auto overscroll-y-contain rounded-2xl bg-[var(--rw-bg)] p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-semibold">Wicket</p>
          <button
            type="button"
            className="rw-focus-ring shrink-0 text-sm font-semibold"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {error ? (
          <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200">
            {error}
          </p>
        ) : null}

        {step === "type" ? (
          <div className="grid grid-cols-2 gap-2">
            {WICKET_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="rw-focus-ring min-h-11 rounded-xl border font-semibold"
                onClick={() => pickType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}

        {step === "batter" && type ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--rw-text)]">
              Which batsman got out?
            </p>
            {[striker, nonStriker]
              .filter(Boolean)
              .map((b) => {
                const ref = b as ParticipantRef;
                const isStrikerEnd = striker && participantKey(striker.playerId, striker.name) === participantKey(ref.playerId, ref.name);
                return (
                  <button
                    key={participantKey(ref.playerId, ref.name)}
                    type="button"
                    className="rw-focus-ring w-full rounded-xl border px-3 py-3 text-left font-semibold"
                    onClick={() => pickBatter(ref)}
                  >
                    {ref.name}
                    <span className="mt-0.5 block text-xs font-normal text-[var(--rw-muted)]">
                      {isStrikerEnd ? "Striker" : "Non-striker"}
                    </span>
                  </button>
                );
              })}
            <button
              type="button"
              className="text-sm font-semibold text-[var(--rw-muted)]"
              onClick={() => {
                setStep("type");
                setType(null);
                setDismissed(null);
              }}
            >
              Back
            </button>
          </div>
        ) : null}

        {step === "fielder" && type && dismissed ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--rw-muted)]">
              Dismissed:{" "}
              <span className="font-semibold text-[var(--rw-text)]">
                {dismissed.name}
              </span>
            </p>
            <p className="text-sm font-medium">
              {type === "stumped" ? "Wicketkeeper" : "Fielder"}
            </p>
            {fielders.length > 0 ? (
              <ul className="max-h-40 space-y-1.5 overflow-y-auto overscroll-y-contain">
                {fielders.map((f) => (
                  <li key={participantKey(f.playerId, f.name)}>
                    <button
                      type="button"
                      className={cn(
                        "rw-focus-ring w-full rounded-xl border px-3 py-2.5 text-left font-semibold",
                        fielderName.trim().toLowerCase() ===
                          f.name.trim().toLowerCase() &&
                          "border-[var(--rw-primary)] bg-red-500/5",
                      )}
                      onClick={() => setFielderName(f.name)}
                    >
                      {f.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                {fielders.length > 0 ? "Or enter name" : "Enter name"}
              </span>
              <input
                className="rw-input w-full min-w-0"
                value={fielderName}
                list={listId}
                placeholder="Fielder name"
                onChange={(e) => {
                  setFielderName(e.target.value);
                  setError(null);
                }}
                autoComplete="off"
              />
              <datalist id={listId}>
                {fielderSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <button
              type="button"
              className="rw-focus-ring rw-btn-primary w-full min-h-11"
              onClick={confirmFielder}
            >
              Confirm wicket
            </button>
            <button
              type="button"
              className="w-full text-sm font-semibold text-[var(--rw-muted)]"
              onClick={() => {
                if (requiresDismissedBatsmanSelection(type)) {
                  setStep("batter");
                } else {
                  setStep("type");
                  setType(null);
                }
                setDismissed(isStrikerAutoDismissal(type) ? autoDismissed : null);
                setFielderName("");
              }}
            >
              Back
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
