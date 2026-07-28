import { describe, expect, it } from "vitest";
import { contentHashOf } from "./embed-and-upsert.js";
import type { RawChunk } from "./types.js";

const chunk: RawChunk = {
  techniqueId: "T1566",
  framework: "enterprise",
  name: "Phishing",
  tactic: "Initial Access",
  chunkType: "description",
  chunkText: "Adversaries may send phishing messages.",
};

describe("contentHashOf", () => {
  it("is deterministic for the same chunk content", () => {
    expect(contentHashOf(chunk)).toBe(contentHashOf({ ...chunk }));
  });

  it("changes when the chunk text changes", () => {
    expect(contentHashOf(chunk)).not.toBe(contentHashOf({ ...chunk, chunkText: "Different text." }));
  });

  it("changes when the tactic changes, even with identical text", () => {
    expect(contentHashOf(chunk)).not.toBe(contentHashOf({ ...chunk, tactic: "Execution" }));
  });
});
