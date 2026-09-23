export function participantKey(
  playerId: string | null,
  name: string,
): string {
  if (playerId) return `player:${playerId}`;
  const normalized = name.trim().toLowerCase();
  return `name:${normalized}`;
}

export function oversFromLegalBalls(legalBalls: number): string {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
}

export function oversDecimalFromLegalBalls(legalBalls: number): number {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return overs + balls / 10;
}

export function runRate(totalRuns: number, legalBalls: number): number {
  if (legalBalls === 0) return 0;
  return (totalRuns / legalBalls) * 6;
}

export function strikeRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return (runs / balls) * 100;
}

export function economy(runsConceded: number, legalBalls: number): number {
  if (legalBalls === 0) return 0;
  return (runsConceded / legalBalls) * 6;
}

export function requiredRunRate(
  runsNeeded: number,
  legalBallsRemaining: number,
): number {
  if (legalBallsRemaining <= 0) return runsNeeded > 0 ? Infinity : 0;
  return (runsNeeded / legalBallsRemaining) * 6;
}
