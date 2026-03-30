import { refineLegalText } from "./refineLegalText";

/**
 * Paragraph-oriented chunking (namespace-notes style), with length fallback
 * when text has few newlines (common for pasted PDFs / Arabic prose).
 */
export function chunkLegalText(
  text: string,
  maxChunkSize = 1500,
  minChunkSize = 400
): string[] {
  const normalized = refineLegalText(text);
  if (!normalized) return [];

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < normalized.length) {
    let endIndex = Math.min(startIndex + maxChunkSize, normalized.length);
    if (endIndex < normalized.length) {
      const boundary = normalized.lastIndexOf("\n\n", endIndex);
      if (boundary > startIndex + minChunkSize) {
        endIndex = boundary;
      } else {
        const space = normalized.lastIndexOf(" ", endIndex);
        if (space > startIndex + minChunkSize) endIndex = space;
      }
    }

    const chunk = normalized.slice(startIndex, endIndex).trim();
    if (chunk.length >= minChunkSize) {
      chunks.push(chunk);
    } else if (chunks.length > 0) {
      chunks[chunks.length - 1] += "\n\n" + chunk;
    } else if (chunk.length > 0) {
      chunks.push(chunk);
    }

    startIndex = endIndex + 1;
  }

  return chunks.filter((c) => c.length > 0);
}
