import type { SupabaseClient } from "@supabase/supabase-js";
import { queryOfficialPlayers } from "@/lib/data/players-query";
import type { Database, Player } from "@/lib/database/types";
import type {
  CreatePlayerInput,
  UpdatePlayerInput,
} from "@/lib/validation/player";

export class PlayersRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listOfficial(includeInactive = false): Promise<Player[]> {
    return queryOfficialPlayers(this.supabase, includeInactive);
  }

  async getById(id: string): Promise<Player | null> {
    const { data, error } = await this.supabase
      .from("players")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as Player | null) ?? null;
  }

  async create(input: CreatePlayerInput): Promise<Player> {
    const { data, error } = await this.supabase
      .from("players")
      .insert({
        full_name: input.full_name.trim().replace(/\s+/g, " "),
        jersey_number: input.jersey_number ?? null,
        role: input.role ?? null,
        batting_style: input.batting_style ?? null,
        bowling_style: input.bowling_style ?? null,
        date_of_birth: input.date_of_birth ?? null,
        joined_date: input.joined_date ?? null,
        is_active: input.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as Player;
  }

  async update(id: string, input: UpdatePlayerInput): Promise<Player> {
    const patch: Record<string, unknown> = { ...input };
    if (typeof input.full_name === "string") {
      patch.full_name = input.full_name.trim().replace(/\s+/g, " ");
    }

    const { data, error } = await this.supabase
      .from("players")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return data as Player;
  }

  async setActive(id: string, active: boolean): Promise<Player> {
    const { data, error } = await this.supabase
      .from("players")
      .update({
        is_active: active,
        archived_at: active ? null : new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return data as Player;
  }
}
