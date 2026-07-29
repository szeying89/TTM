import { describe, expect, it } from "vitest";
import { chunkRawChunks, splitLongText } from "./chunk.js";
import type { RawChunk } from "./types.js";

describe("splitLongText", () => {
  it("returns a single segment for short text", () => {
    expect(splitLongText("A short sentence.")).toEqual(["A short sentence."]);
  });

  it("splits long text into overlapping segments of ~300 words", () => {
    const words = Array.from({ length: 700 }, (_, i) => `word${i}`);
    const segments = splitLongText(words.join(" "));

    expect(segments.length).toBeGreaterThan(1);
    for (const segment of segments) {
      expect(segment.split(/\s+/).length).toBeLessThanOrEqual(300);
    }

    // consecutive segments overlap
    const firstWords = segments[0]!.split(/\s+/);
    const secondWords = segments[1]!.split(/\s+/);
    expect(secondWords[0]).toBe(firstWords[firstWords.length - 40]);
  });
});

describe("chunkRawChunks", () => {
  it("preserves metadata while splitting chunkText", () => {
    const raw: RawChunk = {
      techniqueId: "T1566",
      framework: "enterprise",
      name: "Phishing",
      tactic: "Initial Access",
      chunkType: "description",
      chunkText: Array.from({ length: 700 }, (_, i) => `word${i}`).join(" "),
    };

    const result = chunkRawChunks([raw]);
    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.techniqueId).toBe("T1566");
      expect(chunk.tactic).toBe("Initial Access");
      expect(chunk.chunkType).toBe("description");
    }
  });
});
