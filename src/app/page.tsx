"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthBar } from "@/components/AuthBar";

type Role = "user" | "assistant";

type Msg = { role: Role; content: string };

const NS_KEY = "mashreq_namespace";

export default function Home() {
  const [namespaceId, setNamespaceId] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [lawName, setLawName] = useState("");
  const [year, setYear] = useState("");
  const [article, setArticle] = useState("");
  const [category, setCategory] = useState("");
  const [corpus, setCorpus] = useState("");

  useEffect(() => {
    let id = localStorage.getItem(NS_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(NS_KEY, id);
    }
    setNamespaceId(id);
  }, []);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { user: unknown }) => setLoggedIn(!!d.user))
      .catch(() => setLoggedIn(false));
  }, []);

  const newWorkspace = useCallback(() => {
    const id = crypto.randomUUID();
    localStorage.setItem(NS_KEY, id);
    setNamespaceId(id);
    setMessages([]);
    setIngestStatus(null);
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || !namespaceId || loading || !loggedIn) return;

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ namespaceId, messages: next }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages([...next, { role: "assistant", content: data.reply ?? "" }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ";
      setMessages([
        ...next,
        { role: "assistant", content: `عذراً، حدث خطأ: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const ingest = async () => {
    if (!namespaceId) return;
    setIngestStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namespaceId,
          law_name: lawName.trim(),
          year: year.trim(),
          article_number: article.trim(),
          text: corpus,
          ...(category.trim() ? { category: category.trim() } : {}),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        chunkCount?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "فشل الرفع");
      setIngestStatus(`تمت الفهرسة: ${data.chunkCount} مقطعاً. انتظر بضع ثوانٍ قبل السؤال.`);
      setCorpus("");
    } catch (e) {
      setIngestStatus(
        e instanceof Error ? e.message : "فشل الرفع"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!namespaceId) {
    return (
      <div className="app-shell">
        <p className="status">جاري التحميل…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AuthBar />
      <header>
        <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>
          مشرق (Mashreq)
        </h1>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
          مساعد تعليمي للبحث في نصوص قانونية سودانية مفهرسة — لا يخزن أسئلتك
          شخصياً على الخادم.
        </p>
      </header>

      <div className="disclaimer" role="note">
        <strong>تنبيه قانوني:</strong> مشرق مساعد ذكاء اصطناعي لأغراض تعليمية
        فقط، وليس بديلاً عن استشارة محامٍ مرخّص. تحقق دائماً من النصوص
        الرسمية.
        <br />
        <span style={{ fontSize: "0.85rem", marginTop: "0.35rem", display: "block" }}>
          Mashreq is for educational purposes only and is not a substitute for
          professional legal advice from a licensed attorney.
        </span>
      </div>

      <div className="workspace-bar">
        <span>المساحة (عزل بيانات عبر Pinecone namespace):</span>
        <code>{namespaceId}</code>
        <button type="button" className="btn" onClick={newWorkspace}>
          مساحة جديدة
        </button>
      </div>

      <section aria-label="محادثة">
        {loggedIn === false && (
          <p className="status" style={{ marginBottom: "1rem" }}>
            <a href="/login">سجّل الدخول</a> لاستخدام المحادثة (حدود استخدام
            تُسجَّل لكل مستخدم).
          </p>
        )}
        <div className="chat-log">
          {messages.length === 0 && (
            <p className="status" style={{ margin: 0 }}>
              اطرح سؤالاً بالعربية (عامية أو فصحى). مثال: كيف أفتح سجلاً
              تجارياً في السودان؟ — بعد رفع نصوص القوانين في الأسفل.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`msg ${m.role === "user" ? "msg-user" : "msg-assistant"}`}
            >
              <strong>{m.role === "user" ? "أنت" : "مشرق"}:</strong>
              {m.content ? `\n${m.content}` : ""}
            </div>
          ))}
          {loading && <p className="status">… جاري الاسترجاع والإجابة</p>}
        </div>

        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب سؤالك هنا…"
            disabled={loading || loggedIn === false || loggedIn === null}
            aria-label="سؤال"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || loggedIn === false || loggedIn === null}
          >
            إرسال
          </button>
        </form>
      </section>

      <section className="ingest" aria-label="رفع نص قانوني">
        <h2>فهرسة نص (لوحة المشرف — MVP)</h2>
        <p className="status" style={{ marginTop: 0 }}>
          الصق نص المادة أو الفصل. يُقسّم النص عبر LangChain ثم يُفهرس في Pinecone
          — إما تضمين مدمج من Pinecone (<code>MASHREQ_VECTOR_MODE=integrated</code>)
          أو تضمين Together (<code>byov</code>، الافتراضي). راجع{" "}
          <code>.env.example</code>.
        </p>
        <div className="ingest-grid">
          <div>
            <label className="small">اسم القانون</label>
            <input
              value={lawName}
              onChange={(e) => setLawName(e.target.value)}
              placeholder="مثال: قانون المعاملات المدنية السوداني"
            />
          </div>
          <div>
            <label className="small">السنة</label>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2020"
            />
          </div>
          <div>
            <label className="small">المادة / المرجع</label>
            <input
              value={article}
              onChange={(e) => setArticle(e.target.value)}
              placeholder="مثال: 12 أو الباب الثاني"
            />
          </div>
          <div>
            <label className="small">التصنيف (اختياري)</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="مثال: حقوق العمال"
            />
          </div>
          <div>
            <label className="small">النص الكامل</label>
            <textarea
              value={corpus}
              onChange={(e) => setCorpus(e.target.value)}
              placeholder="الصق النص العربي هنا (50 حرفاً على الأقل)…"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={() => void ingest()}
          >
            فهرسة إلى Pinecone
          </button>
        </div>
        {ingestStatus && (
          <p
            className={`status ${ingestStatus.includes("فشل") ? "error" : ""}`}
          >
            {ingestStatus}
          </p>
        )}
      </section>
    </div>
  );
}
