/** JSON Schema for Gemini structured output (match analysis model response). */
export const matchAiModelOutputJsonSchema = {
  type: "object",
  properties: {
    man_of_the_match_participant_key: { type: "string" },
    man_of_the_match_reason: { type: "string" },
    man_of_the_match_narrative: { type: "string" },
    player_summaries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          participant_key: { type: "string" },
          summary: { type: "string" },
        },
        required: ["participant_key", "summary"],
      },
    },
  },
  required: [
    "man_of_the_match_participant_key",
    "man_of_the_match_reason",
    "man_of_the_match_narrative",
    "player_summaries",
  ],
} as const;
