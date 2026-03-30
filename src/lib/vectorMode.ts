/**
 * Pinecone retrieval mode:
 * - `integrated` — Pinecone embeds text (`upsertRecords` / `searchRecords`). Index must use integrated embeddings + `text=content` mapping.
 * - `byov` — Bring-your-own vectors via LangChain `PineconeStore` + Together (or any Embeddings you wire in). Index dimension must match the model.
 */
export type VectorMode = "integrated" | "byov";

const VALID_INTEGRATED = new Set(["integrated", "pinecone", "pinecone_integrated"]);
const VALID_BYOV = new Set(["byov", "byo", "bring_your_own"]);

export function getVectorMode(): VectorMode {
  const raw = process.env.MASHREQ_VECTOR_MODE?.trim().toLowerCase();
  if (!raw || raw === "byov") return "byov";
  if (VALID_INTEGRATED.has(raw)) return "integrated";
  if (VALID_BYOV.has(raw)) return "byov";
  throw new Error(
    `Invalid MASHREQ_VECTOR_MODE="${process.env.MASHREQ_VECTOR_MODE}". Use "integrated" or "byov".`
  );
}

export function isIntegratedVectorMode(): boolean {
  return getVectorMode() === "integrated";
}

/** Top chunks to retrieve for RAG (both modes). */
export const RAG_TOP_K = 8;
