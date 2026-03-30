import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getRagNamespace } from "@/lib/namespace";
import { consumeChatQuota } from "@/lib/rateLimit";
import {
  documentsToContextBlock,
  hitsToContextBlock,
  systemPromptWithContext,
} from "@/lib/rag";
import { getLegalIndex } from "@/lib/pinecone";
import { getMashreqVectorStore } from "@/lib/langchain/mashreqVectorStore";
import { isIntegratedVectorMode, RAG_TOP_K } from "@/lib/vectorMode";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});

const bodySchema = z.object({
  namespaceId: z.string(),
  messages: z.array(messageSchema).min(1).max(30),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول لاستخدام المحادثة" },
        { status: 401 }
      );
    }

    const { allowed, limit, count } = await consumeChatQuota(user.userId);
    if (!allowed) {
      return NextResponse.json(
        {
          error: `تجاوزت الحد المسموح للرسائل في الساعة (${limit}).`,
          limit,
          count,
        },
        { status: 429 }
      );
    }

    const { namespaceId, messages } = parsed.data;
    const ns = getRagNamespace(namespaceId);

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const lastUser = [...messages]
      .reverse()
      .find((m) => m.role === "user")?.content;
    if (!lastUser?.trim()) {
      return NextResponse.json({ error: "Missing user message" }, { status: 400 });
    }

    let context: string;
    if (isIntegratedVectorMode()) {
      const index = getLegalIndex();
      const search = await index.namespace(ns).searchRecords({
        query: {
          topK: RAG_TOP_K,
          inputs: { text: lastUser },
        },
      });
      context = hitsToContextBlock(search.result.hits);
    } else {
      const store = await getMashreqVectorStore(ns);
      const docs = await store.similaritySearch(lastUser, RAG_TOP_K);
      context = documentsToContextBlock(docs);
    }

    const system = systemPromptWithContext(context);

    const groq = new Groq({ apiKey: groqKey });
    const model =
      process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 2048,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ reply });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
