import { NextResponse } from "next/server";
import { SCORER_SESSION_COOKIE } from "@/lib/auth/scoring-session";

export function applyScorerSessionCookie(
  response: NextResponse,
  sessionId: string,
  token: string,
): NextResponse {
  response.cookies.set(SCORER_SESSION_COOKIE, `${sessionId}:${token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export function clearScorerSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SCORER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
