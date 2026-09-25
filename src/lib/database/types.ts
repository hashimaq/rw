/**
 * Application database types aligned with Supabase schema.
 * Regenerate from Supabase CLI when schema changes: `supabase gen types typescript`
 */

export type AppRole = "admin" | "member" | "super_admin";

export type MatchStatus = "setup" | "live" | "completed" | "abandoned";
export type SeriesStatus = "draft" | "active" | "completed" | "cancelled";
export type TournamentStatus = "draft" | "active" | "completed" | "cancelled";
export type TossDecision = "bat" | "bowl";
export type MatchResult =
  | "red_wings_win"
  | "opponent_win"
  | "tie"
  | "no_result"
  | "abandoned";
export type WinMarginType = "runs" | "wickets" | "other";
export type SquadStatus = "playing_xi" | "bench";
export type InningsStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "declared"
  | "forfeited";
export type BattingSide = "red_wings" | "opponent";
export type ExtraType =
  | "none"
  | "wide"
  | "no_ball"
  | "bye"
  | "leg_bye"
  | "penalty";
export type WicketType =
  | "bowled"
  | "caught"
  | "lbw"
  | "run_out"
  | "stumped"
  | "hit_wicket"
  | "retired"
  | "other";
export type ScoringSessionStatus =
  | "active"
  | "ended"
  | "superseded"
  | "admin_takeover";

export type AiAnalysisStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type ScoringControlTransferStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired";
export type ManualBowlingReviewStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected";

export type AdminAuditAction =
  | "PLAYER_CREATED"
  | "PLAYER_UPDATED"
  | "PLAYER_DEACTIVATED"
  | "PLAYER_REACTIVATED"
  | "MATCH_CREATED"
  | "MATCH_UPDATED"
  | "MATCH_STATUS_CHANGED"
  | "MATCH_DELETED"
  | "MATCH_DELETED_BY_SCORER"
  | "SCORING_SESSION_STARTED"
  | "SCORING_SESSION_ENDED"
  | "SERIES_CREATED"
  | "SERIES_UPDATED"
  | "TOURNAMENT_CREATED"
  | "TOURNAMENT_UPDATED"
  | "MANUAL_CORRECTION"
  | "SCORING_CONTROL_REQUESTED"
  | "SCORING_CONTROL_TRANSFERRED"
  | "SCORING_CONTROL_DECLINED"
  | "SCORING_CONTROL_REVOKED"
  | "ADMIN_SCORING_TAKEOVER"
  | "STATS_CORRECTED"
  | "RECORD_CORRECTED"
  | "MATCH_CORRECTED"
  | "PLAYER_STATS_CORRECTED"
  | "CAPTAIN_HISTORY_CORRECTED";

export type AdminAuditEntity =
  | "player"
  | "match"
  | "series"
  | "tournament"
  | "scoring_session"
  | "settings"
  | "other";

export interface AdminAuditEvent {
  id: string;
  actor_user_id: string;
  action: AdminAuditAction;
  entity_type: AdminAuditEntity;
  entity_id: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: AppRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  full_name: string;
  jersey_number: number | null;
  role: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  date_of_birth: string | null;
  joined_date: string | null;
  is_active: boolean;
  archived_at: string | null;
  is_official_squad: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchSquadRow {
  id: string;
  match_id: string;
  player_id: string;
  squad_status: SquadStatus;
  is_captain: boolean;
  is_wicketkeeper: boolean;
  batting_position: number | null;
  created_at: string;
}

export interface Match {
  id: string;
  match_number: string;
  opponent_name: string;
  match_date: string | null;
  venue: string | null;
  overs_limit: number;
  custom_overs_note: string | null;
  status: MatchStatus;
  series_id: string | null;
  tournament_id: string | null;
  toss_winner: BattingSide | null;
  toss_decision: TossDecision | null;
  red_wings_batting_first: boolean | null;
  result: MatchResult | null;
  winner: BattingSide | null;
  win_margin: number | null;
  win_margin_type: WinMarginType | null;
  scorer_pin_hash: string | null;
  is_public_live: boolean;
  is_public_scorecard: boolean;
  share_slug: string | null;
  player_of_match_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface MatchAiAnalysisRow {
  id: string;
  match_id: string;
  status: AiAnalysisStatus;
  player_of_match_id: string | null;
  generated_analysis: Record<string, unknown> | null;
  model_version: string | null;
  error_message: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  client_event_id: string;
  innings_id: string;
  sequence_in_innings: number;
  over_number: number;
  ball_number: number;
  striker_player_id: string | null;
  striker_name: string;
  non_striker_player_id: string | null;
  non_striker_name: string;
  bowler_player_id: string | null;
  bowler_name: string;
  batter_runs: number;
  total_runs: number;
  extras_runs: number;
  extra_type: ExtraType;
  is_legal_delivery: boolean;
  is_boundary: boolean;
  is_six: boolean;
  is_wicket: boolean;
  wicket_type: WicketType | null;
  dismissed_player_id: string | null;
  dismissed_player_name: string | null;
  fielder_player_id: string | null;
  fielder_name: string | null;
  notes: string | null;
  created_at: string;
}

export type DeliveryCommentaryStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed";

export interface DeliveryCommentaryRow {
  client_event_id: string;
  match_id: string;
  innings_id: string;
  sequence_in_innings: number;
  status: DeliveryCommentaryStatus;
  commentary_text: string | null;
  audio_storage_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface InningsRow {
  id: string;
  match_id: string;
  innings_number: number;
  batting_team: BattingSide;
  bowling_team: BattingSide;
  innings_status: InningsStatus;
  target: number | null;
  overs_limit: number;
  total_runs: number;
  wickets: number;
  completed_at: string | null;
  created_at: string;
}

export interface ScoringSessionRow {
  id: string;
  match_id: string;
  session_token_hash: string;
  device_label: string | null;
  status: ScoringSessionStatus;
  is_scoring_controller: boolean;
  started_at: string;
  last_seen_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface ScoringControlTransferRow {
  id: string;
  match_id: string;
  requesting_session_id: string;
  controller_session_id: string;
  status: ScoringControlTransferStatus;
  created_at: string;
  resolved_at: string | null;
}

type SupabaseRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableDef<Row, Insert, Update = Partial<Insert>> = {
  Row: Row & Record<string, unknown>;
  Insert: Insert & Record<string, unknown>;
  Update: Update & Record<string, unknown>;
  Relationships: SupabaseRelationship[];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<
        Profile,
        {
          id: string;
          full_name: string;
          role?: AppRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      players: TableDef<
        Player,
        {
          id?: string;
          full_name: string;
          jersey_number: number | null;
          role?: string | null;
          batting_style?: string | null;
          bowling_style?: string | null;
          date_of_birth?: string | null;
          joined_date?: string | null;
          is_active?: boolean;
          archived_at?: string | null;
          is_official_squad?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      match_squads: TableDef<
        MatchSquadRow,
        {
          id?: string;
          match_id: string;
          player_id: string;
          squad_status?: SquadStatus;
          is_captain?: boolean;
          is_wicketkeeper?: boolean;
          batting_position?: number | null;
          created_at?: string;
        }
      >;
      matches: TableDef<
        Match,
        {
          id?: string;
          match_number?: string;
          opponent_name: string;
          match_date?: string | null;
          venue?: string | null;
          overs_limit: number;
          custom_overs_note?: string | null;
          status?: MatchStatus;
          series_id?: string | null;
          tournament_id?: string | null;
          toss_winner?: BattingSide | null;
          toss_decision?: TossDecision | null;
          red_wings_batting_first?: boolean | null;
          result?: MatchResult | null;
          winner?: BattingSide | null;
          win_margin?: number | null;
          win_margin_type?: WinMarginType | null;
          scorer_pin_hash?: string | null;
          is_public_live?: boolean;
          is_public_scorecard?: boolean;
          share_slug?: string | null;
          player_of_match_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        }
      >;
      innings: TableDef<
        InningsRow,
        {
          id?: string;
          match_id: string;
          innings_number: number;
          batting_team: BattingSide;
          bowling_team: BattingSide;
          innings_status?: InningsStatus;
          target?: number | null;
          overs_limit: number;
          total_runs?: number;
          wickets?: number;
          completed_at?: string | null;
          created_at?: string;
        }
      >;
      deliveries: TableDef<
        Delivery,
        {
          id?: string;
          client_event_id: string;
          innings_id: string;
          sequence_in_innings: number;
          over_number: number;
          ball_number: number;
          striker_player_id?: string | null;
          striker_name: string;
          non_striker_player_id?: string | null;
          non_striker_name: string;
          bowler_player_id?: string | null;
          bowler_name: string;
          batter_runs?: number;
          total_runs?: number;
          extras_runs?: number;
          extra_type?: ExtraType;
          is_legal_delivery?: boolean;
          is_boundary?: boolean;
          is_six?: boolean;
          is_wicket?: boolean;
          wicket_type?: WicketType | null;
          dismissed_player_id?: string | null;
          dismissed_player_name?: string | null;
          fielder_player_id?: string | null;
          fielder_name?: string | null;
          notes?: string | null;
          created_at?: string;
        }
      >;
      delivery_commentary: TableDef<
        DeliveryCommentaryRow,
        {
          client_event_id: string;
          match_id: string;
          innings_id: string;
          sequence_in_innings: number;
          status?: DeliveryCommentaryStatus;
          commentary_text?: string | null;
          audio_storage_path?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      scoring_sessions: TableDef<
        ScoringSessionRow,
        {
          id?: string;
          match_id: string;
          session_token_hash: string;
          device_label?: string | null;
          status?: ScoringSessionStatus;
          is_scoring_controller?: boolean;
          started_at?: string;
          last_seen_at?: string;
          ended_at?: string | null;
          created_at?: string;
        }
      >;
      scoring_control_transfers: TableDef<
        ScoringControlTransferRow,
        {
          id?: string;
          match_id: string;
          requesting_session_id: string;
          controller_session_id: string;
          status?: ScoringControlTransferStatus;
          created_at?: string;
          resolved_at?: string | null;
        }
      >;
      admin_audit_events: TableDef<
        AdminAuditEvent,
        {
          id?: string;
          actor_user_id: string;
          action: AdminAuditAction;
          entity_type: AdminAuditEntity;
          entity_id?: string | null;
          previous_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        }
      >;
      match_ai_analysis: TableDef<
        MatchAiAnalysisRow,
        {
          id?: string;
          match_id: string;
          status?: AiAnalysisStatus;
          player_of_match_id?: string | null;
          generated_analysis?: Record<string, unknown> | null;
          model_version?: string | null;
          error_message?: string | null;
          generated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      upsert_delivery_idempotent: {
        Args: {
          p_client_event_id: string;
          p_innings_id: string;
          p_sequence_in_innings: number;
          p_over_number: number;
          p_ball_number: number;
          p_striker_player_id: string | null;
          p_striker_name: string;
          p_non_striker_player_id: string | null;
          p_non_striker_name: string;
          p_bowler_player_id: string | null;
          p_bowler_name: string;
          p_batter_runs: number;
          p_total_runs: number;
          p_extras_runs: number;
          p_extra_type: ExtraType;
          p_is_legal_delivery: boolean;
          p_is_boundary: boolean;
          p_is_six: boolean;
          p_is_wicket: boolean;
          p_wicket_type: WicketType | null;
          p_dismissed_player_id: string | null;
          p_dismissed_player_name: string | null;
          p_fielder_player_id: string | null;
          p_fielder_name: string | null;
          p_notes: string | null;
        };
        Returns: string;
      };
      approve_scoring_control_transfer: {
        Args: { p_transfer_id: string };
        Returns: string;
      };
      release_scoring_controller: {
        Args: { p_match_id: string };
        Returns: undefined;
      };
    };
  };
}
