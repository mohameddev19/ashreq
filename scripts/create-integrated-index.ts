/**
 * Create a Pinecone serverless index with integrated embeddings (llama-text-embed-v2).
 * Matches Mashreq integrated mode: records use a `content` text field (see fieldMap).
 *
 * Usage:
 *   npx tsx scripts/create-integrated-index.ts [indexName] [cloud] [region]
 *
 * Defaults: indexName from PINECONE_INDEX or "mashreq-legal", cloud aws, region us-east-1
 *
 * Requires PINECONE_API_KEY in .env. Then set MASHREQ_VECTOR_MODE=integrated.
 */
import { config } from "dotenv";
import { Pinecone } from "@pinecone-database/pinecone";

config();

async function main() {
  const apiKey = process.env.PINECONE_API_KEY?.trim();
  if (!apiKey) {
    console.error("Set PINECONE_API_KEY in .env");
    process.exit(1);
  }

  const name =
    process.argv[2]?.trim() ||
    process.env.PINECONE_INDEX?.trim() ||
    "mashreq-legal";
  const cloud = process.argv[3]?.trim() || "aws";
  const region = process.argv[4]?.trim() || "us-east-1";

  const pc = new Pinecone({ apiKey });

  console.error(
    `Creating integrated index "${name}" (${cloud}/${region}, model llama-text-embed-v2, field text→content)…`
  );

  const indexModel = await pc.createIndexForModel({
    name,
    cloud,
    region,
    embed: {
      model: "llama-text-embed-v2",
      metric: "cosine",
      fieldMap: { text: "content" },
    },
    waitUntilReady: true,
    suppressConflicts: true,
  });

  if (indexModel) {
    console.error("Index model:", JSON.stringify(indexModel, null, 2));
  } else {
    console.error("(Index may already exist; suppressConflicts was set.)");
  }

  console.error("\nNext:");
  console.error(`  MASHREQ_VECTOR_MODE=integrated`);
  console.error(`  PINECONE_INDEX=${name}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
