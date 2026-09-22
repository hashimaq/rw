import type { AdminAuditEventWithActor } from "@/lib/audit/types";

function actorLabel(event: AdminAuditEventWithActor): string {
  const name = event.actor?.full_name?.trim();
  return name && name.length > 0 ? name : "An admin";
}

function entityHref(event: AdminAuditEventWithActor): string | null {
  if (!event.entity_id) return null;
  switch (event.entity_type) {
    case "player":
      return `/players/${event.entity_id}`;
    case "match":
      return `/matches`;
    default:
      return null;
  }
}

export function formatAdminActivityLine(event: AdminAuditEventWithActor): {
  text: string;
  href: string | null;
} {
  const who = actorLabel(event);
  const nd = event.new_data ?? {};
  const pd = event.previous_data ?? {};

  switch (event.action) {
    case "PLAYER_CREATED":
      return {
        text: `${who} added player "${String(nd.full_name ?? "Unknown")}"`,
        href: entityHref(event),
      };
    case "PLAYER_UPDATED":
      if (
        pd.jersey_number !== undefined &&
        nd.jersey_number !== undefined &&
        pd.jersey_number !== nd.jersey_number
      ) {
        return {
          text: `${who} changed jersey ${String(pd.jersey_number)} → ${String(nd.jersey_number)} for "${String(nd.full_name ?? pd.full_name ?? "player")}"`,
          href: entityHref(event),
        };
      }
      return {
        text: `${who} updated player "${String(nd.full_name ?? pd.full_name ?? "Unknown")}"`,
        href: entityHref(event),
      };
    case "PLAYER_DEACTIVATED":
      return {
        text: `${who} deactivated player "${String(nd.full_name ?? pd.full_name ?? "Unknown")}"`,
        href: entityHref(event),
      };
    case "PLAYER_REACTIVATED":
      return {
        text: `${who} reactivated player "${String(nd.full_name ?? pd.full_name ?? "Unknown")}"`,
        href: entityHref(event),
      };
    case "MATCH_CREATED":
      return {
        text: `${who} created match ${String(nd.match_number ?? "new match")}`,
        href: entityHref(event),
      };
    case "MATCH_STATUS_CHANGED":
      return {
        text: `${who} changed match ${String(nd.match_number ?? pd.match_number ?? "")} status`,
        href: entityHref(event),
      };
    case "MATCH_DELETED":
      return {
        text: `${who} deleted match ${String(pd.match_number ?? "unknown")} vs ${String(pd.opponent_name ?? "opponent")}`,
        href: null,
      };
    case "MATCH_DELETED_BY_SCORER":
      return {
        text: `Scorer deleted match ${String(pd.match_number ?? "unknown")} vs ${String(pd.opponent_name ?? "opponent")}`,
        href: null,
      };
    default:
      return {
        text: `${who} performed ${event.action.replaceAll("_", " ").toLowerCase()}`,
        href: entityHref(event),
      };
  }
}
