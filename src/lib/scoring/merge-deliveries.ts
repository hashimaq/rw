import type { DeliveryInput } from "@/lib/scoring-engine/types";

/** Merge server + local deliveries by clientEventId (local wins on conflict). */
export function mergeDeliveries(
  server: DeliveryInput[],
  localInputs: DeliveryInput[],
): DeliveryInput[] {
  const map = new Map<string, DeliveryInput>();
  for (const d of server) map.set(d.clientEventId, d);
  for (const d of localInputs) map.set(d.clientEventId, d);
  return [...map.values()].sort(
    (a, b) => a.sequenceInInnings - b.sequenceInInnings,
  );
}
