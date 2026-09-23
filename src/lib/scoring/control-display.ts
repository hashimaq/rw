/** Friendly label for a scoring session device (no IDs or tokens). */
export function formatScoringDeviceLabel(
  deviceLabel: string | null | undefined,
): string {
  const trimmed = deviceLabel?.trim();
  if (trimmed) return trimmed;
  return "Another device";
}

export function formatTakeoverRequestLine(
  deviceLabel: string | null | undefined,
): string {
  const name = formatScoringDeviceLabel(deviceLabel);
  if (name === "Another device") {
    return "Another device wants to take over scoring.";
  }
  return `${name} wants to take over scoring.`;
}
