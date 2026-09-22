import { z } from "zod";

export const OVERS_PRESETS = [5, 10, 15, 20, 25, 30, 40, 50] as const;

const squadStatusSchema = z.enum(["playing_xi", "bench"]);

const lineupOfficialSchema = z.object({
  kind: z.literal("official"),
  player_id: z.string().uuid(),
  squad_status: squadStatusSchema,
  is_captain: z.boolean(),
  is_wicketkeeper: z.boolean(),
});

const lineupGuestSchema = z.object({
  kind: z.literal("guest"),
  full_name: z.string().trim().min(1).max(120),
  jersey_number: z.number().int().min(0).max(999).nullable().optional(),
  squad_status: squadStatusSchema,
  is_captain: z.boolean(),
  is_wicketkeeper: z.boolean(),
});

export const lineupEntrySchema = z.discriminatedUnion("kind", [
  lineupOfficialSchema,
  lineupGuestSchema,
]);

export const redWingsInningsSchema = z.union([z.literal(1), z.literal(2)]);
export const redWingsRoleSchema = z.enum(["batting", "bowling"]);

export const matchSetupCreateSchema = z
  .object({
    opponent_name: z.string().trim().min(1, "Opponent is required").max(120),
    match_date: z.string().date().optional().nullable(),
    venue: z.string().trim().max(200).optional().nullable(),
    overs_limit: z.number().int().min(1).max(100),
    custom_overs_note: z.string().trim().max(200).optional().nullable(),
    series_id: z.string().uuid().optional().nullable(),
    tournament_id: z.string().uuid().optional().nullable(),
    /** Whether Red Wings are batting or bowling in this session's active innings. */
    red_wings_role: redWingsRoleSchema,
    /** 1st or 2nd innings for this scoring session. */
    red_wings_innings: redWingsInningsSchema,
    /** Completed 1st innings total (batting team of inn. 1), required when red_wings_innings is 2. */
    first_innings_runs: z.number().int().min(0).optional(),
    first_innings_wickets: z.number().int().min(0).max(10).optional(),
    /** @deprecated Use first_innings_runs */
    opponent_first_innings_runs: z.number().int().min(0).optional(),
    /** @deprecated Use first_innings_wickets */
    opponent_first_innings_wickets: z.number().int().min(0).max(10).optional(),
    lineup: z.array(lineupEntrySchema).min(1),
    scorer_pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  })
  .superRefine((data, ctx) => {
    const xi = data.lineup.filter((e) => e.squad_status === "playing_xi");
    if (xi.length < 1) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one available match player",
        path: ["lineup"],
      });
    }

    const officialIds = new Set<string>();
    for (const entry of data.lineup) {
      if (entry.kind === "official") {
        if (officialIds.has(entry.player_id)) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate player in lineup",
            path: ["lineup"],
          });
          return;
        }
        officialIds.add(entry.player_id);
      }
    }

    const captains = data.lineup.filter((e) => e.is_captain);
    const keepers = data.lineup.filter((e) => e.is_wicketkeeper);
    if (captains.length !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Select exactly one captain",
        path: ["lineup"],
      });
    }
    if (keepers.length !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Select exactly one wicketkeeper",
        path: ["lineup"],
      });
    }

    const captain = captains[0];
    const keeper = keepers[0];
    if (captain && captain.squad_status !== "playing_xi") {
      ctx.addIssue({
        code: "custom",
        message: "Captain must be in the available match squad",
        path: ["lineup"],
      });
    }
    if (keeper && keeper.squad_status !== "playing_xi") {
      ctx.addIssue({
        code: "custom",
        message: "Wicketkeeper must be in the available match squad",
        path: ["lineup"],
      });
    }

    if (data.red_wings_innings === 2) {
      const runs =
        data.first_innings_runs ?? data.opponent_first_innings_runs;
      const wickets =
        data.first_innings_wickets ?? data.opponent_first_innings_wickets;
      if (runs == null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter first innings runs",
          path: ["first_innings_runs"],
        });
      }
      if (wickets == null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter first innings wickets",
          path: ["first_innings_wickets"],
        });
      }
    }
  });

export type MatchSetupCreateInput = z.infer<typeof matchSetupCreateSchema>;
export type LineupEntry = z.infer<typeof lineupEntrySchema>;

export const matchSetupClientCreateSchema = matchSetupCreateSchema
  .extend({
    scorer_pin_confirm: z.string().regex(/^\d{4}$/),
  })
  .superRefine((data, ctx) => {
    if (data.scorer_pin !== data.scorer_pin_confirm) {
      ctx.addIssue({
        code: "custom",
        message: "PIN confirmation does not match",
        path: ["scorer_pin_confirm"],
      });
    }
  });

export type MatchSetupClientCreateInput = z.infer<
  typeof matchSetupClientCreateSchema
>;
