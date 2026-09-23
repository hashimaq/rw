import { after, NextResponse } from "next/server";
import { AuthorizationError, requireAdmin } from "@/lib/auth/admin";
import { runMatchAiAnalysis } from "@/lib/ai/run-match-ai-analysis";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authClient = await createClient();
    await requireAdmin(authClient);
    const { id: matchId } = await context.params;
    const supabase = createServiceRoleClient();
    const { data: match } = await supabase
      .from("matches")
      .select("id, status")
      .eq("id", matchId)
      .maybeSingle();
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if (match.status !== "completed") {
      return NextResponse.json(
        { error: "Match is not completed" },
        { status: 400 },
      );
    }

    after(() => {
      void runMatchAiAnalysis(matchId);
    });

    return NextResponse.json({ ok: true, status: "processing" });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
