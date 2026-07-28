CREATE TYPE "public"."applicability" AS ENUM('applicable', 'not-applicable');--> statement-breakpoint
CREATE TYPE "public"."source_pass" AS ENUM('rule-pack', 'stride-llm', 'other-threats');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attack_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_model_id" uuid NOT NULL,
	"name" text NOT NULL,
	"source_pass" "source_pass" NOT NULL,
	"stride_categories" jsonb NOT NULL,
	"entities" jsonb NOT NULL,
	"kill_chain_stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"group_key" text NOT NULL,
	"grounding_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"applicability" "applicability" NOT NULL,
	"not_applicable_rationale_category" text,
	"not_applicable_rationale" text
);
--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD COLUMN "framework" "mitre_framework" DEFAULT 'enterprise' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attack_paths" ADD CONSTRAINT "attack_paths_system_model_id_system_models_id_fk" FOREIGN KEY ("system_model_id") REFERENCES "public"."system_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
