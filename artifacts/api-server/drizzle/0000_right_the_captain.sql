CREATE TYPE "public"."chunk_type" AS ENUM('description', 'detection', 'mitigation', 'example');--> statement-breakpoint
CREATE TYPE "public"."mitre_framework" AS ENUM('enterprise', 'ics', 'atlas');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "technique_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"technique_id" text NOT NULL,
	"framework" "mitre_framework" NOT NULL,
	"name" text NOT NULL,
	"tactic" text NOT NULL,
	"chunk_type" "chunk_type" NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "technique_chunks_technique_id_idx" ON "technique_chunks" USING btree ("technique_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "technique_chunks_framework_idx" ON "technique_chunks" USING btree ("framework");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "technique_chunks_content_hash_idx" ON "technique_chunks" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "technique_chunks_embedding_hnsw_idx" ON "technique_chunks" USING hnsw ("embedding" vector_cosine_ops);