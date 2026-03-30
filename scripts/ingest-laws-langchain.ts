/**
 * Ingest laws/*.pdf — respects MASHREQ_VECTOR_MODE:
 * - integrated: PDFLoader → splitter → upsertRecords
 * - byov: PDFLoader → splitter → Together → PineconeStore
 *
 * Usage:
 *   npx tsx scripts/ingest-laws-langchain.ts <namespaceId> [pdfDir]
 */
import { config } from "dotenv";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { Document } from "@langchain/core/documents";
import { extractPdfPages } from "../src/lib/extractPdfText";
import { assertValidNamespaceId } from "../src/lib/namespace";
import { getLegalRecursiveSplitter } from "../src/lib/langchain/legalTextSplitter";
import { getMashreqVectorStore } from "../src/lib/langchain/mashreqVectorStore";
import { getLegalIndex } from "../src/lib/pinecone";
import { isIntegratedVectorMode } from "../src/lib/vectorMode";
import { printPineconeIngestHint } from "./pineconeIngestHints";

config();

const BATCH = 96;

function guessYear(text: string, filename: string): string {
  const fromText = text.match(/\b(19|20)\d{2}\b/);
  if (fromText) return fromText[0];
  const fromName = filename.match(/(19|20)\d{2}/);
  return fromName ? fromName[0] : "—";
}

function lawNameFromPath(filePath: string): string {
  const stem = path.basename(filePath, path.extname(filePath));
  return stem.replace(/[_-]+/g, " ").trim() || stem;
}

async function main() {
  const namespaceId = process.argv[2];
  const pdfDir = path.resolve(process.argv[3] ?? "laws");

  if (!namespaceId) {
    console.error(
      "Usage: npx tsx scripts/ingest-laws-langchain.ts <namespaceId> [pdfDir]"
    );
    process.exit(1);
  }

  const ns = assertValidNamespaceId(namespaceId);

  if (!fs.existsSync(pdfDir)) {
    console.error(`Directory not found: ${pdfDir}`);
    process.exit(1);
  }

  const pdfs = fs
    .readdirSync(pdfDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".pdf"))
    .map((e) => path.join(pdfDir, e.name));

  if (!pdfs.length) {
    console.error(`No PDFs in ${pdfDir}`);
    process.exit(1);
  }

  const integrated = isIntegratedVectorMode();
  const splitter = getLegalRecursiveSplitter();
  const store = integrated ? null : await getMashreqVectorStore(ns);
  const pineconeNs = integrated ? getLegalIndex().namespace(ns) : null;
  const defaultCategory =
    process.env.MASHREQ_DEFAULT_LAW_CATEGORY?.trim() || "قانون سوداني";

  for (const pdfPath of pdfs.sort()) {
    const lawName = lawNameFromPath(pdfPath);
    const buf = fs.readFileSync(pdfPath);
    const { pageTexts, numPages, usedLayoutFallback } =
      await extractPdfPages(buf);
    if (!pageTexts.length) {
      console.warn(`Skip (no pages): ${pdfPath}`);
      continue;
    }

    const rawDocs = pageTexts.map(
      (pageContent, i) =>
        new Document({
          pageContent,
          metadata: {
            source: pdfPath,
            pdf: { page: i + 1, totalPages: numPages },
            source_pdf: path.basename(pdfPath),
            ...(usedLayoutFallback ? { pdf_extract: "layout" } : {}),
          },
        })
    );

    const mergedText = rawDocs.map((d) => d.pageContent).join("\n\n");
    const year = guessYear(mergedText, path.basename(pdfPath));

    const splitDocs = await splitter.splitDocuments(rawDocs);
    if (!splitDocs.length) {
      console.warn(`Skip (no chunks): ${pdfPath}`);
      continue;
    }

    const enhanced = splitDocs.map(
      (d, i) =>
        new Document({
          pageContent: d.pageContent,
          metadata: {
            ...d.metadata,
            law_name: lawName,
            year,
            article_number: `جزء-${i + 1}/${splitDocs.length}`,
            category: defaultCategory,
          },
        })
    );

    const batchId = randomUUID();

    if (integrated && pineconeNs) {
      const records = enhanced.map((d, i) => ({
        _id: `${batchId}:${i}`,
        content: d.pageContent,
        law_name: lawName,
        year,
        article_number: `جزء-${i + 1}/${splitDocs.length}`,
        category: defaultCategory,
      }));
      for (let j = 0; j < records.length; j += BATCH) {
        await pineconeNs.upsertRecords({
          records: records.slice(j, j + BATCH),
        });
      }
    } else if (store) {
      const ids = enhanced.map((_, i) => `${batchId}:${i}`);
      await store.addDocuments(enhanced, { ids });
    }

    console.log(
      `Indexed ${enhanced.length} chunks — ${lawName} (${path.basename(pdfPath)})`
    );
  }

  console.log(
    `\nDone. Namespace: ${ns} (mode: ${integrated ? "integrated" : "byov"})`
  );
}

main().catch((e) => {
  printPineconeIngestHint(e);
  console.error(e);
  process.exitCode = 1;
});
