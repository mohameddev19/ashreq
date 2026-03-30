# Deployment

## Vercel (recommended for this stack)

Mashreq is a standard **Next.js** app and deploys cleanly to [Vercel](https://vercel.com/).

### Steps

1. Push the repository to GitHub (or GitLab / Bitbucket connected to Vercel).
2. Create a new Vercel project and import the repo.
3. Set **Environment variables** in the Vercel project settings (Production and Preview as needed):

   - `PINECONE_API_KEY`
   - `PINECONE_INDEX` (must match index type: BYOV dim vs integrated)
   - `MASHREQ_VECTOR_MODE` (`byov` or `integrated`; optional, default BYOV)
   - `TOGETHER_AI_API_KEY` (BYOV only)
   - `TOGETHER_EMBEDDING_MODEL` (BYOV optional)
   - `GROQ_API_KEY`
   - `GROQ_MODEL` (optional)
   - `MASHREQ_DEFAULT_LAW_CATEGORY` (optional)

4. Deploy. Vercel runs `next build` and serves the App Router API routes as serverless functions.

### Node version

Specify **Node 20+** in Vercel (Project → Settings → General → Node.js Version) to match `package.json` `engines`.

## Environment parity

Use the **same** `MASHREQ_VECTOR_MODE`, `PINECONE_INDEX`, and (for BYOV) **Together** model / dimensions as locally. **Integrated** and **BYOV** require **different** index configurations — do not point production at the wrong type.

## Security and abuse (MVP gaps)

The MVP **does not authenticate** ingest or chat. Before exposing a public URL:

- Consider **removing or protecting** `/api/ingest` (e.g. Vercel middleware, API key header, or admin-only deployment).
- Rate-limit chat if needed (Vercel Edge Config, external gateway, or Groq/Pinecone quotas).

## Custom domains

Add your domain in Vercel and enable HTTPS (default). No extra app config is required for Mashreq’s same-origin fetches.

## Observability

- Use Vercel **Logs** for function errors.
- Monitor Pinecone and Groq usage in their respective consoles to catch quota or latency issues.

## Related docs

- [Getting started](./getting-started.md)
- [Configuration](./configuration.md)
