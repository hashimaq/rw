import "server-only";

import { readFile } from "fs/promises";
import { join } from "path";
import { SCORECARD_PDF_LOGO_SRC } from "@/lib/scorecard/scorecard-pdf-layout";

/** Skip embedding multi-MB JPEGs — pdfkit can paginate badly; header text still renders. */
const MAX_PDF_LOGO_EMBED_BYTES = 250_000;

/** Load logo for PDF; skips embed if unreadable or oversized (header still renders). */
export async function loadPdfLogoBuffer(): Promise<Buffer | null> {
  try {
    const logoPath = join(
      process.cwd(),
      "public",
      SCORECARD_PDF_LOGO_SRC.replace(/^\//, ""),
    );
    const buf = await readFile(logoPath);
    if (buf.length === 0 || buf.length > MAX_PDF_LOGO_EMBED_BYTES) {
      return null;
    }
    return buf;
  } catch {
    return null;
  }
}
