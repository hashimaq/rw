import { describe, expect, it } from "vitest";
import { formatTakeoverRequestLine } from "@/lib/scoring/control-display";
import {
  applyControlDeclinedOptimistic,
  applyControlRequestOptimistic,
  applyGiveControlOptimistic,
  applyKeepScoringOptimistic,
  sessionStatusFromApiBody,
} from "@/lib/scoring/session-status-client";

describe("scoring control transfer (client state)", () => {
  const base = {
    authorized: true,
    scoring_role: "controller" as const,
    has_active_controller: true,
    pending_transfer: {
      id: "transfer-1",
      direction: "incoming" as const,
      requester_label: "Hashim's phone",
    },
  };

  it("parses session status API body", () => {
    expect(
      sessionStatusFromApiBody({
        authorized: true,
        scoring_role: "viewer",
        has_active_controller: true,
        pending_transfer: { id: "t1", direction: "outgoing" },
      }),
    ).toEqual({
      authorized: true,
      scoring_role: "viewer",
      has_active_controller: true,
      pending_transfer: { id: "t1", direction: "outgoing" },
    });
  });

  it("keep scoring clears pending incoming transfer", () => {
    expect(applyKeepScoringOptimistic(base, "transfer-1")).toEqual({
      ...base,
      pending_transfer: null,
    });
  });

  it("give control moves device to viewer", () => {
    expect(applyGiveControlOptimistic(base)).toEqual({
      ...base,
      scoring_role: "viewer",
      pending_transfer: null,
    });
  });

  it("request sets outgoing pending transfer", () => {
    const viewer = {
      ...base,
      scoring_role: "viewer" as const,
      pending_transfer: null,
    };
    expect(applyControlRequestOptimistic(viewer, "transfer-2")).toEqual({
      ...viewer,
      pending_transfer: { id: "transfer-2", direction: "outgoing" },
    });
  });

  it("declined clears outgoing pending", () => {
    const waiting = applyControlRequestOptimistic(
      { ...base, scoring_role: "viewer", pending_transfer: null },
      "transfer-2",
    );
    expect(applyControlDeclinedOptimistic(waiting)).toEqual({
      ...waiting,
      pending_transfer: null,
    });
  });

  it("formats friendly takeover line", () => {
    expect(formatTakeoverRequestLine("Hashim's phone")).toBe(
      "Hashim's phone wants to take over scoring.",
    );
    expect(formatTakeoverRequestLine(null)).toBe(
      "Another device wants to take over scoring.",
    );
  });
});
