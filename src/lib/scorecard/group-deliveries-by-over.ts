import type { DeliveryInput } from "@/lib/scoring-engine/types";

/** Group deliveries by over_number (0-based), sorted ascending. */
export function groupDeliveriesByOver(
  deliveries: DeliveryInput[],
): Array<[overNumber: number, balls: DeliveryInput[]]> {
  const map = new Map<number, DeliveryInput[]>();
  for (const d of deliveries) {
    const list = map.get(d.overNumber) ?? [];
    list.push(d);
    map.set(d.overNumber, list);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}
