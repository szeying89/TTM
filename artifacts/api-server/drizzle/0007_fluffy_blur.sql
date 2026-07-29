CREATE TYPE "public"."validation_category" AS ENUM('entity-anchoring', 'group-key', 'not-applicable-rationale', 'coverage', 'pivot-node');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coverage_critic_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_model_id" uuid NOT NULL,
	"framework" text NOT NULL,
	"techniques_covered" jsonb NOT NULL,
	"techniques_unaddressed" jsonb NOT NULL,
	"coverage_percent" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pivot_node_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_model_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"attack_path_count" integer NOT NULL,
	"trust_boundary_crossing_count" integer NOT NULL,
	"linked_mitigation_ids" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "validation_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_model_id" uuid NOT NULL,
	"rule_id" text NOT NULL,
	"category" "validation_category" NOT NULL,
	"target_id" text NOT NULL,
	"passed" boolean NOT NULL,
	"message" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coverage_critic_results" ADD CONSTRAINT "coverage_critic_results_system_model_id_system_models_id_fk" FOREIGN KEY ("system_model_id") REFERENCES "public"."system_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pivot_node_findings" ADD CONSTRAINT "pivot_node_findings_system_model_id_system_models_id_fk" FOREIGN KEY ("system_model_id") REFERENCES "public"."system_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "validation_findings" ADD CONSTRAINT "validation_findings_system_model_id_system_models_id_fk" FOREIGN KEY ("system_model_id") REFERENCES "public"."system_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
