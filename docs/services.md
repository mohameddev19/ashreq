# Services and technologies explained

This page describes **what each external product is**, **what Mashreq uses it for**, and **how it differs** from similar tools. You do not need deep expertise in any one of them to run the app; use this as a map.

---

## Groq

**What it is:** [Groq](https://groq.com/) is a company that runs **very fast inference** (running already-trained AI models to produce text) on their own hardware (they market “LPU” inference). They expose a **cloud API** similar in spirit to OpenAI’s Chat API: you send messages, you get a generated reply.

**What Mashreq uses it for:** After Pinecone returns relevant chunks of legal text, Groq runs a **large language model (LLM)** that reads those chunks and writes an **Arabic answer** constrained by a system prompt (no inventing laws outside the context).

**What it is not:**

- It is **not** where your documents are stored; that is Pinecone.
- It is **not** Google **Gemini**. Gemini is Google’s family of models, typically used via Google AI / Vertex. Groq hosts **other** models (for example Llama variants). Your `GROQ_MODEL` must be a model **Groq actually serves**—check the [Groq console](https://console.groq.com/) and their docs for current names.

**Typical cost / speed:** Groq is often chosen for **low latency** and **generous free tiers** for development; always confirm current pricing and limits on their site.

**In this repo:** The server calls Groq through the official **`groq-sdk`** npm package using `GROQ_API_KEY` and optional `GROQ_MODEL`.

---

## Together AI

**What it is:** [Together AI](https://www.together.ai/) hosts open and third-party models behind an API.

**What Mashreq uses it for:** **BYOV mode only** (`MASHREQ_VECTOR_MODE=byov`): LangChain **`TogetherAIEmbeddings`** turns Arabic legal text and user questions into vectors for **ingest** and **query**. Configure `TOGETHER_AI_API_KEY` and optionally `TOGETHER_EMBEDDING_MODEL` (default `togethercomputer/m2-bert-80M-8k-retrieval`).

**Integrated mode:** Together is **not** used; Pinecone computes embeddings from record text.

**What it is not:** It is **not** the chat model; **Groq** still generates the final Arabic answer.

---

## Pinecone

**What it is:** [Pinecone](https://www.pinecone.io/) is a **vector database**—a specialized database for **semantic search**. Text is turned into **vectors** (lists of numbers) so that “similar meaning” is “close in vector space.” Retrieval returns the **most similar stored chunks** (BYOV: query vector you send; integrated: text query handled by Pinecone).

**What Mashreq uses it for:**

- **BYOV:** **Storing** vectors from **Together** + **metadata** via LangChain **`PineconeStore`**; **searching** with **`similaritySearch`** after embedding the query.
- **Integrated:** **Upserting** records with a **`content`** text field and metadata; **searching** with **`searchRecords`** (Pinecone embeds query text).
- **Namespaces** for workspace isolation in both modes.

See [Configuration](./configuration.md) for **`MASHREQ_VECTOR_MODE`** and index setup (BYOV dimension vs integrated `field_map`).

**What it is not:** Pinecone does not replace an LLM; it **retrieves** chunks. Groq **generates** the final answer.

**In this repo:** `@langchain/pinecone`, `@pinecone-database/pinecone`, `PINECONE_API_KEY`, `PINECONE_INDEX`.

### Does Pinecone extract PDFs and chunk text for you?

**Mostly no — not in the way Mashreq uses Pinecone.**

| Step | Who does it in this project | Does Pinecone do it automatically? |
| ---- | ----------------------------- | -------------------------------- |
| Open a `.pdf` and pull out text | You (or `extract-pdf`, or another tool) | **No.** Pinecone’s vector index accepts **records you send** (e.g. JSON with a `content` string). It does not parse PDF files by itself in this app. |
| Split long law text into smaller **chunks** | LangChain **`RecursiveCharacterTextSplitter`** (legal separators + overlap) | **No.** You choose policy in code; Pinecone stores the resulting vectors. |
| Turn text into vectors | **BYOV:** **Together** (LangChain). **Integrated:** **Pinecone** at upsert/query. | Depends on mode. |
| Store + similarity search | **Pinecone** | **Yes** — vector index + metadata (API differs by mode). |

So: **Pinecone** holds the index; **BYOV** adds **Together** + LangChain **`PineconeStore`**; **integrated** uses **`upsertRecords` / `searchRecords`**. Chunking stays in the app (LangChain splitter).

**Why chunk at all?** One giant blob per law is usually worse for retrieval: the embedding averages too much, and the model gets noisy context. Smaller, coherent chunks (articles / paragraphs) match questions more precisely and stay within API size limits.

**Other Pinecone offerings** (e.g. higher-level assistants or managed ingestion pipelines) may combine more steps in one product. This open-source stack uses the **data plane API** (`upsertRecords` / `searchRecords`) and keeps **PDF → text → chunk** in your app so you control metadata (law name, article, year) and Arabic text quality.

---

## Next.js

**What it is:** [Next.js](https://nextjs.org/) is a **React framework** for building web apps. It provides routing, server-side API routes, and a smooth path to deployment.

**What Mashreq uses it for:**

- The **Arabic RTL UI** (chat + ingest form).
- **Backend endpoints** under `/api/chat` and `/api/ingest` (see [API](./api.md)).

**In this repo:** Next.js 15 with the **App Router** (`src/app/`).

---

## Vercel (optional hosting)

**What it is:** [Vercel](https://vercel.com/) is a **hosting platform** often used with Next.js. It builds your app and runs serverless functions for API routes.

**What Mashreq uses it for:** Nothing in the code is Vercel-specific; deployment there is **optional** but documented in [Deployment](./deployment.md).

---

## Node.js

**What it is:** [Node.js](https://nodejs.org/) is the **JavaScript runtime** that executes Next.js and the Pinecone/Groq SDKs on the server.

**What Mashreq expects:** **Node 20+** (see `package.json` `engines`).

---

## How the pieces fit together (one sentence each)

| Step | Service | Role |
| ---- | ------- | ---- |
| 1 | **Next.js** | Serves the page and receives the user’s question and ingest uploads. |
| 2 | **Pinecone (+ Together in BYOV)** | Retrieves the closest legal chunks (`similaritySearch` or `searchRecords`). |
| 3 | **Groq** | Reads those chunks and writes a grounded answer in Arabic. |

---

## Glossary

| Term | Meaning |
| ---- | ------- |
| **LLM** | Large language model; predicts the next tokens to form a reply. |
| **Embedding** | Turning text into a vector of numbers for similarity search. |
| **Vector database** | Database optimized to search by vector similarity (Pinecone). |
| **RAG** | Retrieval-augmented generation: **retrieve** chunks, then **generate** an answer using them. |
| **Namespace** | A partition inside one Pinecone index so one tenant’s vectors stay separate from another’s. |
| **Serverless index** | Pinecone index type that scales without you managing servers; Mashreq’s docs assume this model. |

---

## Further reading

- [Overview](./overview.md) — architecture diagram and data flow  
- [Getting started](./getting-started.md) — keys and first run  
- [Configuration](./configuration.md) — env vars and index setup  
