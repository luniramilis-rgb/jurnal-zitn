CREATE TABLE "playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"setup_rules" text,
	"entry_trigger" text,
	"exit_criteria" text,
	"timeframe" varchar(32),
	"instrument" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" varchar(32) NOT NULL,
	"side" varchar(5) NOT NULL,
	"thesis" text,
	"playbook_id" uuid,
	"entry_zone_low" numeric(18, 8),
	"entry_zone_high" numeric(18, 8),
	"stop_loss" numeric(18, 8),
	"target_price" numeric(18, 8),
	"status" varchar(12) DEFAULT 'pending' NOT NULL,
	"position_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trade_plans_side_chk" CHECK ("trade_plans"."side" IN ('long','short')),
	CONSTRAINT "trade_plans_status_chk" CHECK ("trade_plans"."status" IN ('pending','executed','missed','cancelled'))
);
--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "playbook_id" uuid;--> statement-breakpoint
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_plans" ADD CONSTRAINT "trade_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playbooks_user_id_idx" ON "playbooks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trade_plans_user_id_idx" ON "trade_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trade_plans_user_id_status_idx" ON "trade_plans" USING btree ("user_id","status");