import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StixBundle } from "./stix-types.js";

// Pinned to the `master`/`main` branch tip rather than a specific commit SHA
// for now - revisit if reproducibility across ingestion runs becomes an issue.
const SOURCES = {
  enterpriseAttack:
    "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json",
  icsAttack:
    "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/ics-attack/ics-attack.json",
  atlas: "https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/ATLAS.yaml",
} as const;

const DATA_DIR = path.join(process.cwd(), "data");

async function downloadText(url: string, cacheFile: string): Promise<string> {
  await mkdir(DATA_DIR, { recursive: true });
  const cachePath = path.join(DATA_DIR, cacheFile);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  await writeFile(cachePath, text, "utf-8");
  return text;
}

export async function downloadEnterpriseAttack(): Promise<StixBundle> {
  const text = await downloadText(SOURCES.enterpriseAttack, "enterprise-attack.json");
  return JSON.parse(text) as StixBundle;
}

export async function downloadIcsAttack(): Promise<StixBundle> {
  const text = await downloadText(SOURCES.icsAttack, "ics-attack.json");
  return JSON.parse(text) as StixBundle;
}

export async function downloadAtlas(): Promise<string> {
  return downloadText(SOURCES.atlas, "ATLAS.yaml");
}
