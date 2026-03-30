import "dotenv/config";

/**
 * Extract plain text from a PDF for pasting into Mashreq ingest (or further cleanup).
 * Arabic PDFs: quality depends on how the file was produced (embedded text vs scanned images).
 * Scanned PDFs need OCR first (outside this script).
 *
 * Usage:
 *   npx tsx scripts/extract-pdf.ts path/to/file.pdf
 *   npx tsx scripts/extract-pdf.ts path/to/file.pdf output.txt
 */
import fs from "fs";
import path from "path";
import { extractPdfPlainText } from "../src/lib/extractPdfText";

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error(
      "Usage: npx tsx scripts/extract-pdf.ts <file.pdf> [output.txt]"
    );
    process.exit(1);
  }

  const abs = path.resolve(input);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }

  const dataBuffer = fs.readFileSync(abs);
  const { text, pages, usedLayoutFallback } =
    await extractPdfPlainText(dataBuffer);

  const outPath = process.argv[3];
  if (outPath) {
    fs.writeFileSync(path.resolve(outPath), text, "utf8");
    console.error(
      `Wrote ${path.resolve(outPath)} (${text.length} characters, ${pages} pages${usedLayoutFallback ? ", layout-aware extract" : ""})`
    );
  } else {
    process.stdout.write(text);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
