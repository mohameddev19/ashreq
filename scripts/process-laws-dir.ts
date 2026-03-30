import "dotenv/config";

/**
 * Extract text from every PDF in ./laws (or a given folder) into ./laws/processed/<slug>/
 *
 * Usage:
 *   npx tsx scripts/process-laws-dir.ts
 *   npx tsx scripts/process-laws-dir.ts path/to/pdfs path/to/output
 */
import fs from "fs";
import path from "path";
import { extractPdfPlainText } from "../src/lib/extractPdfText";

function slugify(name: string): string {
  const base = path.basename(name, path.extname(name)).trim();
  if (!base) return `law_${Date.now()}`;
  return base
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

function guessYear(text: string): string {
  const m = text.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : "—";
}

function guessLawNameFromFilename(filePath: string): string {
  const stem = path.basename(filePath, path.extname(filePath));
  return stem.replace(/[_-]+/g, " ").trim() || stem;
}

async function extractPdf(filePath: string): Promise<{ text: string; pages: number }> {
  const buf = fs.readFileSync(filePath);
  const r = await extractPdfPlainText(buf);
  return { text: r.text, pages: r.pages };
}

async function main() {
  const inputDir = path.resolve(process.argv[2] ?? "laws");
  const outputRoot = path.resolve(process.argv[3] ?? path.join("laws", "processed"));

  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory does not exist: ${inputDir}`);
    console.error("Create it and add .pdf files, e.g. laws/my-act.pdf");
    process.exit(1);
  }

  const entries = fs.readdirSync(inputDir, { withFileTypes: true });
  const pdfs = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".pdf"))
    .map((e) => path.join(inputDir, e.name));

  if (!pdfs.length) {
    console.error(`No PDF files found in ${inputDir}`);
    process.exit(1);
  }

  fs.mkdirSync(outputRoot, { recursive: true });

  const summary: string[] = [];

  for (const pdfPath of pdfs.sort()) {
    const slug = slugify(pdfPath);
    const outDir = path.join(outputRoot, slug);
    fs.mkdirSync(outDir, { recursive: true });

    let text: string;
    let pages: number;
    try {
      const r = await extractPdf(pdfPath);
      text = r.text;
      pages = r.pages;
    } catch (e) {
      console.error(`Failed: ${pdfPath}`, e);
      summary.push(`${slug}: ERROR`);
      continue;
    }

    if (!text.length) {
      console.warn(`Empty extract (maybe scanned PDF): ${pdfPath}`);
      summary.push(`${slug}: empty (needs OCR?)`);
      continue;
    }

    const lawName = guessLawNameFromFilename(pdfPath);
    const year = guessYear(text);

    const fullPath = path.join(outDir, "full.txt");
    fs.writeFileSync(fullPath, text, "utf8");

    const meta = {
      sourcePdf: path.relative(process.cwd(), pdfPath),
      lawName,
      year,
      pages,
      extractedChars: text.length,
      outputDir: path.relative(process.cwd(), outDir),
    };
    fs.writeFileSync(
      path.join(outDir, "meta.json"),
      JSON.stringify(meta, null, 2),
      "utf8"
    );

    console.log(`OK ${slug} — ${text.length} chars, ${pages} pages → ${outDir}`);
    summary.push(`${slug}: ${text.length} chars`);
  }

  fs.writeFileSync(
    path.join(outputRoot, "_summary.txt"),
    summary.join("\n") + "\n",
    "utf8"
  );
  console.log(`\nDone. Processed output under ${outputRoot}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
