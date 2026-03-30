# Getting started

## Prerequisites

If you are unsure what **Groq** or **Pinecone** are, read [Services explained](./services.md) first.

- **Node.js 20+** ([nodejs.org](https://nodejs.org/))
- A **Pinecone** account and API key ([Pinecone console](https://app.pinecone.io/))
- __Either__ a Pinecone __integrated__ index (no Together key) __or__ a __Together AI__ API key for __BYOV__ embeddings ([Together](https://api.together.xyz/)) — see `MASHREQ_VECTOR_MODE` in [Configuration](./configuration.md)
- A **Groq** API key ([Groq console](https://console.groq.com/))
- **Pinecone CLI** (`pc`) if you want to create the index from the terminal (see below). You can also create the index in the **web console** instead.

## 1. Install dependencies

From the repository root:

```bash
npm install
```

## 2. Configure environment

**macOS / Linux:**

```bash
cp .env.example .env
```

**Windows (PowerShell or CMD):**

```text
copy .env.example .env
```

Set at minimum:

- `PINECONE_API_KEY`
- `PINECONE_INDEX` (must match the index you create for the chosen mode)
- `GROQ_API_KEY`

__BYOV__ (default `MASHREQ_VECTOR_MODE=byov` or unset): also `TOGETHER_AI_API_KEY`.

__Integrated__ (`MASHREQ_VECTOR_MODE=integrated`): no Together key; index must use Pinecone integrated embeddings with `content` mapped to the text field (see [Configuration](./configuration.md)).

Optional:

- `MASHREQ_VECTOR_MODE` (`byov` \| `integrated`)
- `TOGETHER_EMBEDDING_MODEL` (BYOV; default matches LangChain’s Together default)
- `GROQ_MODEL` (default: `llama-3.1-8b-instant`)
- `MASHREQ_DEFAULT_LAW_CATEGORY` (for `laws:ingest-pdf`)

Details: [Configuration](./configuration.md).

---

## 3. Create a Pinecone index

Pick __one__ path and match __`MASHREQ_VECTOR_MODE`__ and __`PINECONE_INDEX`__.

### A. Bring-your-own vectors (BYOV) — default

Mashreq uses __LangChain__ + __Together AI__ to produce embeddings. The index must be __serverless__, __cosine__, and its __dimension__ must match `TOGETHER_EMBEDDING_MODEL` (default __`togethercomputer/m2-bert-80M-8k-retrieval`__ → __768__ — confirm in [Together docs](https://docs.together.ai/) if you change the model).

__Web console:__ Create index → Serverless → cosine → dimensions __768__ → name e.g. `mashreq-vectors` → set `PINECONE_INDEX` and `TOGETHER_AI_API_KEY` in `.env`.

**CLI:** Use `pc index create` for a **768-d** cosine serverless index (flags vary — `pc index create --help` or [Pinecone CLI](https://docs.pinecone.io/guides/cli/overview)).

**Verify:** Console or `pc index list` shows dimension **768** (or your model’s size).

### B. Pinecone integrated embeddings

Use this only if `MASHREQ_VECTOR_MODE=integrated`. Mashreq upserts a text field named __`content`__; the index must map Pinecone’s embedding input (`text`) to that field. __Do not__ reuse a BYOV 768-d plain vector index for integrated mode, or vice versa.

**From this repo (no `pc` binary needed)** — uses `PINECONE_API_KEY` from `.env`:

```bash
npm run pinecone:create-integrated-index -- my-index-name
```

Optional args: `[cloud] [region]` (default `aws` `us-east-1`). If you omit the name, the script uses `PINECONE_INDEX` from `.env` or falls back to `mashreq-legal`.

Then set:

```env
MASHREQ_VECTOR_MODE=integrated
PINECONE_INDEX=my-index-name
```

**Pinecone CLI** ([install](https://github.com/pinecone-io/cli/releases), then `pc config set-api-key YOUR_KEY`). For `llama-text-embed-v2` the index dimension is __1024__:

```bash
pc index create --name my-index-name --dimension 1024 --metric cosine --cloud aws --region us-east-1 --model llama-text-embed-v2 --field-map text=content
```

__Verify:__ In the [Pinecone console](https://app.pinecone.io/), the index shows integrated embedding / model; `PINECONE_INDEX` in `.env` matches the index name exactly.

---

## 4. Run the app locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 5. First-time usage (plain text)

1. The page shows a **workspace ID** (namespace). Keep it or click **مساحة جديدة** for a fresh namespace.
2. Under **فهرسة نص**, fill **اسم القانون**, **السنة**, **المادة / المرجع**, and paste **النص الكامل** (at least 50 characters). Click **فهرسة إلى Pinecone**.
3. Wait a few seconds, then ask a question in Arabic in the chat box.

---

## 6. Using PDFs as a knowledge base

Mashreq’s UI ingests **plain text** only. PDFs must become text first, then you paste (or split) into the ingest form.

### Bulk: many PDFs in `laws/`

Follow __[Configuration → Bulk laws workflow](./configuration.md#bulk-laws-workflow-index--workspace--pipeline)__ in order: __create Pinecone index__ → __`.env`__ → __workspace id from the app__ → PDFs → __`laws:pipeline`__.

1. __Pinecone index + `.env`__ — complete [§3 Create a Pinecone index](#3-create-a-pinecone-index) and set __`PINECONE_INDEX`__, __`PINECONE_API_KEY`__, and (for BYOV) __`TOGETHER_AI_API_KEY`__. __`GROQ_API_KEY`__ is required for chat, not for bulk ingest scripts.
2. __Workspace id (= namespace)__ — start __`npm run dev`__, open the app, and __copy the workspace id__ shown on the page (under “المساحة”). Pinecone does not require a separate “create namespace” step; the namespace is created when vectors are upserted. Use __exactly__ that id in the commands below.
3. Copy all `.pdf` files into the **`laws/`** folder at the project root (only top-level `laws/*.pdf` are scanned by default).
4. __Ingest into Pinecone__ — splitting uses LangChain __`RecursiveCharacterTextSplitter`__; vectors follow __`MASHREQ_VECTOR_MODE`__ (Together + `PineconeStore` for BYOV, `upsertRecords` for integrated).

**All-in-one — extract + ingest** (after steps 1–3; defaults: PDFs in `laws/`, output `laws/processed/`):

```bash
npm run laws:pipeline -- YOUR_WORKSPACE_ID_FROM_THE_APP
```

**Or run steps separately:**

- **From extracted folders** (`laws/processed/*/full.txt`):

```bash
npm run laws:ingest -- YOUR_WORKSPACE_ID_FROM_THE_APP
```

- **Directly from PDFs** in `laws/` (same PDF extract stack as `laws:extract`, then split + Pinecone):

```bash
npm run laws:ingest-pdf -- YOUR_WORKSPACE_ID_FROM_THE_APP
```

To align the browser with a chosen id, set `localStorage` key `mashreq_namespace` to that value (or use __مساحة جديدة__ until the id matches).

5. __Chat__: keep __`npm run dev`__ running, confirm the page shows the __same__ workspace id you used for ingest, then ask questions in Arabic.

**Extract only** (if you are not using `laws:pipeline`): creates `laws/processed/<slug>/full.txt` + `meta.json`:

```bash
npm run laws:extract
```

Custom paths: `npx tsx scripts/process-laws-dir.ts path/to/pdfs path/to/output`

6. **Scanned PDFs** (image-only) produce **empty** `full.txt`; run OCR first, then add text manually or replace the PDF.

### Text-based PDFs (selectable text)

1. **Extract text** using one of:

- **This repo (Node):** from the project root, after `npm install`:

```bash
npm run extract-pdf -- path/to/law.pdf law-output.txt
```

Or: `npx tsx scripts/extract-pdf.ts path/to/law.pdf law-output.txt`  
Without the second argument, text is printed to the terminal.

- Any desktop tool (Adobe Reader export, etc.) or “Save as text” if your PDF viewer supports it.

2. **Clean up** the `.txt` if needed (headers, page numbers, broken lines).
3. **Ingest in Mashreq** — for each logical unit (e.g. one law or one chapter):

   - Set **اسم القانون** / **السنة** / **المادة** appropriately.
   - Paste the relevant portion of extracted text into **النص الكامل** (≥ 50 characters).
   - Large laws: ingest in **several submissions** (by chapter or batch of articles) with consistent metadata so citations stay clear.

### Scanned PDFs (images only)

`pdf-parse` **does not OCR**. You need OCR first (e.g. Abbey FineReader, Adobe Scan workflow, or open-source OCR pipelines), then paste the resulting text into Mashreq as above.

### Arabic PDFs

Extraction quality depends on encoding and fonts in the file. If output is garbled, try another extractor or re-export the PDF from the official source.

### Cleaning extracted text (refinement)

`pdf-parse` often leaves __control characters__ (e.g. ``), __replacement glyphs__ (), and __zero-width spaces__ (treated as __spaces__ in `refineLegalText`). Some PDFs (e.g. certain official gazette layouts) omit normal spaces between Arabic words; __`extractPdfText`__ (`src/lib/extractPdfText.ts`) detects that pattern and re-extracts with __pdf.js__ using glyph positions to insert spaces, without changing PDFs that already extract cleanly. Set __`MASHREQ_PDF_LAYOUT_EXTRACT=1`__ in `.env` to always use the layout path. If layout still splits words badly, try __`MASHREQ_PDF_PARSE_ONLY=1`__ (pdf-parse only; text may glue again) or re-export the PDF from the source.

**`refineLegalText()`** applies **NFKC/NFC** so isolated Arabic glyphs (presentation forms like ﻨﺤﻥ) become standard letters (نحن), strips private-use characters, and trims stray diacritics between spaces. It runs on every extract path when you:

- run `npm run laws:extract` or `extract-pdf`, and
- chunk text via LangChain’s splitter (including `/api/ingest`, `laws:ingest`, and `laws:ingest-pdf`).

Re-run **`npm run laws:extract`** to refresh `laws/processed/**/full.txt`, then **`npm run laws:ingest -- <namespace>`** again if you already loaded noisy text into Pinecone.

This does **not** replace **OCR** for scanned PDFs or fix wrong Unicode mapping from broken fonts.

---

## 7. Optional: Pinecone CLI quickstart script

To verify Pinecone with the small **English** sample dataset (not Sudanese law):

```bash
npm run quickstart
```

Requires a **separate** Pinecone **integrated** index; do not use the same index as LangChain/Together. See `scripts/pinecone-quickstart.ts`.

---

## Troubleshooting

| Symptom | Check |
| ------- | ----- |
| `pc` is not recognized | Install CLI from [GitHub releases](https://github.com/pinecone-io/cli/releases) and fix PATH, or use __Option B__ (web console). |
| CLI auth errors | `PINECONE_API_KEY` set in the same terminal session, or `pc auth configure`. |
| `PINECONE_API_KEY is not set` (app) | `.env` in project root; restart `npm run dev`. |
| `GROQ_API_KEY is not configured` | Add key to `.env`. |
| Together / embedding errors | __BYOV only:__ `TOGETHER_AI_API_KEY` set; index __dimension__ matches `TOGETHER_EMBEDDING_MODEL`. |
| Empty or irrelevant answers | Ingest text in the __same__ namespace as chat; wait after ingest; try a clearer question. |
| Index / upsert errors (integrated) | __Integrated mode:__ index uses integrated embeddings with `text=content` (or equivalent); name matches `PINECONE_INDEX`. |
| __`Integrated inference is not configured for this index`__ | Your index is __BYOV__ (plain vectors) but `.env` has __`MASHREQ_VECTOR_MODE=integrated`__. Set __`MASHREQ_VECTOR_MODE=byov`__ (or remove it) and use __`TOGETHER_AI_API_KEY`__, or create a dedicated integrated index. |
| Index / upsert errors (BYOV) | __BYOV:__ plain vector index; dimension matches Together model; not an integrated-only index. |
| Pinecone __404__ on index | Create the index in the console or CLI; spelling must match `PINECONE_INDEX`. |
| Chat finds nothing after bulk ingest | Namespace in `laws:ingest` must __equal__ the workspace id in the UI (`localStorage` key `mashreq_namespace`). |
| PDF script errors | Path in quotes if it contains spaces; ensure the PDF is not password-protected. |

More detail: [Configuration](./configuration.md) and Pinecone [troubleshooting](https://docs.pinecone.io/guides/production/troubleshooting).
