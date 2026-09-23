import type {
  ScoringBootstrap,
  ScoringInningsInfo,
} from "@/lib/data/scoring-bootstrap-types";
import type { DeliveryInput } from "@/lib/scoring-engine/types";
import { buildInningsStateFromDeliveries } from "@/lib/scoring-engine/build-state";
import type { InningsScoreState } from "@/lib/scoring-engine/types";
import { scoringUiSnapshotFromEngineState } from "@/lib/scoring/scoring-phase";

/** Server bootstrap deliveries apply only to the innings the server marked active. */
export function serverDeliveriesForHydration(
  bootstrap: Pick<ScoringBootstrap, "activeInningsId" | "deliveries">,
  inningsId: string,
): DeliveryInput[] {
  return bootstrap.activeInningsId === inningsId ? bootstrap.deliveries : [];
}

export interface StartSecondInningsApiInnings {
  id: string;
  overs_limit: number;
  target: number | null;
  batting_team: "red_wings" | "opponent";
  bowling_team: "red_wings" | "opponent";
  innings_status: ScoringInningsInfo["inningsStatus"];
}

export function secondInningsInfoFromApi(
  inn: StartSecondInningsApiInnings,
  previousActive: ScoringInningsInfo,
): ScoringInningsInfo {
  return {
    id: inn.id,
    inningsNumber: 2,
    battingTeam:
      previousActive.battingTeam === "red_wings" ? "opponent" : "red_wings",
    bowlingTeam:
      previousActive.bowlingTeam === "red_wings" ? "opponent" : "red_wings",
    inningsStatus: inn.innings_status ?? "not_started",
    target: inn.target,
    oversLimit: inn.overs_limit,
    totalRuns: 0,
    wickets: 0,
  };
}

export function emptySecondInningsState(
  oversLimit: number,
  target: number | null,
): InningsScoreState {
  return buildInningsStateFromDeliveries([], oversLimit, target);
}

/** Authoritative client snapshot immediately after innings 2 is activated. */
export function secondInningsScoringSnapshot(
  state: InningsScoreState,
  inningsNumber: number,
  inningsStatus?: string,
) {
  return scoringUiSnapshotFromEngineState(state, {
    inningsNumber,
    inningsStatus,
  });
}

export type InningsRowForStart = {
  innings_number: number;
  innings_status: string;
  total_runs: number;
  overs_limit: number;
  batting_team: "red_wings" | "opponent";
  bowling_team: "red_wings" | "opponent";
  id: string;
  target: number | null;
};

export type StartSecondInningsPlan =
  | { kind: "error"; message: string; status: 404 | 409 }
  | { kind: "existing"; innings: InningsRowForStart }
  | {
      kind: "create";
      target: number;
      battingTeam: "red_wings" | "opponent";
      bowlingTeam: "red_wings" | "opponent";
      oversLimit: number;
    };

export function planStartSecondInnings(
  inningsList: InningsRowForStart[],
): StartSecondInningsPlan {
  if (!inningsList.length) {
    return { kind: "error", message: "Innings not found", status: 404 };
  }
  const existingSecond = inningsList.find((i) => i.innings_number === 2);
  if (existingSecond) {
    return { kind: "existing", innings: existingSecond };
  }
  const current = inningsList[inningsList.length - 1];
  if (current.innings_status !== "completed") {
    return {
      kind: "error",
      message: "Current innings is not complete yet",
      status: 409,
    };
  }
  return {
    kind: "create",
    target: current.total_runs + 1,
    battingTeam:
      current.batting_team === "red_wings" ? "opponent" : "red_wings",
    bowlingTeam:
      current.bowling_team === "red_wings" ? "opponent" : "red_wings",
    oversLimit: current.overs_limit,
  };
}
