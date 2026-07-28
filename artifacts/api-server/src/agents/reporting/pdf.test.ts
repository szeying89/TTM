import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderMarkdownToPdf } from "./pdf.js";

describe("renderMarkdownToPdf", () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "report-pdf-"));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("renders a real PDF file with non-trivial size", async () => {
    const outputPath = path.join(dir, "report.pdf");
    await renderMarkdownToPdf("# Test Report\n\n**Confidence score:** 90/100\n\n- finding one\n- finding two", outputPath);

    const stats = await stat(outputPath);
    expect(stats.size).toBeGreaterThan(1000);
  }, 30_000);
});
