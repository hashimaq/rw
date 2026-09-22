import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/admin";

export function authorizationErrorResponse(err: unknown) {
  if (err instanceof AuthorizationError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "Request failed";
  const status = message.includes("Admin authorization") ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}
