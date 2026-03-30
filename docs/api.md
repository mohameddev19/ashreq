# HTTP API

The web UI calls these **Next.js Route Handlers** (same origin). All bodies are JSON.

Vector behavior is controlled by **`MASHREQ_VECTOR_MODE`** on the server (`integrated` vs `byov` — see [Configuration](./configuration.md)).

## `POST /api/ingest`

Indexes legal text into Pinecone under a namespace.

### Request body

| Field | Type | Constraints |
| ----- | ---- | ----------- |
| `namespaceId` | string | Valid namespace id (see [Configuration](./configuration.md)) |
| `law_name` | string | 1–500 chars |
| `year` | string | 1–32 chars |
| `article_number` | string | 1–200 chars (article label or reference) |
| `text` | string | 50–500,000 chars |
| `category` | string | Optional, ≤200 chars (stored in chunk metadata) |

### Behavior

- Text is cleaned with `refineLegalText()`, then split with LangChain **`RecursiveCharacterTextSplitter`** (`chunkSize` 1000, `chunkOverlap` 200, legal-style Arabic separators).
- **Integrated** (`MASHREQ_VECTOR_MODE=integrated`): records with `content` + metadata are **`upsertRecords`**’d in batches (Pinecone embeds text server-side). Ids: `{batchUuid}:{chunkIndex}`.
- **BYOV** (default when unset): **TogetherAIEmbeddings** + **`PineconeStore.addDocuments`** (same pattern as `laws:ingest-pdf`). Ids: `{batchUuid}:{chunkIndex}`.

### Success response

`200` — JSON:

```json
{
  "ok": true,
  "documentId": "<uuid>",
  "chunkCount": 12
}
```

### Error response

`400` / `500` — JSON:

```json
{ "error": "message" }
```

---

## `POST /api/chat`

Runs retrieval-augmented generation for the workspace namespace.

### Request body

| Field | Type | Constraints |
| ----- | ---- | ----------- |
| `namespaceId` | string | Valid namespace id |
| `messages` | array | 1–30 items; each `{ "role": "user" \| "assistant", "content": string }` (content max 8000 chars) |

### Behavior

- Uses the **last** `user` message as the search query.
- **Integrated:** **`searchRecords`** (top **8**) → `hitsToContextBlock()` in `src/lib/rag.ts`.
- **BYOV:** LangChain **`PineconeStore.similaritySearch`** (top **8**) after Together embeds the query → `documentsToContextBlock()`.
- Calls Groq **non-streaming** chat completions.

### Success response

`200` — JSON:

```json
{ "reply": "..." }
```

### Error response

`400` / `500` — JSON:

```json
{ "error": "message" }
```

---

## Runtime

Both routes use `export const runtime = "nodejs"` because the Pinecone and Groq SDKs expect the Node.js runtime.
