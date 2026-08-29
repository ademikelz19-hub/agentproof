CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"chain" text NOT NULL,
	"onchain_id" text NOT NULL,
	"registry_address" text,
	"name" text,
	"description" text,
	"metadata_uri" text,
	"metadata_resolved" boolean DEFAULT false NOT NULL,
	"provenance_source" text NOT NULL,
	"provenance_origin" text NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_ingested_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrity_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"signal_type" text NOT NULL,
	"description" text NOT NULL,
	"detected_at" timestamp with time zone NOT NULL,
	"methodology_version" text NOT NULL,
	"provenance_source" text NOT NULL,
	"provenance_origin" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "methodology_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"version" text NOT NULL,
	"description" text,
	"effective_from" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" text PRIMARY KEY NOT NULL,
	"probe_run_id" text,
	"agent_id" text NOT NULL,
	"chain" text NOT NULL,
	"service_id" text,
	"probe_type" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"outcome" text NOT NULL,
	"latency_ms" integer,
	"http_status" integer,
	"failure_reason" text,
	"provenance_source" text NOT NULL,
	"provenance_origin" text NOT NULL,
	"probe_version" text NOT NULL,
	"methodology_version" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "probe_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"target_agent_count" integer NOT NULL,
	"probe_version" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reputation_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"feedback_count" integer NOT NULL,
	"unique_reviewer_count" integer NOT NULL,
	"reviewer_concentration" real,
	"repeat_review_concentration" real,
	"methodology_version" text NOT NULL,
	"computed_at" timestamp with time zone NOT NULL,
	"provenance_source" text NOT NULL,
	"provenance_origin" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"chain" text NOT NULL,
	"declaration_form" text NOT NULL,
	"protocol" text NOT NULL,
	"url" text NOT NULL,
	"provenance_source" text NOT NULL,
	"provenance_origin" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "agents_chain_idx" ON "agents" USING btree ("chain");--> statement-breakpoint
CREATE UNIQUE INDEX "agents_chain_onchain_unique" ON "agents" USING btree ("chain","onchain_id");--> statement-breakpoint
CREATE INDEX "integrity_signals_agent_idx" ON "integrity_signals" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "observations_agent_time_idx" ON "observations" USING btree ("agent_id","timestamp");--> statement-breakpoint
CREATE INDEX "observations_service_time_idx" ON "observations" USING btree ("service_id","timestamp");--> statement-breakpoint
CREATE INDEX "observations_time_idx" ON "observations" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "reputation_snapshots_agent_time_idx" ON "reputation_snapshots" USING btree ("agent_id","computed_at");--> statement-breakpoint
CREATE INDEX "services_agent_idx" ON "services" USING btree ("agent_id");