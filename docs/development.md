# Development

## Repository layout

```ini
├── docs/                 # This documentation
├── scripts/
│   ├── pinecone-quickstart.ts
│   ├── sampleRecords.ts
│   ├── ingest-laws-langchain.ts   # PDF dir → extractPdfPages → split → Pinecone
│   ├── ingest-processed-laws.ts   # laws/processed/*/full.txt → split → Pinecone
│   ├── create-integrated-index.ts # Pinecone SDK: integrated index for MASHREQ_VECTOR_MODE=integrated
│   ├── laws-pipeline.ts           # extract (process-laws-dir) + ingest-processed-laws
│   ├── process-laws-dir.ts
│   └── extract-pdf.ts
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts    # RAG: integrated searchRecords or BYOV similaritySearch + Groq
│   │   ├── api/ingest/route.ts  # LangChain splitter + integrated upsert or BYOV addDocuments
│   │   ├── globals.css
│   │   ├── layout.tsx           # RTL, Noto Sans Arabic
│   │   └── page.tsx             # Client UI
│   └── lib/
│       ├── refineLegalText.ts   # Strip PDF junk (controls, U+FFFD, ZWSP) + NFC
│       ├── chunk.ts             # Legacy chunk helper (optional scripts)
│       ├── langchain/           # Together embeddings, splitter, PineconeStore
│       ├── namespace.ts         # Namespace id validation
│       ├── pinecone.ts          # Pinecone client + index accessor
│       ├── vectorMode.ts        # MASHREQ_VECTOR_MODE (integrated vs BYOV)
│       └── rag.ts               # hitsToContextBlock, documentsToContextBlock, system prompt
├── .agents/              # Pinecone agent reference guides (optional for AI tools)
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Next.js development server |
| `npm run lint` | ESLint via Next.js |
| `npm run quickstart` | Integrated-index Pinecone demo only (separate index) |
| `npm run pinecone:create-integrated-index -- [name] [cloud] [region]` | Create serverless integrated index (`llama-text-embed-v2`, `content` field) |
| `npm run extract-pdf -- <file.pdf> [out.txt]` | Extract text only ([Getting started](./getting-started.md#6-using-pdfs-as-a-knowledge-base)) |
| `npm run laws:extract` | All `laws/*.pdf` → `laws/processed/` |
| `npm run laws:ingest -- <namespace>` | Processed folders → split → mode-specific Pinecone write |
| `npm run laws:ingest-pdf -- <namespace>` | PDFs in `laws/` → shared PDF extract → split → Pinecone |
| `npm run laws:pipeline -- <namespace>` | `laws:extract` + `laws:ingest` (default dirs) in one run |

There is no `build` script in `package.json`; production builds use `next build` when you deploy (e.g. Vercel runs it automatically).

## TypeScript

- App code lives under `src/` and uses the `@/*` path alias from `tsconfig.json`.
- `scripts/` is excluded from the Next TypeScript project but runs under `tsx`.

## Styling and UI

- Global styles: `src/app/globals.css`
- RTL and Arabic: `lang="ar"` and `dir="rtl"` on `<html>` in `layout.tsx`
- Font: `next/font/google` — `Noto_Sans_Arabic`

## Agent / Pinecone reference files

The `.agents/` directory contains Pinecone-maintained markdown guides for assistants (CLI, Python, TypeScript, troubleshooting). They are **not** required to run Mashreq but help when extending ingestion or search behavior.

## Contributing notes

- Keep API validation in sync with `docs/api.md` if you change request shapes.
- Grounding and disclaimer copy in `src/lib/rag.ts` and `page.tsx` should stay aligned with product policy.
