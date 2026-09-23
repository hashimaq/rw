import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-session";
import { loadMatchScorecardPage } from "@/lib/data/match-scorecard";
import { generateScorecardPdfBuffer } from "@/lib/scorecard/generate-scorecard-pdf";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const { admin } = await getServerSession();
  const result = await loadMatchScorecardPage(slug, admin);

  if (result.status !== "ok") {
    return NextResponse.json(
      { error: "Scorecard not available" },
      { status: result.status === "forbidden" ? 403 : 404 },
    );
  }

  const pdf = await generateScorecardPdfBuffer(result.data);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="red-wings-scorecard-${slug}.pdf"`,
    },
  });
}
