import type { RawChunk } from "./types.js";

const WORDS_PER_CHUNK = 300; // ~400 tokens at ~0.75 tokens/word
const OVERLAP_WORDS = 40; // ~50 tokens

export function splitLongText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= WORDS_PER_CHUNK) return [text.trim()];

  const segments: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + WORDS_PER_CHUNK, words.length);
    segments.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - OVERLAP_WORDS;
  }
  return segments;
}

export function chunkRawChunks(rawChunks: RawChunk[]): RawChunk[] {
  return rawChunks.flatMap((raw) =>
    splitLongText(raw.chunkText).map((chunkText) => ({ ...raw, chunkText })),
  );
}
