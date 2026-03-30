# Configuration

## Vector mode: `MASHREQ_VECTOR_MODE`

Controls how text is embedded and searched in Pinecone. Set **one** of:

| Value | Aliases | Meaning |
| ----- | ------- | ------- |
| `byov` | `byo`, `bring_your_own` | __Bring-your-own vectors:__ LangChain `PineconeStore` + __Together AI__ embeddings. You need a Pinecone serverless index whose __dimension__ matches `TOGETHER_EMBEDDING_MODEL` (default model ≈ __768__). __Default__ if the variable is unset or empty. |
| `integrated` | `pinecone`, `pinecone_integrated` | __Pinecone integrated inference:__ `upsertRecords` / `searchRecords` with a __`content`__ text field (`fieldMap` `text` → `content`). Create the index via __`npm run pinecone:create-integrated-index`__ or the Pinecone CLI (see [Getting started §3B](./getting-started.md#b-pinecone-integrated-embeddings)). __No Together key__ for ingest/chat. |

**Aliases** are matched case-insensitively after trim.

Invalid values cause API routes to return an error at runtime (thrown from `getVectorMode()` in `src/lib/vectorMode.ts`).

---

## Environment variables

Defined in `.env` (local) or your host’s environment (production). See `.env.example` in the repo root.

| Variable | When required | Description |
| -------- | ------------- | ----------- |
| `MASHREQ_VECTOR_MODE` | Optional | `integrated` or `byov` (default __`byov`__). |
| `PINECONE_API_KEY` | Always | Pinecone API key |
| `PINECONE_INDEX` | Always | Index name; type must match the mode (BYOV dim vs integrated config). |
| `TOGETHER_AI_API_KEY` | __BYOV only__ | Together key (`TOGETHER_API_KEY` also accepted). |
| `TOGETHER_EMBEDDING_MODEL` | BYOV optional | Default `togethercomputer/m2-bert-80M-8k-retrieval`. |
| `GROQ_API_KEY` | Always | Groq chat API |
| `GROQ_MODEL` | Optional | Default `llama-3.1-8b-instant` |
| `MASHREQ_DEFAULT_LAW_CATEGORY` | Optional | Bulk ingest scripts metadata |

Next.js loads `.env` for server-side code. Restart `npm run dev` after changes.

---

## Pinecone index by mode

### BYOV (`MASHREQ_VECTOR_MODE=byov`)

- Serverless index, **cosine**, dimension = embedding model output (default **768**).
- No Pinecone integrated embedding wizard required.

### Integrated (`MASHREQ_VECTOR_MODE=integrated`)

- Index with **integrated embeddings** and `text` mapped to **`content`** (see Pinecone CLI / console).
- Chunk records use `content`, `law_name`, `year`, `article_number`, optional `category`.

---

## Who has to do the Pinecone / pipeline steps?

| Role | What they do |
| ---- | ------------ |
| __Operator__ (person who deploys or runs the repo: you, a dev, or an org IT team) | Creates the Pinecone __index__, puts API keys in `.env` (or the host’s env), runs bulk scripts like `laws:pipeline` from a machine that has the PDFs and Node installed, and keeps Groq/Pinecone billing working. |
| __End user__ (someone who only opens the Mashreq __website__) | Does __not__ create a Pinecone index, does __not__ edit `.env`, and does __not__ run `npm` commands. They open the app in the browser; the page gives them a __workspace id__ automatically. They can chat and (if you leave ingest enabled) paste law text in the form—everything talks to __your__ already-configured backend. |

So: the **index → env → workspace id → pipeline** sequence is for **people running or maintaining the app**, not for casual visitors. If Mashreq is deployed on Vercel, only whoever manages that deployment does the operator steps once (or per environment); users just use the URL.

---

## Namespace IDs (workspace)

The browser sends a __`namespaceId`__ (usually a UUID from `localStorage`). The server validates __1–80__ chars, `[a-zA-Z0-9_-]`.

__Pinecone:__ You do __not__ create a namespace in the Pinecone console. A namespace is just a **label** on vectors inside an index. The first time data is written with that label, Pinecone stores it there. Mashreq reuses the **workspace id** from the UI as that label so “this browser’s chat” and “ingest for this workspace” hit the same slice of vectors.

__Why copy the workspace id for `laws:pipeline`?__ The script runs **outside** the browser. It must tell Pinecone **which** namespace to write to. That string has to **match** the id the user will have in the app, or chat will search an empty namespace. Easiest rule: open the app once, copy the id from the page, pass it to the pipeline.

## Security

- Never commit `.env`.
- Protect `/api/ingest` in production if needed.

## Bulk laws workflow (index → workspace → pipeline)

Detailed steps for **operators** loading many PDFs. See also [Getting started](./getting-started.md).

### Step 1 — Create the Pinecone index

A **vector index** is the database where all chunks of legal text will live. You create it **once per environment** (e.g. one index called `mashreq-vectors` for production).

- __BYOV (default):__ In the [Pinecone console](https://app.pinecone.io/), create a **serverless** index, **cosine** similarity, dimension **768** (for the default Together embedding model). The name you type there (e.g. `mashreq-vectors`) is what you will put in `PINECONE_INDEX`.
- __Integrated mode:__ Create an index that uses Pinecone’s **integrated embedding** model and maps the text field to **`content`** (see [Getting started §3](./getting-started.md#create-a-pinecone-index)). That index type is **different** from a plain 768-d BYOV index—do not mix them.

Until this index exists, any ingest will fail with errors like **404** or “index not found”.

### Step 2 — Configure `.env` on the machine that runs the app and scripts

The Next.js server and the `tsx` scripts read **environment variables** (from a `.env` file in the project root or from your host).

- __Always:__ `PINECONE_API_KEY`, `PINECONE_INDEX` (must **exactly** match the index name from step 1), `GROQ_API_KEY` (needed for **chat** in the UI).
- __If BYOV:__ `TOGETHER_AI_API_KEY` (needed to **embed** text during ingest and during chat retrieval).

Wrong or missing keys produce clear errors from the pipeline script or from `/api/chat` / `/api/ingest`.

### Step 3 — “Create” the namespace (workspace id)

There is **no button in Pinecone** to “create namespace.” Instead:

1. Run `npm run dev` and open the app.
2. The UI shows a **workspace** id (a long random id). That value **is** the Pinecone namespace name Mashreq will use for this browser profile.
3. **Copy** that string. If you click **مساحة جديدة**, a **new** id appears—that is a **new** empty workspace (new namespace). Use one id consistently for “I want these PDFs to appear in this browser session.”

End users never do this on purpose; the app creates an id for them automatically. **You** only need to copy it when running **`laws:pipeline`** so server-side ingest targets the same namespace as the browser you care about.

### Step 4 — Add PDF files

Put `.pdf` files in the project’s `laws/` folder (top level only, for the default script). The pipeline reads them from disk.

### Step 5 — Run the pipeline

```bash
npm run laws:pipeline -- <workspace-id-you-copied>
```

This (1) extracts text from each PDF into `laws/processed/.../full.txt`, then (2) chunks and upserts vectors into Pinecone under the given namespace. After that, in the app—with the **same** workspace id visible—chat can retrieve those chunks.

---

**Other commands** (same operator, same prerequisites): `laws:extract` and `laws:ingest` separately, or `laws:ingest-pdf` to skip the `processed/` folder. See [Getting started](./getting-started.md).

## Legacy quickstart

`npm run quickstart` targets __integrated__-style `upsertRecords`. Use an index dedicated to that demo or temporarily set `MASHREQ_VECTOR_MODE=integrated` with a matching index.
