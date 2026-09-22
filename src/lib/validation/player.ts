import { z } from "zod";

const optionalJersey = z
  .union([z.number().int().min(0).max(999), z.null()])
  .optional();

export const createPlayerSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  jersey_number: optionalJersey,
  role: z.string().trim().max(80).optional().nullable(),
  batting_style: z.string().trim().max(80).optional().nullable(),
  bowling_style: z.string().trim().max(80).optional().nullable(),
  date_of_birth: z.string().date().optional().nullable(),
  joined_date: z.string().date().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const updatePlayerSchema = createPlayerSchema.partial().extend({
  full_name: z.string().trim().min(1).max(120).optional(),
  jersey_number: z.number().int().min(0).max(999).nullable().optional(),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
