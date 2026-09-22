import { randomBytes } from "crypto";

/** URL-safe slug for public live/scorecard links. */
export function generateShareSlug(length = 10): string {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

export function publicLivePath(slug: string): string {
  return `/live/${slug}`;
}

export function publicScorecardPath(slug: string): string {
  return `/match/${slug}`;
}
