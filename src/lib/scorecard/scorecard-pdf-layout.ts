import type { MatchAiAnalysisView } from "@/lib/ai/match-analysis-types";
import type PDFKit from "pdfkit";
import type {
  FullMatchScorecardData,
  ScorecardInningsBuilt,
  ScorecardInningsDocument,
} from "@/lib/scorecard/types";

/** Official asset (source: RW LOGO.jpg). */
export const SCORECARD_PDF_LOGO_SRC = "/brand/rw-logo.jpg";

const RW_PRIMARY = "#c01818";
const HEADER_BG = "#1a1a1a";
const HEADER_FG = "#ffffff";
const BORDER = "#cccccc";
const MUTED = "#555555";
const PAGE_SIZE = "A4" as const;
const MARGIN = 36;
const FOOTER_Y_OFFSET = 24;
const PANEL_RADIUS = 8;

type PdfDocWithPageGuard = PDFKit.PDFDocument & {
  __beginIntentionalPdfPage?: () => void;
  __endIntentionalPdfPage?: () => void;
};

export type ScorecardPdfContext = {
  doc: PDFKit.PDFDocument;
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  y: number;
  pageNumber: number;
};

/** PDFKit auto-creates pages when text overflows; scorecards use explicit pagination only. */
export function installIntentionalPdfPageGuard(doc: PDFKit.PDFDocument): void {
  const original = doc.addPage.bind(doc);
  let allow = false;
  const guarded = doc as PdfDocWithPageGuard;
  guarded.addPage = function addPageGuarded(
    options?: PDFKit.PDFDocumentOptions,
  ) {
    if (!allow) return doc;
    return original(options);
  };
  guarded.__beginIntentionalPdfPage = () => {
    allow = true;
  };
  guarded.__endIntentionalPdfPage = () => {
    allow = false;
  };
}

export function createScorecardPdfContext(
  doc: PDFKit.PDFDocument,
): ScorecardPdfContext {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  return {
    doc,
    margin: MARGIN,
    pageWidth,
    pageHeight,
    contentWidth: pageWidth - MARGIN * 2,
    y: MARGIN,
    pageNumber: 1,
  };
}

function bottomLimit(ctx: ScorecardPdfContext): number {
  return ctx.pageHeight - MARGIN - FOOTER_Y_OFFSET;
}

export function bottomLimitForContext(ctx: ScorecardPdfContext): number {
  return bottomLimit(ctx);
}

export function drawPageFooter(ctx: ScorecardPdfContext): void {
  const { doc, margin, contentWidth, pageHeight, pageNumber } = ctx;
  doc
    .fontSize(7)
    .fillColor(MUTED)
    .font("Helvetica")
    .text("RED WINGS CRICKET", margin, pageHeight - MARGIN + 2, {
      width: contentWidth,
      align: "center",
    });
  doc.text("Official Match Scorecard", margin, pageHeight - MARGIN + 11, {
    width: contentWidth,
    align: "center",
  });
  doc.text(`Page ${pageNumber}`, margin, pageHeight - MARGIN + 20, {
    width: contentWidth,
    align: "center",
  });
}

function drawRoundedPanel(
  ctx: ScorecardPdfContext,
  y: number,
  height: number,
  fill: string,
  stroke: string,
): void {
  ctx.doc
    .roundedRect(ctx.margin, y, ctx.contentWidth, height, PANEL_RADIUS)
    .lineWidth(0.75)
    .fillAndStroke(fill, stroke);
}

export function addPdfPage(ctx: ScorecardPdfContext): void {
  drawPageFooter(ctx);
  const doc = ctx.doc as PdfDocWithPageGuard;
  doc.__beginIntentionalPdfPage?.();
  ctx.doc.addPage({ size: PAGE_SIZE, margin: MARGIN });
  doc.__endIntentionalPdfPage?.();
  ctx.pageNumber += 1;
  ctx.y = MARGIN;
}

export function ensureVerticalSpace(
  ctx: ScorecardPdfContext,
  needed: number,
): void {
  if (ctx.y + needed <= bottomLimit(ctx)) return;
  addPdfPage(ctx);
}

type TableColumn = {
  header: string;
  width: number;
  align?: "left" | "center" | "right";
};

function drawTableHeader(
  ctx: ScorecardPdfContext,
  x: number,
  columns: TableColumn[],
  headerHeight: number,
): void {
  const { doc } = ctx;
  let cx = x;
  doc.save();
  doc.rect(x, ctx.y, columns.reduce((s, c) => s + c.width, 0), headerHeight);
  doc.fill(HEADER_BG);
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(HEADER_FG);
  for (const col of columns) {
    doc.text(col.header, cx + 4, ctx.y + 5, {
      width: col.width - 8,
      align: col.align ?? "left",
      lineBreak: false,
    });
    cx += col.width;
  }
  ctx.y += headerHeight;
}

function measureRowHeight(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  cells: string[],
  minRowHeight: number,
): number {
  doc.font("Helvetica").fontSize(8);
  let maxH = minRowHeight;
  for (let i = 0; i < columns.length; i++) {
    const h = doc.heightOfString(cells[i] ?? "", {
      width: columns[i].width - 8,
    });
    maxH = Math.max(maxH, h + 10);
  }
  return maxH;
}

function drawTableRow(
  ctx: ScorecardPdfContext,
  x: number,
  columns: TableColumn[],
  cells: string[],
  rowHeight: number,
): void {
  const { doc } = ctx;
  const tableWidth = columns.reduce((s, c) => s + c.width, 0);
  let cx = x;
  doc.strokeColor(BORDER).lineWidth(0.5);
  doc.rect(x, ctx.y, tableWidth, rowHeight).stroke();
  doc.font("Helvetica").fontSize(8).fillColor("#000000");
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const text = cells[i] ?? "";
    const cellW = col.width - 8;
    const cellH = rowHeight - 8;
    doc.font("Helvetica").fontSize(8);
    const fitted = truncateTextToHeight(doc, text, cellW, cellH);
    doc.text(fitted, cx + 4, ctx.y + 4, {
      width: cellW,
      align: col.align ?? "left",
      lineBreak: true,
    });
    cx += col.width;
  }
  ctx.y += rowHeight;
}

export function drawTable(
  ctx: ScorecardPdfContext,
  columns: TableColumn[],
  rows: string[][],
  options?: { headerRepeat?: boolean; minRowHeight?: number },
): void {
  const x = ctx.margin;
  const headerHeight = 18;
  const minRowHeight = options?.minRowHeight ?? 16;
  const tableWidth = columns.reduce((s, c) => s + c.width, 0);

  const drawHeader = () => {
    ensureVerticalSpace(ctx, headerHeight + minRowHeight);
    drawTableHeader(ctx, x, columns, headerHeight);
    ctx.doc.strokeColor(BORDER).lineWidth(0.5);
    ctx.doc
      .moveTo(x, ctx.y)
      .lineTo(x + tableWidth, ctx.y)
      .stroke();
  };

  drawHeader();

  for (const row of rows) {
    const rowHeight = measureRowHeight(ctx.doc, columns, row, minRowHeight);
    if (ctx.y + rowHeight > bottomLimit(ctx)) {
      addPdfPage(ctx);
      if (options?.headerRepeat) drawHeader();
    } else {
      ensureVerticalSpace(ctx, rowHeight);
    }
    drawTableRow(ctx, x, columns, row, rowHeight);
  }
  ctx.y += 6;
}

function syncDocY(ctx: ScorecardPdfContext, minAdvance = 4): void {
  ctx.y = Math.max(ctx.y, ctx.doc.y) + minAdvance;
}

/** PDFKit auto-adds pages when `text()` exceeds the page bottom; truncate instead. */
function truncateTextToHeight(
  doc: PDFKit.PDFDocument,
  text: string,
  width: number,
  maxHeight: number,
): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (doc.heightOfString(trimmed, { width }) <= maxHeight) return trimmed;
  let lo = 0;
  let hi = trimmed.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = `${trimmed.slice(0, mid).trimEnd()}…`;
    if (doc.heightOfString(candidate, { width }) <= maxHeight) lo = mid;
    else hi = mid - 1;
  }
  const cut = trimmed.slice(0, Math.max(0, lo)).trimEnd();
  return cut.length > 0 ? `${cut}…` : "…";
}

function safeTextBox(
  ctx: ScorecardPdfContext,
  text: string,
  opts: {
    bold?: boolean;
    size?: number;
    color?: string;
    maxHeight?: number;
    align?: "left" | "center" | "right";
    x?: number;
    width?: number;
  },
): void {
  const minH = 12;
  if (ctx.y + minH > bottomLimit(ctx)) addPdfPage(ctx);
  const x = opts.x ?? ctx.margin;
  const width = opts.width ?? ctx.contentWidth;
  const maxHeight = Math.min(
    opts.maxHeight ?? 120,
    bottomLimit(ctx) - ctx.y,
  );
  ctx.doc
    .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(opts.size ?? 9)
    .fillColor(opts.color ?? "#000000");
  const fitted = truncateTextToHeight(
    ctx.doc,
    text,
    width,
    Math.max(minH, maxHeight),
  );
  ctx.doc.text(fitted, x, ctx.y, {
    width,
    align: opts.align ?? "left",
    lineBreak: true,
  });
  syncDocY(ctx, 4);
}

export function drawSectionTitle(ctx: ScorecardPdfContext, title: string): void {
  if (ctx.y + 20 > bottomLimit(ctx)) addPdfPage(ctx);
  safeTextBox(ctx, title, { bold: true, size: 11, color: RW_PRIMARY, maxHeight: 16 });
}

export function drawBodyText(
  ctx: ScorecardPdfContext,
  text: string,
  opts?: { bold?: boolean; size?: number; color?: string },
): void {
  safeTextBox(ctx, text, {
    bold: opts?.bold,
    size: opts?.size,
    color: opts?.color,
    maxHeight: 80,
  });
}

export function teamLabel(
  side: "red_wings" | "opponent",
  opponent: string,
): string {
  return side === "red_wings" ? "Red Wings" : opponent;
}

export function drawDocumentHeader(
  ctx: ScorecardPdfContext,
  data: FullMatchScorecardData,
  logoBuffer: Buffer | null,
  logoSize = 48,
): void {
  const { doc, margin, contentWidth } = ctx;
  if (logoBuffer) {
    doc.image(logoBuffer, margin, ctx.y, { width: logoSize, height: logoSize });
  }
  const textX = logoBuffer ? margin + logoSize + 14 : margin;
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(RW_PRIMARY)
    .text("RED WINGS CRICKET", textX, ctx.y + 4, {
      width: contentWidth - (textX - margin),
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#000000")
    .text("Official Scorecard", textX, ctx.y + 28, {
      width: contentWidth - (textX - margin),
    });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text("PLAY BOLD. STAND UNITED.", textX, ctx.y + 44, {
      width: contentWidth - (textX - margin),
    });
  ctx.y = Math.max(ctx.y + logoSize, ctx.y + 58) + 12;

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#000000")
    .text(
      `Red Wings vs ${data.document.opponent}`,
      margin,
      ctx.y,
      { width: contentWidth },
    );
  ctx.y = doc.y + 2;
  if (data.document.matchNumber) {
    doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(data.document.matchNumber, margin, ctx.y);
    ctx.y = doc.y + 2;
  }
  doc.font("Helvetica").fontSize(9).fillColor("#000000");
  if (data.document.matchDate) {
    doc.text(`Date: ${data.document.matchDate}`, margin, ctx.y);
    ctx.y = doc.y + 2;
  }
  if (data.document.venue) {
    doc.text(`Venue: ${data.document.venue}`, margin, ctx.y);
    ctx.y = doc.y + 2;
  }
  if (data.document.tossSummary) {
    doc.text(data.document.tossSummary, margin, ctx.y, { width: contentWidth });
    ctx.y = doc.y + 2;
  }
  ctx.y += 8;
}

export function drawResultHighlight(
  ctx: ScorecardPdfContext,
  data: FullMatchScorecardData,
): void {
  const opponent = data.document.opponent;
  const scores = data.innings.map((inn) => ({
    team: teamLabel(inn.innings.battingTeam, opponent).toUpperCase(),
    line: `${inn.innings.totalRuns}/${inn.innings.wickets}`,
    overs: inn.innings.overs,
  }));

  const boxPadding = 14;
  const innerWidth = ctx.contentWidth - boxPadding * 2;
  let innerHeight = 36;
  if (scores.length >= 2) innerHeight = 72;
  else if (scores.length === 1) innerHeight = 48;
  if (data.document.resultSummary) innerHeight += 22;

  ensureVerticalSpace(ctx, innerHeight + boxPadding * 2 + 8);

  const boxY = ctx.y;
  ctx.doc
    .roundedRect(ctx.margin, boxY, ctx.contentWidth, innerHeight + boxPadding * 2, 6)
    .lineWidth(1)
    .strokeColor(RW_PRIMARY)
    .fillAndStroke("#fafafa", RW_PRIMARY);

  let ty = boxY + boxPadding;
  const cx = ctx.margin + boxPadding;

  ctx.doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");

  if (scores.length === 0) {
    ctx.doc.text("Result pending", cx, ty, { width: innerWidth, align: "center" });
  } else if (scores.length === 1) {
    ctx.doc.text(scores[0].team, cx, ty, { width: innerWidth, align: "center" });
    ty += 14;
    ctx.doc.fontSize(16).text(scores[0].line, cx, ty, {
      width: innerWidth,
      align: "center",
    });
  } else {
    ctx.doc.text(scores[0].team, cx, ty, { width: innerWidth, align: "center" });
    ty += 14;
    ctx.doc.fontSize(16).text(scores[0].line, cx, ty, {
      width: innerWidth,
      align: "center",
    });
    ty += 22;
    ctx.doc.fontSize(9).fillColor(MUTED).text("vs", cx, ty, {
      width: innerWidth,
      align: "center",
    });
    ty += 14;
    ctx.doc.fontSize(10).fillColor("#000000").text(scores[1].team, cx, ty, {
      width: innerWidth,
      align: "center",
    });
    ty += 14;
    ctx.doc.fontSize(16).text(scores[1].line, cx, ty, {
      width: innerWidth,
      align: "center",
    });
  }

  if (data.document.resultSummary) {
    ty = boxY + innerHeight + boxPadding - 4;
    ctx.doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(RW_PRIMARY)
      .text(data.document.resultSummary, cx, ty, {
        width: innerWidth,
        align: "center",
      });
  }

  ctx.y = boxY + innerHeight + boxPadding * 2 + 12;
}

export function drawManOfTheMatchBlock(
  ctx: ScorecardPdfContext,
  aiAnalysis: MatchAiAnalysisView | undefined,
): void {
  ensureVerticalSpace(ctx, 64);
  const y0 = ctx.y;
  drawRoundedPanel(ctx, y0, 58, "#fff5f5", RW_PRIMARY);
  ctx.doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(RW_PRIMARY)
    .text("AI MAN OF THE MATCH", ctx.margin + 12, y0 + 8);

  if (aiAnalysis?.state === "ready") {
    const mom = aiAnalysis.manOfTheMatch;
    ctx.doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#000000")
      .text(mom.name, ctx.margin + 12, y0 + 22, { width: ctx.contentWidth - 24 });
    const narrative = mom.narrative || mom.reason;
    if (narrative) {
      const nx = ctx.margin + 12;
      const nw = ctx.contentWidth - 24;
      const ny = y0 + 38;
      const nh = 16;
      ctx.doc.font("Helvetica").fontSize(8).fillColor(MUTED);
      const fitted = truncateTextToHeight(ctx.doc, narrative, nw, nh);
      ctx.doc.text(fitted, nx, ny, { width: nw, lineBreak: true });
    }
    ctx.y = y0 + 66;
    return;
  }

  ctx.doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text("Analysis unavailable.", ctx.margin + 12, y0 + 28);
  ctx.y = y0 + 66;
}

function dismissalText(
  isNotOut: boolean,
  dismissal: string | null,
): string {
  if (isNotOut) return "not out";
  return dismissal ?? "out";
}

function battingTableColumns(contentWidth: number): TableColumn[] {
  const w = contentWidth;
  return [
    { header: "Batter", width: w * 0.22 },
    { header: "Dismissal", width: w * 0.34 },
    { header: "R", width: w * 0.07, align: "right" },
    { header: "B", width: w * 0.07, align: "right" },
    { header: "4s", width: w * 0.07, align: "right" },
    { header: "6s", width: w * 0.07, align: "right" },
    { header: "SR", width: w * 0.16, align: "right" },
  ];
}

function bowlingTableColumns(contentWidth: number): TableColumn[] {
  const w = contentWidth;
  return [
    { header: "Bowler", width: w * 0.26 },
    { header: "O", width: w * 0.1, align: "right" },
    { header: "M", width: w * 0.08, align: "right" },
    { header: "R", width: w * 0.1, align: "right" },
    { header: "W", width: w * 0.08, align: "right" },
    { header: "NB", width: w * 0.1, align: "right" },
    { header: "WD", width: w * 0.1, align: "right" },
    { header: "Econ", width: w * 0.18, align: "right" },
  ];
}

export function drawInningsScorecard(
  ctx: ScorecardPdfContext,
  built: ScorecardInningsBuilt,
  opponent: string,
  options?: { newPage?: boolean; chaseContext?: boolean },
): void {
  const doc = built.innings;
  const ordinal =
    doc.inningsNumber === 1
      ? "1st Innings"
      : doc.inningsNumber === 2
        ? "2nd Innings"
        : `${doc.inningsNumber}th Innings`;

  if (options?.newPage) addPdfPage(ctx);

  ensureVerticalSpace(ctx, 48);
  const panelY = ctx.y;
  drawRoundedPanel(ctx, panelY, 36, "#ffffff", RW_PRIMARY);
  ctx.doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(RW_PRIMARY)
    .text(ordinal.toUpperCase(), ctx.margin + 12, panelY + 8);
  ctx.doc
    .fontSize(11)
    .fillColor("#000000")
    .text(
      teamLabel(doc.battingTeam, opponent).toUpperCase(),
      ctx.margin + 12,
      panelY + 20,
    );
  ctx.doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(RW_PRIMARY)
    .text(
      `${doc.totalRuns}/${doc.wickets}`,
      ctx.margin + ctx.contentWidth * 0.55,
      panelY + 10,
      { width: ctx.contentWidth * 0.4, align: "right" },
    );
  ctx.doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text(
      `${doc.overs} overs${doc.target != null ? ` · Target ${doc.target}` : ""}`,
      ctx.margin + ctx.contentWidth * 0.55,
      panelY + 24,
      { width: ctx.contentWidth * 0.4, align: "right" },
    );
  ctx.y = panelY + 44;

  if (options?.chaseContext && doc.target != null) {
    drawBodyText(
      ctx,
      doc.totalRuns >= doc.target
        ? "Chase complete"
        : `Target ${doc.target}`,
      { size: 8, color: MUTED },
    );
  }

  const batRows: string[][] = [];
  for (const b of doc.battingFigures) {
    if (b.didNotBat) {
      batRows.push([b.name, "Did not bat", "", "", "", "", ""]);
      continue;
    }
    batRows.push([
      b.name + (b.isNotOut ? " *" : ""),
      dismissalText(b.isNotOut, b.dismissal),
      String(b.runs),
      String(b.balls),
      String(b.fours),
      String(b.sixes),
      b.balls > 0 ? b.strikeRate.toFixed(2) : "—",
    ]);
  }

  drawSectionTitle(ctx, "Batting");
  drawTable(ctx, battingTableColumns(ctx.contentWidth), batRows, {
    headerRepeat: true,
    minRowHeight: 18,
  });

  drawCompactExtrasAndTotal(ctx, doc);

  if (doc.bowlingFigures.length > 0) {
    drawSectionTitle(ctx, "Bowling");
    const bowlRows = doc.bowlingFigures.map((bw) => [
      bw.name,
      bw.overs,
      String(bw.maidens),
      String(bw.runs),
      String(bw.wickets),
      String(bw.noBalls),
      String(bw.wides),
      bw.economy.toFixed(2),
    ]);
    drawTable(ctx, bowlingTableColumns(ctx.contentWidth), bowlRows, {
      headerRepeat: true,
    });
  }

  if (doc.fallOfWickets.length > 0) {
    const fowLine = doc.fallOfWickets
      .map(
        (f) =>
          `${f.wicketNumber}-${f.score} (${f.batter}, ${f.over})`,
      )
      .join("  ·  ");
    drawBodyText(ctx, `FOW  ${fowLine}`, { size: 7.5, color: MUTED });
  }

  if (doc.partnerships.length > 0) {
    const pLine = doc.partnerships
      .map((p) => `${p.batters[0]} + ${p.batters[1]} — ${p.runs} (${p.balls})`)
      .join("  ·  ");
    drawBodyText(ctx, `Partnerships  ${pLine}`, { size: 7.5, color: MUTED });
  }
}

function drawCompactExtrasAndTotal(
  ctx: ScorecardPdfContext,
  doc: ScorecardInningsDocument,
): void {
  const ex = doc.extrasBreakdown;
  safeTextBox(
    ctx,
    `Extras (Wd ${ex.wides} · Nb ${ex.noBalls} · B ${ex.byes} · Lb ${ex.legByes} · Pen ${ex.penalty}) = ${doc.extras}   ·   Total ${doc.totalRuns}/${doc.wickets} (${doc.overs} ov)`,
    { size: 7.5, color: MUTED, maxHeight: 24 },
  );
}

/** Page 3 (or 2): AI MoM + compact two-column player cards. */
export function drawPerformanceAndMomPage(
  ctx: ScorecardPdfContext,
  aiAnalysis: MatchAiAnalysisView | undefined,
  options?: { newPage?: boolean },
): void {
  if (options?.newPage) addPdfPage(ctx);

  drawManOfTheMatchBlock(ctx, aiAnalysis);

  if (aiAnalysis?.state === "pending" || aiAnalysis?.state === "processing") {
    drawBodyText(ctx, "AI analysis is being prepared.", {
      size: 8,
      color: MUTED,
    });
    return;
  }

  if (
    aiAnalysis?.state === "failed" ||
    aiAnalysis?.state === "unavailable" ||
    aiAnalysis?.state === "unavailable_incomplete" ||
    !aiAnalysis
  ) {
    drawBodyText(ctx, "AI analysis unavailable.", { size: 8, color: MUTED });
    return;
  }

  if (aiAnalysis.state !== "ready") return;

  drawSectionTitle(ctx, "Player Performance");
  const colGap = 10;
  const colW = (ctx.contentWidth - colGap) / 2;
  let col = 0;
  let rowStartY = ctx.y;

  for (const p of aiAnalysis.playerPerformances) {
    const cardH = 72;
    if (col === 0) {
      rowStartY = ctx.y;
      if (rowStartY + cardH > bottomLimit(ctx)) {
        addPdfPage(ctx);
        rowStartY = ctx.y;
      }
    }
    const x = ctx.margin + col * (colW + colGap);
    const y = rowStartY;
    ctx.doc
      .roundedRect(x, y, colW, cardH, 6)
      .lineWidth(0.5)
      .fillAndStroke("#fafafa", BORDER);

    ctx.doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(RW_PRIMARY)
      .text(p.name, x + 8, y + 6, { width: colW - 16, lineBreak: false });
    const statLine: string[] = [];
    if (p.batting) {
      statLine.push(`${p.batting.runs} (${p.batting.balls}) · SR ${p.batting.strikeRate.toFixed(1)}`);
    }
    if (p.bowling) {
      statLine.push(`${p.bowling.overs} ov · ${p.bowling.wickets} w · Econ ${p.bowling.economy.toFixed(1)}`);
    }
    ctx.doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#000000")
      .text(statLine.join(" · "), x + 8, y + 20, { width: colW - 16 });
    if (p.aiSummary) {
      const sw = colW - 16;
      const sh = 36;
      ctx.doc.font("Helvetica-Oblique").fontSize(7).fillColor("#333333");
      const fitted = truncateTextToHeight(ctx.doc, p.aiSummary, sw, sh);
      ctx.doc.text(fitted, x + 8, y + 32, { width: sw, lineBreak: true });
    }

    col += 1;
    if (col >= 2) {
      col = 0;
      ctx.y = rowStartY + cardH + 8;
    }
  }
  if (col === 1) ctx.y = rowStartY + 72 + 8;
}

let lastComposedPdfPageCount = 0;

export function getLastComposedPdfPageCount(): number {
  return lastComposedPdfPageCount;
}

export function finalizePdfDocument(ctx: ScorecardPdfContext): void {
  drawPageFooter(ctx);
  lastComposedPdfPageCount = ctx.pageNumber;
}
