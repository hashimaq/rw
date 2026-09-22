import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { authorizationErrorResponse } from "@/lib/auth/api-authorization";
import { createClient } from "@/lib/supabase/server";

/**
 * Super Admin-only entry point for future historical/statistical corrections.
 * Normal admins must receive 403 here (server-enforced).
 */
export async function POST() {
  try {
    const supabase = await createClient();
    await requireSuperAdmin(supabase);
    return NextResponse.json(
      {
        error:
          "Corrections are not implemented yet. This endpoint is reserved for Super Admin mutations.",
      },
      { status: 501 },
    );
  } catch (err) {
    return authorizationErrorResponse(err);
  }
}
