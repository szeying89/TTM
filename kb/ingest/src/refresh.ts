import { createDb } from "@intel-threat-modeller/api-server/db/client";
import { VoyageEmbeddingClient } from "@intel-threat-modeller/embeddings";
import { downloadAtlas, downloadEnterpriseAttack, downloadIcsAttack } from "./download.js";
import { normalizeAttackBundle } from "./normalize-attack.js";
import { normalizeAtlasYaml } from "./normalize-atlas.js";
import { chunkRawChunks } from "./chunk.js";
import { embedAndUpsert } from "./embed-and-upsert.js";
import type { RawChunk } from "./types.js";

async function main() {
  console.log("Downloading MITRE ATT&CK Enterprise, ICS, and ATLAS corpora...");
  const [enterpriseBundle, icsBundle, atlasYaml] = await Promise.all([
    downloadEnterpriseAttack(),
    downloadIcsAttack(),
    downloadAtlas(),
  ]);

  const rawChunks: RawChunk[] = [
    ...normalizeAttackBundle(enterpriseBundle, { framework: "enterprise", killChainName: "mitre-attack" }),
    ...normalizeAttackBundle(icsBundle, { framework: "ics", killChainName: "mitre-ics-attack" }),
    ...normalizeAtlasYaml(atlasYaml),
  ];
  console.log(`Normalized ${rawChunks.length} raw chunks across all three frameworks.`);

  const chunked = chunkRawChunks(rawChunks);
  console.log(`Split into ${chunked.length} embeddable chunks.`);

  const db = createDb();
  const embeddingClient = new VoyageEmbeddingClient();
  const result = await embedAndUpsert(db, embeddingClient, chunked);
  console.log(`Inserted ${result.inserted} new chunks, skipped ${result.skippedUnchanged} unchanged.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
