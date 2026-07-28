import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { extractPdfText, fetchUrlText } from "./fetch.js";
import { buildMinimalPdf } from "./test-fixtures/build-minimal-pdf.js";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("fetchUrlText", () => {
  it("extracts readable article text from an HTML page", async () => {
    server.use(
      http.get("https://example.com/advisory", () =>
        HttpResponse.html(`
          <html>
            <head><title>Security Advisory</title></head>
            <body>
              <article>
                <h1>Active Exploitation of Widget CMS Plugin</h1>
                <p>Researchers have observed active exploitation of a critical vulnerability in the Widget CMS plugin, affecting internet-facing installations. Attackers are using phishing emails to deliver initial payloads before exploiting the plugin remotely.</p>
                <p>Organizations running the affected plugin version should patch immediately, as exploitation has been confirmed in the wild against multiple sectors.</p>
              </article>
            </body>
          </html>
        `),
      ),
    );

    const text = await fetchUrlText("https://example.com/advisory");
    expect(text).toContain("Widget CMS");
    expect(text).toContain("exploitation");
  });

  it("throws on a non-ok response", async () => {
    server.use(http.get("https://example.com/missing", () => HttpResponse.text("not found", { status: 404 })));
    await expect(fetchUrlText("https://example.com/missing")).rejects.toThrow(/404/);
  });

  it("throws when the page has no extractable article content", async () => {
    server.use(http.get("https://example.com/blank", () => HttpResponse.html("<html><body></body></html>")));
    await expect(fetchUrlText("https://example.com/blank")).rejects.toThrow(/Could not extract/);
  });
});

describe("extractPdfText", () => {
  it("extracts text from a valid single-page PDF", async () => {
    const pdf = buildMinimalPdf("Critical advisory: active exploitation observed.");
    const text = await extractPdfText(pdf);
    expect(text).toContain("Critical advisory");
  });

  it("throws on a non-PDF buffer", async () => {
    await expect(extractPdfText(Buffer.from("not a pdf"))).rejects.toThrow();
  });
});
