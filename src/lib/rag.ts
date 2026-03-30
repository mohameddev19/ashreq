import type { Document } from "@langchain/core/documents";
import type { Hit } from "@pinecone-database/pinecone";

const EMPTY_CTX =
  "(لا يوجد مقتطفات مطابقة في فهرس هذه المساحة.)";

function formatContextLine(
  i: number,
  law: string,
  article: string,
  year: string,
  content: string,
  extra?: string
): string {
  const mid = extra ? `${extra}\n` : "";
  return `[#${i + 1}] القانون: ${law} | المادة: ${article} | السنة: ${year}\n${mid}${content}`;
}

/** Legacy: Pinecone integrated `searchRecords` hits. */
export function hitsToContextBlock(hits: Hit[]): string {
  if (!hits.length) return EMPTY_CTX;

  return hits
    .map((hit, i) => {
      const f = hit.fields as Record<string, unknown>;
      const law = String(f.law_name ?? "غير محدد");
      const article = String(f.article_number ?? "—");
      const year = String(f.year ?? "—");
      const content = String(f.content ?? "");
      const cat = f.category != null ? String(f.category) : "";
      const extra = cat ? `التصنيف: ${cat}` : undefined;
      return formatContextLine(i, law, article, year, content, extra);
    })
    .join("\n\n---\n\n");
}

/** LangChain `similaritySearch` documents (metadata from ingest / PDF pipeline). */
export function documentsToContextBlock(docs: Document[]): string {
  if (!docs.length) return EMPTY_CTX;

  return docs
    .map((doc, i) => {
      const m = doc.metadata as Record<string, unknown>;
      const law = String(m.law_name ?? m.lawName ?? "غير محدد");
      const article = String(m.article_number ?? m.articleNumber ?? "—");
      const year = String(m.year ?? "—");
      const category = m.category ? String(m.category) : "";
      const extra = category ? `التصنيف: ${category}` : undefined;
      return formatContextLine(i, law, article, year, doc.pageContent, extra);
    })
    .join("\n\n---\n\n");
}

export function systemPromptWithContext(contextBlock: string): string {
  return `أنت "مشرق (Mashreq)" — مساعد ذكاء اصطناعي تعليمي للاطلاع على النصوص القانونية السودانية المرفوعة إلى النظام. أنت لست بديلاً عن استشارة محامٍ مرخّص.

قواعد إلزامية:
- أجب بالعربية بوضوح ما لم يطلب المستخدم غير ذلك صراحةً؛ ويمكنك تبسيط الصياغة بلهجة أو أسلوب يُفهم لدى عامة الناس في السودان عند الحاجة دون الخروج عن معنى النص.
- استخدم فقط المعلومات الواردة بين START CONTEXT BLOCK و END CONTEXT BLOCK. إذا كان السياق فارغاً أو لا يجيب عن السؤال، قل إنك لا تجد نصاً كافياً في الوثائق المفهرسة لهذه المساحة ولا تُجِبْ من معلومات عامة.
- لا تخترع أرقام مواد أو قوانين أو سنوات غير ظاهرة في السياق.
- عند الاستشهاد، استخدم أسماء الحقول كما وردت: اسم القانون، رقم/وصف المادة، السنة — كما في السياق.
- المصطلحات الشائعة في السودان (مثل الخُلع، التسوية، العُروة وغيرها) فسّرها فقط بناءً على النصوص المقدمة، دون افتراضات خارج السياق.

START CONTEXT BLOCK
${contextBlock}
END CONTEXT BLOCK`;
}
