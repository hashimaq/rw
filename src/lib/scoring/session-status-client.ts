export type ScoringControlRole = "none" | "controller" | "viewer";

export type PendingTransferState = {
  id: string;
  direction: "incoming" | "outgoing";
  requester_label?: string | null;
};

export type ScoringSessionStatusCore = {
  authorized: boolean;
  scoring_role: ScoringControlRole;
  has_active_controller: boolean;
  pending_transfer: PendingTransferState | null;
};

export type SessionStatusApiBody = {
  authorized?: boolean;
  scoring_role?: ScoringControlRole;
  has_active_controller?: boolean;
  pending_transfer?: PendingTransferState | null;
};

export function sessionStatusFromApiBody(
  body: SessionStatusApiBody,
): ScoringSessionStatusCore {
  return {
    authorized: Boolean(body.authorized),
    scoring_role: body.scoring_role ?? "none",
    has_active_controller: Boolean(body.has_active_controller),
    pending_transfer: body.pending_transfer ?? null,
  };
}

/** Optimistic local transition when the active controller keeps scoring. */
export function applyKeepScoringOptimistic(
  state: ScoringSessionStatusCore,
  transferId: string,
): ScoringSessionStatusCore {
  if (state.pending_transfer?.id !== transferId) return state;
  return { ...state, pending_transfer: null };
}

/** Optimistic local transition when the controller gives away control. */
export function applyGiveControlOptimistic(
  state: ScoringSessionStatusCore,
): ScoringSessionStatusCore {
  return {
    ...state,
    scoring_role: "viewer",
    has_active_controller: true,
    pending_transfer: null,
  };
}

/** Optimistic local transition when a viewer's request is sent. */
export function applyControlRequestOptimistic(
  state: ScoringSessionStatusCore,
  transferId: string,
): ScoringSessionStatusCore {
  return {
    ...state,
    pending_transfer: { id: transferId, direction: "outgoing" },
  };
}

/** Optimistic when transfer completes on the requester device. */
export function applyControlGrantedOptimistic(
  state: ScoringSessionStatusCore,
): ScoringSessionStatusCore {
  return {
    ...state,
    scoring_role: "controller",
    pending_transfer: null,
    has_active_controller: true,
  };
}

/** Optimistic when the controller declined the request. */
export function applyControlDeclinedOptimistic(
  state: ScoringSessionStatusCore,
): ScoringSessionStatusCore {
  return { ...state, pending_transfer: null };
}
