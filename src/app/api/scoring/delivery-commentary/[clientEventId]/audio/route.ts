import { NextResponse } from "next/server";
import { requireActiveScorerSession } from "@/lib/auth/scoring-session";
import { getCommentaryAudioFromEphemeralCache } from "@/lib/commentary/commentary-audio-ephemeral-cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const BUCKET = "delivery-commentary";

async function canReadCommentaryAudio(
  matchId: string,
  userId: string | null,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data: match } = await admin
    .from("matches")
    .select("status, is_public_live")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return false;
  if (match.status === "live" || match.status === "completed") {
    if (match.is_public_live) return true;
  }

  try {
    const scorer = await requireActiveScorerSession(matchId);
    if (scorer.matchId === matchId) return true;
  } catch {
    /* not an active scorer session */
  }

  if (!userId) return false;

  const server = await createClient();
  const { data: profile } = await server
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (
    profile?.role === "admin" ||
    profile?.role === "super_admin" ||
    profile?.role === "member"
  ) {
    return true;
  }

  return false;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ clientEventId: string }> },
) {
  const { clientEventId } = await context.params;

  const server = await createClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  const cached = getCommentaryAudioFromEphemeralCache(clientEventId);
  if (cached) {
    const allowed = await canReadCommentaryAudio(
      cached.matchId,
      user?.id ?? null,
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return new NextResponse(new Uint8Array(cached.buffer), {
      status: 200,
      headers: {
        "Content-Type": cached.mimeType,
        "Cache-Control": "private, max-age=3600",
        "X-RW-Commentary-Source": "ephemeral",
      },
    });
  }

  const admin = createServiceRoleClient();
  const { data: row, error } = await admin
    .from("delivery_commentary")
    .select("match_id, status, audio_storage_path")
    .eq("client_event_id", clientEventId)
    .maybeSingle();

  if (error || !row || row.status !== "ready") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canReadCommentaryAudio(row.match_id, user?.id ?? null);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!row.audio_storage_path) {
    return NextResponse.json({ error: "Audio not ready" }, { status: 404 });
  }

  const path = row.audio_storage_path;
  let blob: Blob | null = null;
  let downloadError: { message: string } | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await admin.storage.from(BUCKET).download(path);
    downloadError = result.error;
    blob = result.data;
    if (blob && blob.size > 0) break;
    await new Promise((r) => setTimeout(r, 150));
  }

  if (downloadError || !blob || blob.size === 0) {
    return NextResponse.json({ error: "Audio unavailable" }, { status: 404 });
  }

  const bytes = await blob.arrayBuffer();
  const contentType = row.audio_storage_path.endsWith(".wav")
    ? "audio/wav"
    : "audio/mpeg";

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "X-RW-Commentary-Source": "storage",
    },
  });
}
