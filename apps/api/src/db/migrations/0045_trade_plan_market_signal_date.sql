ALTER TABLE "trade_plans" ADD COLUMN "market" varchar(4) DEFAULT 'id' NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_plans" ADD COLUMN "signal_date" date;--> statement-breakpoint
ALTER TABLE "trade_plans" ADD CONSTRAINT "trade_plans_market_chk" CHECK ("trade_plans"."market" IN ('id','us'));