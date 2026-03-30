import { Pinecone } from "@pinecone-database/pinecone";

let client: Pinecone | null = null;

export function getPinecone(): Pinecone {
  if (!client) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) throw new Error("PINECONE_API_KEY is not set");
    client = new Pinecone({ apiKey });
  }
  return client;
}

export function getLegalIndex() {
  const name = process.env.PINECONE_INDEX;
  if (!name) throw new Error("PINECONE_INDEX is not set");
  return getPinecone().index(name);
}
