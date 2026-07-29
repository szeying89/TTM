import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { markdownToHtml } from "./markdown-to-html.js";

// The pinned playwright version here can drift ahead of whatever Chromium
// revision happens to be pre-installed in a given environment (headless
// shell paths in particular are versioned tightly to the Playwright release).
// Falling back to the environment's own chromium binary when present avoids
// requiring a `playwright install` step at deploy time.
const ENV_CHROMIUM_PATH = "/opt/pw-browsers/chromium";

async function resolveExecutablePath(): Promise<string | undefined> {
  try {
    await access(ENV_CHROMIUM_PATH);
    return ENV_CHROMIUM_PATH;
  } catch {
    return undefined;
  }
}

export async function renderMarkdownToPdf(markdown: string, outputPath: string): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const executablePath = await resolveExecutablePath();
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const page = await browser.newPage();
    await page.setContent(markdownToHtml(markdown), { waitUntil: "load" });
    await page.pdf({ path: outputPath, format: "A4", printBackground: true, margin: { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" } });
  } finally {
    await browser.close();
  }
}
