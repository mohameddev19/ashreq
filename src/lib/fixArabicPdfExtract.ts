/**
 * Some Arabic legal PDFs store lines as: 4-digit year + space + Arabic phrase in
 * **visual** word order (year on the “wrong” side for logical reading).
 *
 * Fix: move the year to the end and reverse Arabic word order.
 * Example: `1997 لسنة العمل قانون` → `قانون العمل لسنة 1997`
 *
 * Optional: `MASHREQ_PDF_AR_REV_WORDS=1` reverses **word order on whole lines** that are
 * mostly Arabic and contain **no ASCII digits** (skips year/clause lines after fixes).
 * Example: "الأول الفصل" → "الفصل الأول". **Can break** PDFs that already extract
 * correctly. Enable only for a known-bad source.
 *
 * Always-on: merges spurious spaces inside words (`الت ي` → `التي`, `ح فظ` → `حفظ`).
 * Disable with `MASHREQ_PDF_AR_MERGE_FRAGMENTS=0`.
 */

const AR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** Letters + tatweel (kashida); PDFs often break words at tatweel. */
const AR_CORE = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0640]+$/u;

function graphemeLen(s: string): number {
  try {
    const seg = new Intl.Segmenter("ar", { granularity: "grapheme" });
    return [...seg.segment(s)].length;
  } catch {
    return [...s].length;
  }
}

function stripEdgePunct(s: string): string {
  return s.replace(/^[،؛:.!?()[\]"'«»]+/u, "").replace(/[،؛:.!?()[\]"'«»]+$/u, "");
}

function isArabicLettersOnly(s: string): boolean {
  if (!s) return false;
  return AR_CORE.test(s);
}

/**
 * PDF text layers often insert spaces in the middle of Arabic words. Merge adjacent
 * tokens when the right (or left) side is a short fragment that is almost always
 * a broken suffix/prefix, not a standalone word (e.g. "لل" is excluded).
 */
/** Single-letter tokens that usually start a new word, not a PDF fragment. */
const SINGLE_LEFT_NO_MERGE = /^[\u0648\u0628\u0641]$/u; // و ب ف

/** Single-letter suffixes often split off by PDF extractors (الت + ي, … + ة). */
const SINGLE_RIGHT_SUFFIX = /^[\u064A\u0629\u0649\u0647\u06CC\u06BE\u0621]$/u;

function shouldMergeArabicPdfFragments(left: string, right: string): boolean {
  const a = stripEdgePunct(left);
  const b = stripEdgePunct(right);
  if (!a || !b) return false;
  if (/^\d+$/.test(a) || /^\d+$/.test(b)) return false;
  if (/[a-zA-Z]/.test(a) || /[a-zA-Z]/.test(b)) return false;
  if (!isArabicLettersOnly(a) || !isArabicLettersOnly(b)) return false;

  const bl = graphemeLen(b);
  const al = graphemeLen(a);

  if (bl === 1 && SINGLE_RIGHT_SUFFIX.test(b)) return true;

  if (
    bl === 2 &&
    /[\u0629\u064A\u0649\u06CC\u0647\u06BE]$/u.test(b)
  ) {
    return true;
  }

  if (al === 1 && !SINGLE_LEFT_NO_MERGE.test(a)) return true;

  return false;
}

function mergeBrokenArabicWordSpaces(line: string): string {
  if (!line || !AR.test(line)) return line;
  const words = line.split(/ +/);
  if (words.length < 2) return line;
  const out: string[] = [];
  let i = 0;
  while (i < words.length) {
    let w = words[i] ?? "";
    while (
      i + 1 < words.length &&
      shouldMergeArabicPdfFragments(w, words[i + 1] ?? "")
    ) {
      i++;
      w += words[i] ?? "";
    }
    out.push(w);
    i++;
  }
  return out.join(" ");
}

function isArabicHeavyLine(line: string): boolean {
  let ar = 0;
  let other = 0;
  for (const ch of line) {
    if (ch === " " || ch === "\t") continue;
    if (AR.test(ch)) ar++;
    else other++;
  }
  return ar + other > 0 && ar / (ar + other) >= 0.65;
}

/** Reverse whitespace-separated tokens on the line (entire Arabic-heavy line). */
function reverseLineWords(line: string): string {
  const lead = line.match(/^\s*/)?.[0] ?? "";
  const trail = line.match(/\s*$/)?.[0] ?? "";
  const core = line.trim();
  if (!core) return line;
  const words = core.split(/\s+/);
  return `${lead}${words.slice().reverse().join(" ")}${trail}`;
}

/**
 * Leading whitespace preserved. Line must start (after trim) with 4 digits + space + Arabic.
 */
function fixYearThenArabicLine(line: string): string {
  const leadMatch = line.match(/^(\s*)/);
  const lead = leadMatch ? leadMatch[1] : "";
  const trimmed = line.slice(lead.length);
  const m = trimmed.match(/^(\d{4})\s+(.+)$/u);
  if (!m) return line;
  const year = m[1];
  const rest = m[2].trim();
  if (!/[\u0600-\u06FF]/.test(rest)) return line;
  const words = rest.split(/\s+/).filter(Boolean);
  if (words.length < 2) return line;
  const flipped = words.slice().reverse().join(" ");
  return `${lead}${flipped} ${year}`;
}

export function fixArabicPdfExtractedText(text: string): string {
  if (!text) return text;

  const revWords =
    process.env.MASHREQ_PDF_AR_REV_WORDS === "1" ||
    process.env.MASHREQ_PDF_AR_REV_WORDS === "true";

  const mergeFragments =
    process.env.MASHREQ_PDF_AR_MERGE_FRAGMENTS !== "0" &&
    process.env.MASHREQ_PDF_AR_MERGE_FRAGMENTS !== "false";

  return text
    .split("\n")
    .map((line) => {
      let s = fixYearThenArabicLine(line);
      if (mergeFragments) {
        s = mergeBrokenArabicWordSpaces(s);
      }
      if (
        revWords &&
        isArabicHeavyLine(s) &&
        !/[0-9]/.test(s)
      ) {
        s = reverseLineWords(s);
      }
      return s;
    })
    .join("\n");
}
