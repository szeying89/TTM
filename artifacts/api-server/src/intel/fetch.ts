import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { extractText, getDocumentProxy } from "unpdf";

export async function fetchUrlText(url: string): Promise<string> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const html = await response.text();

  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  const text = article?.textContent?.trim();
  if (!text) {
    throw new Error(`Could not extract readable article content from ${url}`);
  }
  return text;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  if (!text.trim()) {
    throw new Error("PDF contained no extractable text");
  }
  return text;
}
