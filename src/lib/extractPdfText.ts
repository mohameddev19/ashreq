/**
 * PDF text extraction for scripts: pdf-parse first, then optional pdf.js layout pass
 * when Arabic text looks "glued" (no spaces). Keeps good pdf-parse output unchanged.
 *
 * Intended for Node (tsx scripts) only — not imported from Next.js routes.
 */
import path from "path";
import { pathToFileURL } from "url";
import pdfParse from "pdf-parse";
import { refineLegalText } from "./refineLegalText";

/** Arabic letters (major blocks); used for merge detection, not full Unicode coverage */
const ARABIC_LETTER_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;

function isArabicCodePoint(c: number): boolean {
  return (
    (c >= 0x600 && c <= 0x6ff) ||
    (c >= 0x750 && c <= 0x77f) ||
    (c >= 0x8a0 && c <= 0x8ff) ||
    (c >= 0xfb50 && c <= 0xfdff) ||
    (c >= 0xfe70 && c <= 0xfeff)
  );
}

function maxArabicLetterRunLength(text: string): number {
  const runs = text.match(ARABIC_LETTER_RE);
  if (!runs?.length) return 0;
  return Math.max(...runs.map((r) => r.length));
}

function arabicLetterCount(text: string): number {
  const runs = text.match(ARABIC_LETTER_RE);
  return runs ? runs.reduce((n, r) => n + r.length, 0) : 0;
}

/**
 * True when the extract is Arabic-heavy but word boundaries look missing
 * (long unbroken letter runs + very few spaces vs Arabic letters).
 */
export function looksLikeMergedArabicPdfText(text: string): boolean {
  const letters = arabicLetterCount(text);
  if (letters < 80) return false;
  const maxRun = maxArabicLetterRunLength(text);
  const spaces = (text.match(/ /g) ?? []).length;
  const ratio = spaces / letters;
  // Digits/punctuation break "runs" in regex; long glued lines still often have maxRun > 22.
  return maxRun > 22 && ratio < 0.085;
}

function layoutQualityScore(text: string): number {
  const maxRun = maxArabicLetterRunLength(text);
  const letters = arabicLetterCount(text);
  const spaces = (text.match(/ /g) ?? []).length;
  const ratio = letters > 0 ? spaces / letters : 0;
  return maxRun * 10 - Math.min(ratio, 0.3) * 100;
}

type TextItem = {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL: boolean;
};

function isTextItem(x: unknown): x is TextItem {
  return (
    typeof x === "object" &&
    x !== null &&
    "str" in x &&
    typeof (x as TextItem).str === "string"
  );
}

/**
 * Many official PDFs emit per-glyph presentation forms; tight layout gaps then
 * produce false "word" breaks (e.g. الت ي). Use a looser gap threshold on those pages.
 */
export function presentationFormHeavyInItems(
  items: ReadonlyArray<unknown>
): boolean {
  let pres = 0;
  let core = 0;
  for (const raw of items) {
    if (!isTextItem(raw)) continue;
    for (const ch of raw.str) {
      const c = ch.codePointAt(0) ?? 0;
      if ((c >= 0xfb50 && c <= 0xfdff) || (c >= 0xfe70 && c <= 0xfeff)) {
        pres++;
      }
      if (
        (c >= 0x600 && c <= 0x6ff) ||
        (c >= 0x750 && c <= 0x77f) ||
        (c >= 0x8a0 && c <= 0x8ff)
      ) {
        core++;
      }
    }
  }
  const total = pres + core;
  return total >= 40 && pres / total >= 0.2;
}

function rtlLineSortEnabled(): boolean {
  return (
    process.env.MASHREQ_PDF_JS_RTL_LINE_SORT !== "0" &&
    process.env.MASHREQ_PDF_JS_RTL_LINE_SORT !== "false"
  );
}

function lineIsRtlArabic(items: ReadonlyArray<TextItem>): boolean {
  if (items.some((it) => (it.dir || "").toLowerCase() === "rtl")) return true;
  let ar = 0;
  let lat = 0;
  for (const it of items) {
    for (const ch of it.str) {
      const c = ch.codePointAt(0) ?? 0;
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) lat++;
      else if (isArabicCodePoint(c)) ar++;
    }
  }
  return ar > lat && ar >= 2;
}

function itemXY(it: TextItem): { x: number; y: number; w: number; h: number } {
  const t = it.transform;
  const x = typeof t[4] === "number" ? t[4] : 0;
  const y = typeof t[5] === "number" ? t[5] : 0;
  const w = it.width || 0;
  const h = Math.abs(it.height || (typeof t[3] === "number" ? t[3] : 12));
  return { x, y, w, h };
}

/**
 * PDF viewers reorder text runs for clipboard copy; content streams often list RTL
 * runs in painting order. Group items into visual lines (same as merge), then sort
 * each line by x (descending for Arabic RTL) before merging gaps.
 */
function reorderPdfJsItemsForReadingOrder(items: ReadonlyArray<unknown>): TextItem[] {
  const parsed: TextItem[] = [];
  for (const raw of items) {
    if (isTextItem(raw)) parsed.push(raw);
  }
  if (parsed.length < 2) return parsed;

  const segments: TextItem[][] = [];
  let seg: TextItem[] = [];
  let prevPos: { y: number; h: number } | null = null;

  for (const raw of parsed) {
    const { y, h } = itemXY(raw);
    const hasText = raw.str.length > 0;

    if (hasText && prevPos !== null && seg.length > 0) {
      const yTol = Math.max(2.5, Math.min(prevPos.h, h) * 0.35);
      if (Math.abs(y - prevPos.y) > yTol) {
        segments.push(seg);
        seg = [];
      }
    }

    seg.push(raw);
    if (hasText) prevPos = { y, h };
  }
  if (seg.length) segments.push(seg);

  const out: TextItem[] = [];
  for (const s of segments) {
    const withText = s.filter((it) => it.str.length > 0);
    const noText = s.filter((it) => it.str.length === 0);
    if (withText.length < 2) {
      out.push(...s);
      continue;
    }
    const rtl = lineIsRtlArabic(withText);
    const indexed = withText.map((it, i) => ({ it, i }));
    indexed.sort((a, b) => {
      const ax = itemXY(a.it).x;
      const bx = itemXY(b.it).x;
      const d = rtl ? bx - ax : ax - bx;
      if (Math.abs(d) < 0.5) return a.i - b.i;
      return d > 0 ? 1 : -1;
    });
    out.push(...indexed.map((x) => x.it), ...noText);
  }

  return out;
}

/**
 * Insert spaces/newlines from glyph positions (pdf.js text items).
 */
export function mergePdfTextItemsWithSpaces(
  items: ReadonlyArray<unknown>
): string {
  const presentationHeavy = presentationFormHeavyInItems(items);
  const gapFactor = presentationHeavy ? 0.28 : 0.185;
  const minGapPdf = presentationHeavy ? 2.6 : 1.9;

  const ordered: ReadonlyArray<TextItem> = rtlLineSortEnabled()
    ? reorderPdfJsItemsForReadingOrder(items)
    : (items.filter(isTextItem) as TextItem[]);

  const out: string[] = [];
  let prev: { x: number; y: number; w: number; h: number; dir: string } | null =
    null;

  for (const raw of ordered) {
    if (!isTextItem(raw)) continue;
    const str = raw.str;
    const t = raw.transform;
    const x = typeof t[4] === "number" ? t[4] : 0;
    const y = typeof t[5] === "number" ? t[5] : 0;
    const w = raw.width || 0;
    const h = Math.abs(raw.height || (typeof t[3] === "number" ? t[3] : 12));
    const dir = raw.dir || "ltr";

    if (str === "") {
      if (raw.hasEOL) out.push("\n");
      continue;
    }

    if (prev) {
      const yTol = Math.max(2.5, Math.min(prev.h, h) * 0.35);
      const sameLine = Math.abs(y - prev.y) <= yTol;

      if (!sameLine) {
        const tail = out[out.length - 1] ?? "";
        if (tail && !tail.endsWith("\n")) out.push("\n");
      } else {
        const scale = Math.max(prev.h, h, 8);
        const expectedEnd = prev.x + prev.w;
        const gapFwd = x - expectedEnd;
        const gapRtl = prev.x - (x + w);
        const gap =
          prev.dir === "rtl" || dir === "rtl"
            ? Math.max(Math.abs(gapFwd), Math.abs(gapRtl))
            : Math.abs(gapFwd);

        if (gap > Math.max(scale * gapFactor, minGapPdf)) {
          const tail = out[out.length - 1] ?? "";
          if (tail && !/\s$/u.test(tail)) out.push(" ");
        }
      }
    }

    out.push(str);
    if (raw.hasEOL) out.push("\n");

    prev = { x, y, w, h, dir };
  }

  return out.join("");
}

let workerSrcSet = false;
let pdfJsImport: Promise<typeof import("pdfjs-dist/build/pdf.mjs")> | null =
  null;

async function getPdfJs() {
  if (!pdfJsImport) {
    pdfJsImport = import("pdfjs-dist/build/pdf.mjs");
  }
  const pdfjs = await pdfJsImport;
  if (!workerSrcSet) {
    const workerPath = path.join(
      process.cwd(),
      "node_modules",
      "pdfjs-dist",
      "build",
      "pdf.worker.mjs"
    );
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
    workerSrcSet = true;
  }
  return pdfjs;
}

async function extractAllPagesWithPdfJs(buffer: Buffer): Promise<string[]> {
  const { getDocument, VerbosityLevel } = await getPdfJs();

  const copy = new Uint8Array(buffer.length);
  copy.set(buffer);

  const loadingTask = getDocument({
    data: copy,
    verbosity: VerbosityLevel.ERRORS,
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const raw = mergePdfTextItemsWithSpaces(content.items);
    pages.push(raw);
  }

  await pdf.cleanup?.();
  return pages;
}

function splitPdfParseByFormFeed(rawText: string): string[] {
  const parts = rawText.split(/\f+/);
  const trimmed = parts.map((p) => p.trim()).filter(Boolean);
  return trimmed.length ? trimmed : [rawText];
}

/**
 * Full-document text (pages joined with \n\n). Chooses pdf-parse vs pdf.js layout
 * when Arabic looks merged, or when `process.env.MASHREQ_PDF_LAYOUT_EXTRACT === "1"`.
 */
export async function extractPdfPlainText(buffer: Buffer): Promise<{
  text: string;
  pages: number;
  usedLayoutFallback: boolean;
}> {
  const data = await pdfParse(buffer);
  const raw = data.text ?? "";
  const parsePages = splitPdfParseByFormFeed(raw);
  const refinedParts = parsePages.map((p) => refineLegalText(p));
  const refinedJoined =
    refinedParts.length > 1 ? refinedParts.join("\n\n") : refineLegalText(raw);

  const forceLayout =
    process.env.MASHREQ_PDF_LAYOUT_EXTRACT === "1" ||
    process.env.MASHREQ_PDF_LAYOUT_EXTRACT === "true";

  const parseOnly =
    process.env.MASHREQ_PDF_PARSE_ONLY === "1" ||
    process.env.MASHREQ_PDF_PARSE_ONLY === "true";

  const needsLayout =
    forceLayout || (!parseOnly && looksLikeMergedArabicPdfText(refinedJoined));

  if (!needsLayout) {
    return {
      text: refinedJoined,
      pages: data.numpages,
      usedLayoutFallback: false,
    };
  }

  try {
    const layoutPageTexts = await extractAllPagesWithPdfJs(buffer);
    const layoutRefined = layoutPageTexts.map((p) => refineLegalText(p));
    const layoutJoined = layoutRefined.join("\n\n");

    if (!forceLayout) {
      const sParse = layoutQualityScore(refinedJoined);
      const sLayout = layoutQualityScore(layoutJoined);
      // Lower score = better (shorter Arabic runs, more spaces). Reject layout if clearly worse.
      if (sLayout > sParse + 15) {
        return {
          text: refinedJoined,
          pages: data.numpages,
          usedLayoutFallback: false,
        };
      }
      return {
        text: layoutJoined,
        pages: layoutPageTexts.length,
        usedLayoutFallback: true,
      };
    }

    return {
      text: layoutJoined,
      pages: layoutPageTexts.length,
      usedLayoutFallback: true,
    };
  } catch {
    return {
      text: refinedJoined,
      pages: data.numpages,
      usedLayoutFallback: false,
    };
  }
}

/**
 * Per-page strings for LangChain (metadata.page etc.).
 */
export async function extractPdfPages(buffer: Buffer): Promise<{
  pageTexts: string[];
  numPages: number;
  usedLayoutFallback: boolean;
}> {
  const data = await pdfParse(buffer);
  const raw = data.text ?? "";
  const parsePages = splitPdfParseByFormFeed(raw);
  const refinedParts = parsePages.map((p) => refineLegalText(p));
  const refinedJoined =
    refinedParts.length > 1 ? refinedParts.join("\n\n") : refineLegalText(raw);

  const forceLayout =
    process.env.MASHREQ_PDF_LAYOUT_EXTRACT === "1" ||
    process.env.MASHREQ_PDF_LAYOUT_EXTRACT === "true";

  const parseOnly =
    process.env.MASHREQ_PDF_PARSE_ONLY === "1" ||
    process.env.MASHREQ_PDF_PARSE_ONLY === "true";

  const needsLayout =
    forceLayout || (!parseOnly && looksLikeMergedArabicPdfText(refinedJoined));

  if (!needsLayout && refinedParts.length > 1) {
    return {
      pageTexts: refinedParts,
      numPages: data.numpages,
      usedLayoutFallback: false,
    };
  }

  if (!needsLayout) {
    return {
      pageTexts: [refinedJoined],
      numPages: data.numpages,
      usedLayoutFallback: false,
    };
  }

  try {
    const layoutPageTexts = await extractAllPagesWithPdfJs(buffer);
    const layoutRefined = layoutPageTexts.map((p) => refineLegalText(p));
    const layoutJoined = layoutRefined.join("\n\n");

    if (!forceLayout) {
      const sParse = layoutQualityScore(refinedJoined);
      const sLayout = layoutQualityScore(layoutJoined);
      if (sLayout > sParse + 15) {
        if (refinedParts.length > 1) {
          return {
            pageTexts: refinedParts,
            numPages: data.numpages,
            usedLayoutFallback: false,
          };
        }
        return {
          pageTexts: [refinedJoined],
          numPages: data.numpages,
          usedLayoutFallback: false,
        };
      }
    }

    return {
      pageTexts: layoutRefined,
      numPages: layoutRefined.length,
      usedLayoutFallback: true,
    };
  } catch {
    if (refinedParts.length > 1) {
      return {
        pageTexts: refinedParts,
        numPages: data.numpages,
        usedLayoutFallback: false,
      };
    }
    return {
      pageTexts: [refinedJoined],
      numPages: data.numpages,
      usedLayoutFallback: false,
    };
  }
}
