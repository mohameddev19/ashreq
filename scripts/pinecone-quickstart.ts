/**
 * Demo for Pinecone *integrated embedding* indexes only (`upsertRecords` + `searchRecords`).
 * Mashreq app chat/ingest use LangChain + Together AI + BYO-vector Pinecone instead.
 */
import { config } from "dotenv";
import { Pinecone } from "@pinecone-database/pinecone";
import { sampleRecords } from "./sampleRecords.js";

config();

const NAMESPACE = "example-namespace";
const WAIT_MS = 10_000;

async function main() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error("Set PINECONE_API_KEY in .env (see .env.example)");
  }

  const indexName =
    process.env.PINECONE_INDEX ?? "agentic-quickstart-test";

  const pc = new Pinecone({ apiKey });
  const index = pc.index(indexName);

  const records = sampleRecords.map((r) => ({ ...r }));

  await index.namespace(NAMESPACE).upsertRecords({ records });
  console.log(`Upserted ${records.length} records into namespace "${NAMESPACE}"`);

  await new Promise((r) => setTimeout(r, WAIT_MS));

  const stats = await index.describeIndexStats();
  console.log("Index stats:", JSON.stringify(stats, null, 2));

  const query = "Famous historical structures and monuments";

  const rerankedResults = await index.namespace(NAMESPACE).searchRecords({
    query: {
      topK: 10,
      inputs: { text: query },
    },
    rerank: {
      model: "bge-reranker-v2-m3",
      topN: 10,
      rankFields: ["content"],
    },
  });

  console.log(`\nQuery: "${query}"\n`);
  for (const hit of rerankedResults.result.hits) {
    const fields = hit.fields as Record<string, unknown>;
    const category = String(fields?.category ?? "unknown");
    const content = String(fields?.content ?? "");
    console.log(
      `id: ${hit._id.padEnd(6)} | score: ${hit._score.toFixed(4)} | category: ${category.padEnd(12)} | ${content.slice(0, 60)}…`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
