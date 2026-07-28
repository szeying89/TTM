CREATE TABLE IF NOT EXISTS "risk_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attack_path_id" uuid NOT NULL,
	"likelihood" real NOT NULL,
	"impact" real NOT NULL,
	"base_score" real NOT NULL,
	"cri_adjustment" jsonb NOT NULL,
	"intel_adjustment" jsonb,
	"score" real NOT NULL,
	"rank" integer NOT NULL,
	"heatmap_cell" text NOT NULL,
	"rationale" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_attack_path_id_attack_paths_id_fk" FOREIGN KEY ("attack_path_id") REFERENCES "public"."attack_paths"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
