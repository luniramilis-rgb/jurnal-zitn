CREATE TABLE "reference_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_currency" varchar(3) NOT NULL,
	"quote_currency" varchar(3) NOT NULL,
	"rate" numeric(24, 12) NOT NULL,
	"effective_date" date NOT NULL,
	"source" varchar(32) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reference_rates_distinct_currencies_chk" CHECK ("reference_rates"."base_currency" <> "reference_rates"."quote_currency"),
	CONSTRAINT "reference_rates_rate_positive_chk" CHECK ("reference_rates"."rate" > 0)
);
--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "fx_rate" numeric(24, 12);--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "fx_source" varchar(32);--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "fx_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "reference_rates_pair_date_unique" ON "reference_rates" USING btree ("base_currency","quote_currency","effective_date");