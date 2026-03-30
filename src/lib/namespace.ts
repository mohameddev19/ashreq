const NS_RE = /^[a-zA-Z0-9_-]{1,80}$/;

export function assertValidNamespaceId(id: unknown): string {
  if (typeof id !== "string" || !NS_RE.test(id)) {
    throw new Error("Invalid namespace id");
  }
  return id;
}

/**
 * Pinecone namespace used for RAG (chat retrieval + ingest upserts).
 * When `MASHREQ_RAG_NAMESPACE` is set, **all** users share that namespace — one
 * bulk ingest covers every account. Otherwise the client-supplied id is used
 * (e.g. per-browser workspace or user id).
 */
export function getRagNamespace(clientNamespaceId: string): string {
  const fromEnv = process.env.MASHREQ_RAG_NAMESPACE?.trim();
  if (fromEnv) {
    return assertValidNamespaceId(fromEnv);
  }
  return assertValidNamespaceId(clientNamespaceId);
}
