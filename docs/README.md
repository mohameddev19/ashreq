# Mashreq documentation

Mashreq (مشرق) is a lean, Arabic-first legal assistant MVP: users ingest Sudanese (or other) legal text into [Pinecone](https://www.pinecone.io/) (**integrated** inference or **BYOV** with [Together](https://api.together.xyz/)) and ask questions grounded in that corpus via [Groq](https://groq.com/). See [Configuration](./configuration.md) for **`MASHREQ_VECTOR_MODE`**.

## Documentation index

| Document | Description |
| -------- | ----------- |
| [Overview](./overview.md) | Vision, audience, architecture, and how the pieces fit together |
| [Architecture & engine](./architecture.md) | System layers, RAG engine, sequence flows, endpoints, Pinecone record shape |
| [Services explained](./services.md) | What Groq, Pinecone, Next.js mean — includes **why PDF/chunking is not automatic in Pinecone** |
| [Getting started](./getting-started.md) | Install, environment, PDF extract → `laws:pipeline` / ingest → chat |
| [Configuration](./configuration.md) | Env vars, Pinecone index, **who does setup vs end users**, bulk workflow explained step by step |
| [API](./api.md) | HTTP routes used by the web UI |
| [Development](./development.md) | Repository layout, scripts, and conventions |
| [Deployment](./deployment.md) | Deploying to Vercel and production checks |

## Quick links

- [Pinecone docs](https://docs.pinecone.io/)
- [Together AI](https://api.together.xyz/) (BYOV embedding API key)
- [Groq console](https://console.groq.com/) (chat API keys and models)
- [Next.js docs](https://nextjs.org/docs) (App Router)

## Disclaimer

Mashreq is an educational assistant only. It is not a substitute for professional legal advice from a licensed attorney. See the in-app disclaimer and [Overview](./overview.md#legal-disclaimer).
