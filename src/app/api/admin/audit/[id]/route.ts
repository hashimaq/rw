import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { fetchAdminAuditById } from "@/lib/data/admin-audit";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    await requireAdmin(supabase);

    const event = await fetchAdminAuditById(id, supabase);
    if (!event) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    const status = message.includes("Admin") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
