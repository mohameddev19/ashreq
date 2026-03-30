import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/**
 * Legal Arabic–aware hierarchy: chapter → article → clause → sentence → word.
 * chunkOverlap keeps conditions linked to consequences across chunk boundaries.
 */
export function getLegalRecursiveSplitter(): RecursiveCharacterTextSplitter {
  return new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n\n", "\n\n", "\n", ". ", " ", ""],
  });
}
