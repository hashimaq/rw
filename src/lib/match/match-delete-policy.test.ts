import { describe, expect, it } from "vitest";
import {
  authorizeAdminMatchDelete,
  authorizeScorerMatchDelete,
} from "@/lib/match/match-delete-policy";

const MATCH_A = "11111111-1111-4111-8111-111111111111";
const MATCH_B = "22222222-2222-4222-8222-222222222222";

describe("match delete authorization", () => {
  describe("admin", () => {
    it("allows admin to delete any match", () => {
      expect(authorizeAdminMatchDelete({ isAdmin: true }).allowed).toBe(true);
    });

    it("denies non-admin", () => {
      const r = authorizeAdminMatchDelete({ isAdmin: false });
      expect(r.allowed).toBe(false);
      if (!r.allowed) expect(r.code).toBe("not_authorized");
    });
  });

  describe("scorer controller session", () => {
    it("allows deleting own setup match session", () => {
      const r = authorizeScorerMatchDelete({
        sessionMatchId: MATCH_A,
        requestedMatchId: MATCH_A,
        sessionActive: true,
        isScoringController: true,
      });
      expect(r.allowed).toBe(true);
      if (r.allowed) expect(r.via).toBe("scorer_controller");
    });

    it("allows deleting own live match session", () => {
      expect(
        authorizeScorerMatchDelete({
          sessionMatchId: MATCH_A,
          requestedMatchId: MATCH_A,
          sessionActive: true,
          isScoringController: true,
        }).allowed,
      ).toBe(true);
    });

    it("denies deleting another scorer's match (scenario B)", () => {
      const r = authorizeScorerMatchDelete({
        sessionMatchId: MATCH_A,
        requestedMatchId: MATCH_B,
        sessionActive: true,
        isScoringController: true,
      });
      expect(r.allowed).toBe(false);
      if (!r.allowed) expect(r.code).toBe("match_mismatch");
    });

    it("denies arbitrary match ID without session (scenario C)", () => {
      const r = authorizeScorerMatchDelete({
        sessionMatchId: null,
        requestedMatchId: MATCH_B,
        sessionActive: false,
        isScoringController: false,
      });
      expect(r.allowed).toBe(false);
      if (!r.allowed) expect(r.code).toBe("session_required");
    });

    it("denies viewer session", () => {
      const r = authorizeScorerMatchDelete({
        sessionMatchId: MATCH_A,
        requestedMatchId: MATCH_A,
        sessionActive: true,
        isScoringController: false,
      });
      expect(r.allowed).toBe(false);
      if (!r.allowed) expect(r.code).toBe("not_scoring_controller");
    });

    it("denies expired/missing session", () => {
      const r = authorizeScorerMatchDelete({
        sessionMatchId: MATCH_A,
        requestedMatchId: MATCH_A,
        sessionActive: false,
        isScoringController: true,
      });
      expect(r.allowed).toBe(false);
      if (!r.allowed) expect(r.code).toBe("session_required");
    });
  });
});
