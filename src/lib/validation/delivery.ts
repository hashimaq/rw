import { z } from "zod";

const extraType = z.enum([
  "none",
  "wide",
  "no_ball",
  "bye",
  "leg_bye",
  "penalty",
]);

const wicketType = z.enum([
  "bowled",
  "caught",
  "lbw",
  "run_out",
  "stumped",
  "hit_wicket",
  "retired",
  "other",
]);

export const deliveryInputSchema = z.object({
  client_event_id: z.string().uuid(),
  innings_id: z.string().uuid(),
  sequence_in_innings: z.number().int().positive(),
  over_number: z.number().int().min(0),
  ball_number: z.number().int().min(0).max(6),
  striker_player_id: z.string().uuid().nullable().optional(),
  striker_name: z.string().trim().min(1),
  non_striker_player_id: z.string().uuid().nullable().optional(),
  non_striker_name: z.string().trim().min(1),
  bowler_player_id: z.string().uuid().nullable().optional(),
  bowler_name: z.string().trim().min(1),
  batter_runs: z.number().int().min(0).max(6),
  total_runs: z.number().int().min(0),
  extras_runs: z.number().int().min(0),
  extra_type: extraType,
  is_legal_delivery: z.boolean(),
  is_boundary: z.boolean(),
  is_six: z.boolean(),
  is_wicket: z.boolean(),
  wicket_type: wicketType.nullable(),
  dismissed_player_id: z.string().uuid().nullable().optional(),
  dismissed_player_name: z.string().nullable().optional(),
  fielder_player_id: z.string().uuid().nullable().optional(),
  fielder_name: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type DeliveryInputPayload = z.infer<typeof deliveryInputSchema>;
