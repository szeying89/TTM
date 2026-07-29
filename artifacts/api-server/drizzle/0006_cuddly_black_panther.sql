CREATE TYPE "public"."mitigation_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."mitigation_status" AS ENUM('proposed', 'accepted', 'rejected', 'implemented');--> statement-breakpoint
CREATE TYPE "public"."assumption_source" AS ENUM('explicit', 'inferred');--> statement-breakpoint
CREATE TYPE "public"."design_delta_kind" AS ENUM('dataflow-refinement', 'trust-boundary-correction', 'component-addition');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mitigation_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_model_id" uuid NOT NULL,
	"attack_path_ids" jsonb NOT NULL,
	"control_family" text NOT NULL,
	"cri_function" text,
	"cri_diagnostic_statement" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" "mitigation_priority" NOT NULL,
	"status" "mitigation_status" DEFAULT 'proposed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_model_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"related_component_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" "assumption_source" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "design_deltas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_model_id" uuid NOT NULL,
	"kind" "design_delta_kind" NOT NULL,
	"target_id" text,
	"description" text NOT NULL,
	"proposed_change" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mitigation_recommendations" ADD CONSTRAINT "mitigation_recommendations_system_model_id_system_models_id_fk" FOREIGN KEY ("system_model_id") REFERENCES "public"."system_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assumptions" ADD CONSTRAINT "assumptions_system_model_id_system_models_id_fk" FOREIGN KEY ("system_model_id") REFERENCES "public"."system_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "design_deltas" ADD CONSTRAINT "design_deltas_system_model_id_system_models_id_fk" FOREIGN KEY ("system_model_id") REFERENCES "public"."system_models"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
