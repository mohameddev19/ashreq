import { fixArabicPdfExtractedText } from "./fixArabicPdfExtract";

/**
 * Cleans text extracted from PDFs (especially Arabic legal PDFs).
 *
 * Common issues fixed:
 * - C0/C1 control characters (e.g. 0x01) often inserted between "words"
 * - U+FFFD replacement glyphs when encoding fails
 * - U+200B zero-width space → regular space (many PDFs use it as a word boundary)
 * - BOM, soft hyphens, excessive blank lines
 * - Unicode private-use characters (font fallbacks)
 * - NFKC + NFC: maps Arabic presentation forms (ﻨﺤﻥ → نحن) to standard letters
 * - Stray Arabic diacritics sitting between spaces (PDF artifacts)
 *
 * - Merging spurious spaces inside Arabic words (PDF splits; see `fixArabicPdfExtract.ts`)
 * - Optional word-order fixes for some PDFs (`MASHREQ_PDF_AR_REV_WORDS`)
 *
 * Does not fix: scanned-image PDFs, missing font→Unicode mapping (garbled letters).
 */
export function refineLegalText(raw: string): string {
  if (!raw) return "";

  let s = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // C0 controls except \n and \tab; DEL and common C1 controls
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  s = s.replace(/[\u0080-\u009F]/g, "");

  // Replacement character from failed decoding
  s = s.replace(/\uFFFD/g, "");

  // Font fallback / custom glyphs in some official PDFs
  s = s.replace(/[\uE000-\uF8FF]/g, "");

  // PDF / layout artifacts (keep ZWJ ZWNJ for Arabic shaping)
  s = s.replace(/\uFEFF/g, "");
  s = s.replace(/\u200B/g, " ");
  s = s.replace(/\u00AD/g, "");

  // Normalize horizontal whitespace; preserve newlines
  const lines = s.split("\n").map((line) => line.replace(/[ \t\f\v]+/g, " ").trim());
  s = lines.join("\n");

  // Collapse 3+ newlines to 2 (paragraph break)
  s = s.replace(/\n{3,}/g, "\n\n");

  try {
    // Presentation forms (U+FB50–FDFF, U+FE70–FEFF) → standard Arabic; then compose marks.
    s = s.normalize("NFKC").normalize("NFC");
  } catch {
    /* ignore if runtime lacks normalize */
  }

  // Orphan combining marks between whitespace (e.g. tanween left detached after extract)
  s = s.replace(/\s+[\u064B-\u065F\u0670]+\s+/gu, " ");

  s = fixArabicPdfExtractedText(s);

  return s.trim();
}
