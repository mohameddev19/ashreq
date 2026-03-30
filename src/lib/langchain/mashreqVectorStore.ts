import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { getTogetherEmbeddings } from "./togetherEmbeddings";

/** Pinecone text field key used in vector records (LangChain default). */
const TEXT_KEY = "text";

function pineconeIndexFromEnv() {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;
  if (!apiKey || !indexName) {
    throw new Error("PINECONE_API_KEY and PINECONE_INDEX must be set");
  }
  const pc = new Pinecone({ apiKey });
  return pc.index(indexName);
}

export async function getMashreqVectorStore(
  namespace: string
): Promise<PineconeStore> {
  const pineconeIndex = pineconeIndexFromEnv();
  const embeddings = getTogetherEmbeddings();

  return PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    namespace,
    textKey: TEXT_KEY,
  });
}
