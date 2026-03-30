/** Shared terminal hints when bulk ingest hits common Pinecone mode mismatches. */
export function printPineconeIngestHint(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Integrated inference is not configured")) {
    console.error(`
[!] Vector mode mismatch

    Mashreq is using INTEGRATED mode (MASHREQ_VECTOR_MODE=integrated), which calls
    upsertRecords / searchRecords. Your index is a normal BYO-vector index
    (e.g. 768 dimensions + cosine) — it does not have integrated inference.

    Fix A — usual setup (Together + plain index):
      In .env:  MASHREQ_VECTOR_MODE=byov   (or remove the line; byov is default)
                TOGETHER_AI_API_KEY=...
      Index: serverless, cosine, dimension 768 (default Together model).

    Fix B — integrated only:
      Create a Pinecone index with integrated embedding + text field mapped to content,
      then MASHREQ_VECTOR_MODE=integrated and PINECONE_INDEX=<that index name>.
`);
  }
}
