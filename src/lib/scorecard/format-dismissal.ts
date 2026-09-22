import type { WicketType } from "@/lib/database/types";

export interface DismissalFormatInput {
  wicketType: WicketType | string | null;
  bowlerName?: string | null;
  fielderName?: string | null;
}

function trimName(name: string | null | undefined): string | null {
  const t = name?.trim();
  return t ? t : null;
}

/** Human-readable dismissal line for scorecards (e.g. `c Fielder b Bowler`). */
export function formatBattingDismissal(input: DismissalFormatInput): string {
  const bowler = trimName(input.bowlerName);
  const fielder = trimName(input.fielderName);
  const wt = input.wicketType;

  switch (wt) {
    case "bowled":
      return bowler ? `b ${bowler}` : "bowled";
    case "caught":
      if (fielder && bowler) return `c ${fielder} b ${bowler}`;
      if (fielder) return `c ${fielder}`;
      if (bowler) return `c & b ${bowler}`;
      return "caught";
    case "lbw":
      return bowler ? `lbw b ${bowler}` : "lbw";
    case "stumped":
      if (fielder && bowler) return `st ${fielder} b ${bowler}`;
      if (fielder) return `st ${fielder}`;
      return "stumped";
    case "run_out":
      return fielder ? `run out (${fielder})` : "run out";
    case "hit_wicket":
      return bowler ? `hit wicket b ${bowler}` : "hit wicket";
    case "retired":
      return "retired hurt";
    case "other":
      return "out";
    default:
      return typeof wt === "string" && wt.length > 0
        ? wt.replaceAll("_", " ")
        : "out";
  }
}

/** Normalize stored dismissal labels (raw enum or pre-formatted). */
export function formatDismissalLabel(label: string | null): string | null {
  if (!label) return null;
  if (
    label.includes(" b ") ||
    label.startsWith("c ") ||
    label.startsWith("st ") ||
    label.startsWith("lbw") ||
    label.startsWith("run out") ||
    label.startsWith("hit wicket") ||
    label === "retired hurt" ||
    label === "not out"
  ) {
    return label;
  }
  return formatBattingDismissal({ wicketType: label });
}
