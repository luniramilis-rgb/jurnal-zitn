ALTER TABLE "trade_plans" RENAME COLUMN "thesis" TO "note";--> statement-breakpoint
ALTER TABLE "trade_plans" DROP COLUMN "entry_zone_low";--> statement-breakpoint
ALTER TABLE "trade_plans" DROP COLUMN "entry_zone_high";--> statement-breakpoint
ALTER TABLE "trade_plans" DROP COLUMN "position_id";--> statement-breakpoint
ALTER TABLE "trade_plans" ADD COLUMN "rule" varchar(32);--> statement-breakpoint
ALTER TABLE "trade_plans" ADD COLUMN "source" varchar(12);--> statement-breakpoint
ALTER TABLE "trade_plans" ADD COLUMN "entry_price" numeric(18, 8);--> statement-breakpoint
ALTER TABLE "trade_plans" ADD COLUMN "decision" varchar(12);--> statement-breakpoint
ALTER TABLE "trade_plans" ADD COLUMN "sizing" jsonb;--> statement-breakpoint
ALTER TABLE "trade_plans" ADD COLUMN "pra_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "trade_plans" ADD COLUMN "outcome" jsonb;--> statement-breakpoint
ALTER TABLE "trade_plans" ADD CONSTRAINT "trade_plans_source_chk" CHECK ("trade_plans"."source" IS NULL OR "trade_plans"."source" IN ('pemindai','chart','manual'));--> statement-breakpoint
ALTER TABLE "trade_plans" ADD CONSTRAINT "trade_plans_decision_chk" CHECK ("trade_plans"."decision" IS NULL OR "trade_plans"."decision" IN ('taken','skipped','no_action'));
