/**
 * Bulk workflow: extract all PDFs in a folder → laws/processed → Pinecone ingest.
 *
 * Do this in order:
 *   1) Create a Pinecone index (matches MASHREQ_VECTOR_MODE) — see docs/configuration.md
 *   2) Set PINECONE_INDEX + API keys in .env
 *   3) Choose workspace id = namespace: run `npm run dev`, copy the id shown on the page
 *      (Pinecone creates the namespace on first upsert — nothing to click in Pinecone UI)
 *   4) Put PDFs in laws/, then run this script with that id
 *
 * Usage:
 *   npx tsx scripts/laws-pipeline.ts <namespaceId> [pdfDir] [processedRoot]
 *   npm run laws:pipeline -- <namespaceId>
 *
 * Defaults: pdfDir = laws, processedRoot = laws/processed
 */
import "dotenv/config";
import { spawnSync } from "child_process";
import path from "path";
import { assertValidNamespaceId } from "../src/lib/namespace";
import { isIntegratedVectorMode } from "../src/lib/vectorMode";

const namespaceId = process.argv[2];
const pdfDir = path.resolve(process.argv[3] ?? "laws");
const processedRoot = path.resolve(process.argv[4] ?? path.join("laws", "processed"));

if (!namespaceId) {
  console.error(
    "Usage: npx tsx scripts/laws-pipeline.ts <namespaceId> [pdfDir] [processedRoot]"
  );
  console.error("");
  console.error("Before running:");
  console.error("  1) Create Pinecone index → set PINECONE_INDEX in .env (see docs/getting-started.md §3)");
  console.error("  2) Open the app, copy workspace id (namespace) from the page");
  console.error("  3) Add PDFs to laws/, then:");
  console.error("");
  console.error("  npm run laws:pipeline -- <workspace-id-from-app>");
  console.error("");
  console.error("This script: extract PDFs → processed text → upsert into that namespace.");
  process.exit(1);
}

try {
  assertValidNamespaceId(namespaceId);
} catch {
  console.error(
    `Invalid namespace id "${namespaceId}". Copy the workspace id from the app (1–80 chars: a-z A-Z 0-9 _ -).`
  );
  process.exit(1);
}

function assertPipelineEnv(): void {
  const missing: string[] = [];
  if (!process.env.PINECONE_API_KEY?.trim()) missing.push("PINECONE_API_KEY");
  if (!process.env.PINECONE_INDEX?.trim()) missing.push("PINECONE_INDEX");

  let integrated = false;
  try {
    integrated = isIntegratedVectorMode();
  } catch (e) {
    console.error(
      e instanceof Error ? e.message : "Invalid MASHREQ_VECTOR_MODE in .env"
    );
    process.exit(1);
  }

  if (
    !integrated &&
    !process.env.TOGETHER_AI_API_KEY?.trim() &&
    !process.env.TOGETHER_API_KEY?.trim()
  ) {
    missing.push("TOGETHER_AI_API_KEY (required for BYOV ingest)");
  }

  if (missing.length) {
    console.error("Missing .env variables for ingest:");
    missing.forEach((m) => console.error(`  - ${m}`));
    console.error("");
    console.error("Create the Pinecone index first, then set PINECONE_INDEX and keys (see .env.example).");
    process.exit(1);
  }
}

assertPipelineEnv();

console.error(
  `Pinecone index: ${process.env.PINECONE_INDEX} → namespace: ${namespaceId}`
);

const runner = process.platform === "win32" ? "npx.cmd" : "npx";

function run(label: string, args: string[]) {
  console.error(`\n— ${label} —`);
  const r = spawnSync(runner, args, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0 && r.status !== null) {
    process.exit(r.status);
  }
}

run("Extract PDFs → processed text", [
  "tsx",
  "scripts/process-laws-dir.ts",
  pdfDir,
  processedRoot,
]);

run("Ingest processed → Pinecone", [
  "tsx",
  "scripts/ingest-processed-laws.ts",
  namespaceId,
  processedRoot,
]);

console.error(
  "\nDone. In the app, use the same workspace id and ask questions (Groq key needed for chat)."
);
