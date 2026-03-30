import { TogetherAIEmbeddings } from "@langchain/community/embeddings/togetherai";

/**
 * Together AI embeddings (used by LangChain PineconeStore).
 * Default model: togethercomputer/m2-bert-80M-8k-retrieval (768-dim).
 * Set TOGETHER_AI_API_KEY. Optional: TOGETHER_EMBEDDING_MODEL
 */
export function getTogetherEmbeddings(): TogetherAIEmbeddings {
  const apiKey =
    process.env.TOGETHER_AI_API_KEY ?? process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Set TOGETHER_AI_API_KEY (or TOGETHER_API_KEY) for LangChain embeddings"
    );
  }
  const model =
    process.env.TOGETHER_EMBEDDING_MODEL?.trim() ||
    "togethercomputer/m2-bert-80M-8k-retrieval";

  return new TogetherAIEmbeddings({
    apiKey,
    model,
  });
}
