/**
 * Ingest each laws/processed/<slug>/full.txt (respects MASHREQ_VECTOR_MODE):
 * - integrated: upsertRecords (Pinecone embeds `content`)
 * - byov: PineconeStore + Together embeddings
 *
 * Usage:
 *   npx tsx scripts/ingest-processed-laws.ts <namespaceId> [processedRoot]
 */
import { config } from "dotenv";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { Document } from "@langchain/core/documents";
import { refineLegalText } from "../src/lib/refineLegalText";
import { assertValidNamespaceId } from "../src/lib/namespace";
import { getLegalRecursiveSplitter } from "../src/lib/langchain/legalTextSplitter";
import { getMashreqVectorStore } from "../src/lib/langchain/mashreqVectorStore";
import { getLegalIndex } from "../src/lib/pinecone";
import { isIntegratedVectorMode } from "../src/lib/vectorMode";
import { printPineconeIngestHint } from "./pineconeIngestHints";

config();

const BATCH = 96;

type Meta = {
  sourcePdf?: string;
  lawName?: string;
  year?: string;
};

async function main() {
  const namespaceId = process.argv[2];
  const processedRoot = path.resolve(process.argv[3] ?? path.join("laws", "processed"));

  if (!namespaceId) {
    console.error(
      "Usage: npx tsx scripts/ingest-processed-laws.ts <namespaceId> [processedRoot]"
    );
    process.exit(1);
  }

  const ns = assertValidNamespaceId(namespaceId);

  if (!fs.existsSync(processedRoot)) {
    console.error(`Missing processed folder: ${processedRoot}`);
    process.exit(1);
  }

  const integrated = isIntegratedVectorMode();
  const splitter = getLegalRecursiveSplitter();
  const store = integrated ? null : await getMashreqVectorStore(ns);
  const defaultCategory =
    process.env.MASHREQ_DEFAULT_LAW_CATEGORY?.trim() || "قانون سوداني";

  const dirs = fs
    .readdirSync(processedRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => path.join(processedRoot, d.name));

  const ready = dirs.filter((d) => fs.existsSync(path.join(d, "full.txt")));

  if (!ready.length) {
    console.error(`No full.txt found under ${processedRoot}`);
    process.exit(1);
  }

  const pineconeNs = integrated ? getLegalIndex().namespace(ns) : null;

  for (const dir of ready.sort()) {
    const fullPath = path.join(dir, "full.txt");
    const metaPath = path.join(dir, "meta.json");
    const raw = fs.readFileSync(fullPath, "utf8");
    const text = refineLegalText(raw);
    if (!text.length) continue;

    let meta: Meta = {};
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as Meta;
      } catch {
        /* ignore */
      }
    }

    const lawName =
      meta.lawName ?? path.basename(dir).replace(/_/g, " ").trim();
    const year = meta.year ?? "—";

    const base = new Document({
      pageContent: text,
      metadata: {
        law_name: lawName,
        year,
        article_number: "نص كامل",
        category: defaultCategory,
        source: meta.sourcePdf ?? path.basename(dir),
      },
    });

    const splitDocs = await splitter.splitDocuments([base]);
    if (!splitDocs.length) continue;

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

    console.log(`Upserted ${enhanced.length} chunks — ${lawName}`);
  }

  console.log(
    `\nFinished. Namespace: ${ns} (mode: ${integrated ? "integrated" : "byov"})`
  );
}

main().catch((e) => {
  printPineconeIngestHint(e);
  console.error(e);
  process.exitCode = 1;
});
