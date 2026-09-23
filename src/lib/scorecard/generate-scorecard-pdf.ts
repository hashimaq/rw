import "server-only";

import PDFDocument from "pdfkit";
import type { FullMatchScorecardData } from "@/lib/scorecard/types";
import {
  addPdfPage,
  bottomLimitForContext,
  createScorecardPdfContext,
  drawDocumentHeader,
  drawInningsScorecard,
  drawPerformanceAndMomPage,
  drawResultHighlight,
  finalizePdfDocument,
  installIntentionalPdfPageGuard,
} from "@/lib/scorecard/scorecard-pdf-layout";
import { loadPdfLogoBuffer } from "@/lib/scorecard/load-pdf-logo";

const PDF_LOGO_DISPLAY_PX = 44;

export async function generateScorecardPdfBuffer(
  data: FullMatchScorecardData,
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 36, size: "A4", autoFirstPage: true });
  installIntentionalPdfPageGuard(doc);
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const logoBuffer = await loadPdfLogoBuffer();
  const ctx = createScorecardPdfContext(doc);

  drawDocumentHeader(ctx, data, logoBuffer, PDF_LOGO_DISPLAY_PX);
  drawResultHighlight(ctx, data);

  const opponent = data.document.opponent;
  const [first, second] = data.innings;

  if (first) {
    drawInningsScorecard(ctx, first, opponent, { newPage: false });
  }

  if (second) {
    const limit = bottomLimitForContext(ctx);
    if (ctx.y > limit * 0.52) {
      addPdfPage(ctx);
    } else {
      ctx.y += 10;
    }
    drawInningsScorecard(ctx, second, opponent, {
      newPage: false,
      chaseContext: true,
    });
    if (data.document.resultSummary) {
      ctx.doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#c01818")
        .text(data.document.resultSummary, ctx.margin, ctx.y, {
          width: ctx.contentWidth,
          align: "center",
        });
      ctx.y = ctx.doc.y + 10;
    }
  }

  const limit = bottomLimitForContext(ctx);
  if (ctx.y > limit - 100) {
    addPdfPage(ctx);
  } else {
    ctx.y += 8;
  }

  drawPerformanceAndMomPage(ctx, data.aiAnalysis, { newPage: false });

  finalizePdfDocument(ctx);
  doc.end();
  return done;
}
