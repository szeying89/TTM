CREATE TYPE "public"."intel_feed_source_type" AS ENUM('url', 'pdf');--> statement-breakpoint
CREATE TYPE "public"."intel_feed_status" AS ENUM('pending', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."intel_signal_type" AS ENUM('active-exploitation', 'threat-actor-targeting', 'cve-severity', 'sector-relevance', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_audience" AS ENUM('executive', 'ciso', 'technical');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "design_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"prose" text DEFAULT '' NOT NULL,
	"mermaid_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cri_maturity" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intel_feed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source_type" "intel_feed_source_type" NOT NULL,
	"source_ref" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_text_ref" text,
	"status" "intel_feed_status" DEFAULT 'pending' NOT NULL,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intel_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intel_feed_item_id" uuid NOT NULL,
	"signal_type" "intel_signal_type" NOT NULL,
	"related_technique_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_component_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"severity" real NOT NULL,
	"summary" text NOT NULL,
	"confidence" real NOT NULL,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"audience" "report_audience" NOT NULL,
	"confidence" real NOT NULL,
	"confidence_sub_scores" jsonb NOT NULL,
	"markdown" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "design_docs" ADD CONSTRAINT "design_docs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intel_feed_items" ADD CONSTRAINT "intel_feed_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intel_signals" ADD CONSTRAINT "intel_signals_intel_feed_item_id_intel_feed_items_id_fk" FOREIGN KEY ("intel_feed_item_id") REFERENCES "public"."intel_feed_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
