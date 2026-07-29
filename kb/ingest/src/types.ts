export type MitreFramework = "enterprise" | "ics" | "atlas";
export type ChunkType = "description" | "detection" | "mitigation" | "example";

export interface RawChunk {
  techniqueId: string;
  framework: MitreFramework;
  name: string;
  tactic: string;
  chunkType: ChunkType;
  chunkText: string;
}
