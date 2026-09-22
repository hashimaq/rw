/** Columns required by match list/card UI — avoids wide selects. */
export const MATCH_CARD_SELECT =
  "id, match_number, opponent_name, match_date, venue, status, share_slug, result, started_at, created_at, completed_at, overs_limit" as const;
