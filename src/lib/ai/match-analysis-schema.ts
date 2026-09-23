import { z } from "zod";

/** Model output — narratives only; stats come from the dataset. */
export const matchAiModelOutputSchema = z.object({
  man_of_the_match_participant_key: z.string().min(1),
  man_of_the_match_reason: z.string().min(1).max(600),
  man_of_the_match_narrative: z.string().min(1).max(900),
  player_summaries: z.array(
    z.object({
      participant_key: z.string().min(1),
      summary: z.string().min(1).max(500),
    }),
  ),
});

export type MatchAiModelOutput = z.infer<typeof matchAiModelOutputSchema>;

/** Validates persisted JSON in match_ai_analysis.generated_analysis */
export const storedMatchAiAnalysisSchema = z.object({
  version: z.literal(1),
  man_of_the_match: z.object({
    participant_key: z.string(),
    name: z.string(),
    player_id: z.string().uuid().nullable(),
    reason: z.string(),
    narrative: z.string(),
  }),
  player_summaries: z.array(
    z.object({
      participant_key: z.string(),
      summary: z.string(),
    }),
  ),
  provider: z.string().optional(),
  model: z.string().optional(),
});
