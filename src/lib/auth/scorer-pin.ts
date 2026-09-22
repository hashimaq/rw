import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

const PIN_SALT_ROUNDS = 10;

export async function hashScorerPin(pin: string): Promise<string> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error("Scorer PIN must be exactly 4 digits");
  }
  return bcrypt.hash(pin, PIN_SALT_ROUNDS);
}

export async function verifyScorerPin(
  pin: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) return false;
  if (!/^\d{4}$/.test(pin)) return false;
  return bcrypt.compare(pin, hash);
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifySessionToken(token: string, hash: string): boolean {
  const computed = hashSessionToken(token);
  try {
    return timingSafeEqual(
      Buffer.from(computed, "utf8"),
      Buffer.from(hash, "utf8"),
    );
  } catch {
    return false;
  }
}
