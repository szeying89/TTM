CREATE TABLE IF NOT EXISTS "report_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"threat_model_markdown" text NOT NULL,
	"json_dump" jsonb NOT NULL,
	"navigator_layer" jsonb NOT NULL,
	"risk_register_csv" text NOT NULL,
	"pdf_path" text,
	"confidence" real NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_artifacts" ADD CONSTRAINT "report_artifacts_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
