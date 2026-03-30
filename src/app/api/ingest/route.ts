import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { Document } from "@langchain/core/documents";
import { assertValidNamespaceId } from "@/lib/namespace";
import { refineLegalText } from "@/lib/refineLegalText";
import { getLegalRecursiveSplitter } from "@/lib/langchain/legalTextSplitter";
import { getMashreqVectorStore } from "@/lib/langchain/mashreqVectorStore";
import { getLegalIndex } from "@/lib/pinecone";
import { isIntegratedVectorMode } from "@/lib/vectorMode";

export const runtime = "nodejs";

const bodySchema = z.object({
  namespaceId: z.string(),
  law_name: z.string().min(1).max(500),
  year: z.string().min(1).max(32),
  article_number: z.string().min(1).max(200),
  text: z.string().min(50).max(500_000),
  category: z.string().max(200).optional(),
});

const BATCH = 96;

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { namespaceId, law_name, year, article_number, text, category } =
      parsed.data;
    const ns = assertValidNamespaceId(namespaceId);

    const splitter = getLegalRecursiveSplitter();
    const base = new Document({
      pageContent: refineLegalText(text),
      metadata: {
        law_name,
        year,
        article_number,
        ...(category ? { category } : {}),
      },
    });

    const splitDocs = await splitter.splitDocuments([base]);
    if (!splitDocs.length) {
      return NextResponse.json({ error: "No chunks produced" }, { status: 400 });
    }

    const batchId = randomUUID();

    if (isIntegratedVectorMode()) {
      const records = splitDocs.map((d, i) => ({
        _id: `${batchId}:${i}`,
        content: d.pageContent,
        law_name,
        year,
        article_number: `${article_number} · جزء ${i + 1}/${splitDocs.length}`,
        ...(category ? { category } : {}),
      }));

      const index = getLegalIndex().namespace(ns);
      for (let i = 0; i < records.length; i += BATCH) {
        const batch = records.slice(i, i + BATCH);
        await index.upsertRecords({ records: batch });
      }
    } else {
      const enhanced = splitDocs.map(
        (d, i) =>
          new Document({
            pageContent: d.pageContent,
            metadata: {
              ...d.metadata,
              law_name,
              year,
              article_number: `${article_number} · جزء ${i + 1}/${splitDocs.length}`,
              ...(category ? { category } : {}),
            },
          })
      );

      const store = await getMashreqVectorStore(ns);
      const ids = enhanced.map((_, i) => `${batchId}:${i}`);
      await store.addDocuments(enhanced, { ids });
    }

    return NextResponse.json({
      ok: true,
      documentId: batchId,
      chunkCount: splitDocs.length,
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
