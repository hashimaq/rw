import { NextResponse } from "next/server";
import { getAdminAuthorization } from "@/lib/auth/admin";
import { authorizationErrorResponse } from "@/lib/auth/api-authorization";
import { createClient } from "@/lib/supabase/server";

/** Authenticated admin privilege summary (no secrets). */
export async function GET() {
  try {
    const supabase = await createClient();
    const authz = await getAdminAuthorization(supabase);
    if (!authz.admin) {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }
    return NextResponse.json({
      admin: true,
      super_admin: authz.superAdmin,
      role: authz.role,
      label: authz.label,
    });
  } catch (err) {
    return authorizationErrorResponse(err);
  }
}
