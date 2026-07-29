import { writeFileSync } from "node:fs";
import path from "node:path";
import { buildMinimalPdf } from "../intel/test-fixtures/build-minimal-pdf.js";

const pdf = buildMinimalPdf("Critical advisory: active exploitation observed in the wild for this technique.");
const outPath = path.join(process.cwd(), "..", "..", "fixtures", "intel", "advisory.pdf");
writeFileSync(outPath, pdf);
console.log(`wrote ${pdf.length} bytes to ${outPath}`);
