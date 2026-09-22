import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Match } from "@/lib/database/types";
import type { MatchSetupCreateInput } from "@/lib/validation/match-setup";
import {
  inningsInsertPlan,
  matchMetadataFromSetup,
} from "@/lib/match/match-setup-plan";
import { generateShareSlug } from "@/lib/match/share-slug";

export type MatchDeleteSnapshot = {
  id: string;
  match_number: string;
  opponent_name: string;
  status: Match["status"];
  overs_limit: number;
  share_slug: string | null;
  series_id: string | null;
  tournament_id: string | null;
  match_date: string | null;
  venue: string | null;
};

export class MatchDeleteBlockedError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MatchDeleteBlockedError";
    this.code = code;
  }
}

export class MatchesRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getById(id: string): Promise<Match | null> {
    const { data, error } = await this.supabase
      .from("matches")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as Match | null) ?? null;
  }

  async getByShareSlug(slug: string): Promise<Match | null> {
    const { data, error } = await this.supabase
      .from("matches")
      .select("*")
      .eq("share_slug", slug)
      .maybeSingle();
    if (error) throw error;
    return (data as Match | null) ?? null;
  }

  async createFullSetup(
    input: MatchSetupCreateInput,
    scorerPinHash: string,
    createdBy: string | null,
  ): Promise<Match> {
    const meta = matchMetadataFromSetup(
      input.red_wings_role,
      input.red_wings_innings,
    );

    const guestPlayerIds: string[] = [];

    const { data: match, error: matchError } = await this.supabase
      .from("matches")
      .insert({
        opponent_name: input.opponent_name,
        match_date: input.match_date ?? null,
        venue: input.venue ?? null,
        overs_limit: input.overs_limit,
        custom_overs_note: input.custom_overs_note ?? null,
        series_id: input.series_id ?? null,
        tournament_id: input.tournament_id ?? null,
        toss_winner: meta.toss_winner,
        toss_decision: meta.toss_decision,
        red_wings_batting_first: meta.red_wings_batting_first,
        scorer_pin_hash: scorerPinHash,
        share_slug: generateShareSlug(),
        created_by: createdBy,
        status: "setup",
      })
      .select("*")
      .single();

    if (matchError || !match) {
      throw matchError ?? new Error("Could not create match");
    }

    try {
      const squadRows: Array<{
        match_id: string;
        player_id: string;
        squad_status: "playing_xi" | "bench";
        is_captain: boolean;
        is_wicketkeeper: boolean;
      }> = [];

      for (const entry of input.lineup) {
        let playerId: string;
        if (entry.kind === "guest") {
          const fullName = entry.full_name.trim().replace(/\s+/g, " ");
          let { data: guest, error: guestError } = await this.supabase
            .from("players")
            .insert({
              full_name: fullName,
              jersey_number: entry.jersey_number ?? null,
              is_active: true,
              is_official_squad: false,
            })
            .select("id")
            .single();

          if (
            guestError?.message?.includes("is_official_squad") ||
            guestError?.message?.includes("does not exist")
          ) {
            const legacy = await this.supabase
              .from("players")
              .insert({
                full_name: fullName,
                jersey_number: entry.jersey_number ?? null,
                is_active: true,
              })
              .select("id")
              .single();
            guest = legacy.data;
            guestError = legacy.error;
          }

          if (guestError || !guest) {
            throw (
              guestError ??
              new Error(
                "Could not create guest player. Apply migration for match guest players (is_official_squad).",
              )
            );
          }
          playerId = guest.id;
          guestPlayerIds.push(playerId);
        } else {
          playerId = entry.player_id;
        }

        squadRows.push({
          match_id: match.id,
          player_id: playerId,
          squad_status: entry.squad_status,
          is_captain: entry.is_captain,
          is_wicketkeeper: entry.is_wicketkeeper,
        });
      }

      const { error: squadError } = await this.supabase
        .from("match_squads")
        .insert(squadRows);

      if (squadError) throw squadError;

      const firstRuns =
        input.first_innings_runs ?? input.opponent_first_innings_runs ?? 0;
      const firstWickets =
        input.first_innings_wickets ?? input.opponent_first_innings_wickets ?? 0;

      const plan = inningsInsertPlan(
        input.red_wings_role,
        input.red_wings_innings,
        firstRuns,
        firstWickets,
      );

      if (plan.kind === "single") {
        const { error: inningsError } = await this.supabase.from("innings").insert({
          match_id: match.id,
          innings_number: plan.inningsNumber,
          batting_team: plan.battingTeam,
          bowling_team: plan.bowlingTeam,
          overs_limit: input.overs_limit,
          innings_status: plan.status,
        });
        if (inningsError) throw inningsError;
      } else {
        const completedAt = new Date().toISOString();
        const { error: inn1Error } = await this.supabase.from("innings").insert({
          match_id: match.id,
          innings_number: plan.completedFirst.inningsNumber,
          batting_team: plan.completedFirst.battingTeam,
          bowling_team: plan.completedFirst.bowlingTeam,
          overs_limit: input.overs_limit,
          innings_status: "completed",
          total_runs: plan.completedFirst.totalRuns,
          wickets: plan.completedFirst.wickets,
          completed_at: completedAt,
        });
        if (inn1Error) throw inn1Error;

        const { error: inn2Error } = await this.supabase.from("innings").insert({
          match_id: match.id,
          innings_number: plan.activeSecond.inningsNumber,
          batting_team: plan.activeSecond.battingTeam,
          bowling_team: plan.activeSecond.bowlingTeam,
          overs_limit: input.overs_limit,
          innings_status: "not_started",
          target: plan.activeSecond.target,
        });
        if (inn2Error) throw inn2Error;
      }

      return match as Match;
    } catch (err) {
      await this.supabase.from("matches").delete().eq("id", match.id);
      if (guestPlayerIds.length > 0) {
        await this.supabase.from("players").delete().in("id", guestPlayerIds);
      }
      throw err;
    }
  }

  /** Removes a match and cascaded scoring data; cleans up match-only guest players. */
  async deleteMatchByAdmin(matchId: string): Promise<MatchDeleteSnapshot> {
    const match = await this.getById(matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    const now = new Date().toISOString();
    const { error: sessionError } = await this.supabase
      .from("scoring_sessions")
      .update({
        status: "ended",
        ended_at: now,
        is_scoring_controller: false,
      })
      .eq("match_id", matchId)
      .eq("status", "active");

    if (sessionError) throw sessionError;

    const guestPlayerIds = await this.collectMatchGuestPlayerIds(matchId);

    const snapshot: MatchDeleteSnapshot = {
      id: match.id,
      match_number: match.match_number,
      opponent_name: match.opponent_name,
      status: match.status,
      overs_limit: match.overs_limit,
      share_slug: match.share_slug,
      series_id: match.series_id,
      tournament_id: match.tournament_id,
      match_date: match.match_date,
      venue: match.venue,
    };

    const { error: deleteError } = await this.supabase
      .from("matches")
      .delete()
      .eq("id", matchId);

    if (deleteError) throw deleteError;

    if (guestPlayerIds.length > 0) {
      for (const playerId of guestPlayerIds) {
        const { count, error: countError } = await this.supabase
          .from("match_squads")
          .select("id", { count: "exact", head: true })
          .eq("player_id", playerId);

        if (countError) throw countError;
        if (count === 0) {
          const { error: guestDeleteError } = await this.supabase
            .from("players")
            .delete()
            .eq("id", playerId)
            .eq("is_official_squad", false);

          if (guestDeleteError) throw guestDeleteError;
        }
      }
    }

    return snapshot;
  }

  private async collectMatchGuestPlayerIds(matchId: string): Promise<string[]> {
    const { data: squadRows, error: squadError } = await this.supabase
      .from("match_squads")
      .select("player_id")
      .eq("match_id", matchId);

    if (squadError) throw squadError;
    const playerIds = (squadRows ?? []).map((row) => row.player_id);
    if (playerIds.length === 0) return [];

    const { data: players, error: playersError } = await this.supabase
      .from("players")
      .select("id, is_official_squad")
      .in("id", playerIds);

    if (playersError) {
      if (playersError.message.includes("is_official_squad")) {
        return [];
      }
      throw playersError;
    }

    return (players ?? [])
      .filter((p) => p.is_official_squad === false)
      .map((p) => p.id);
  }
}
