CREATE TYPE "public"."component_type" AS ENUM('process', 'datastore', 'external_entity', 'actor');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_model_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "component_type" NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"technologies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trust_boundary_id" uuid,
	"source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dataflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_model_id" uuid NOT NULL,
	"name" text NOT NULL,
	"source_component_id" uuid NOT NULL,
	"target_component_id" uuid NOT NULL,
	"protocol" text,
	"data_classification" text,
	"crosses_trust_boundary_ids" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trust_boundaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_model_id" uuid NOT NULL,
	"name" text NOT NULL,
	"component_ids" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "components" ADD CONSTRAINT "components_system_model_id_system_models_id_fk" FOREIGN KEY ("system_model_id") REFERENCES "public"."system_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "components" ADD CONSTRAINT "components_trust_boundary_id_trust_boundaries_id_fk" FOREIGN KEY ("trust_boundary_id") REFERENCES "public"."trust_boundaries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dataflows" ADD CONSTRAINT "dataflows_system_model_id_system_models_id_fk" FOREIGN KEY ("system_model_id") REFERENCES "public"."system_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dataflows" ADD CONSTRAINT "dataflows_source_component_id_components_id_fk" FOREIGN KEY ("source_component_id") REFERENCES "public"."components"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dataflows" ADD CONSTRAINT "dataflows_target_component_id_components_id_fk" FOREIGN KEY ("target_component_id") REFERENCES "public"."components"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_models" ADD CONSTRAINT "system_models_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trust_boundaries" ADD CONSTRAINT "trust_boundaries_system_model_id_system_models_id_fk" FOREIGN KEY ("system_model_id") REFERENCES "public"."system_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
