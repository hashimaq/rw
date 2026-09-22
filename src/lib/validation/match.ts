import { z } from "zod";

export const createMatchSchema = z.object({
  opponent_name: z.string().trim().min(1).max(120),
  match_date: z.string().date().optional().nullable(),
  venue: z.string().trim().max(200).optional().nullable(),
  overs_limit: z.number().int().min(1).max(100),
  custom_overs_note: z.string().trim().max(200).optional().nullable(),
  series_id: z.string().uuid().optional().nullable(),
  tournament_id: z.string().uuid().optional().nullable(),
  scorer_pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
});

export const updateMatchNumberSchema = z.object({
  match_number: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^RW-\d{3,}$/i, "Use format RW-001 or longer sequence"),
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
