-- ZITN-TECH-070 §3b: `status` becomes a pure lifecycle (draft/closed); the user's
-- choice moves to `decision`. Remap the old mixed enum, preserving intent:
--   pending   -> draft            (still open, undecided)
--   executed  -> closed + taken
--   cancelled -> closed + skipped
--   missed    -> closed + no_action
-- `decision` is only backfilled where still NULL (0048 may have already set it).
ALTER TABLE "trade_plans" DROP CONSTRAINT "trade_plans_status_chk";--> statement-breakpoint
UPDATE "trade_plans" SET "decision" = 'taken' WHERE "status" = 'executed' AND "decision" IS NULL;--> statement-breakpoint
UPDATE "trade_plans" SET "decision" = 'skipped' WHERE "status" = 'cancelled' AND "decision" IS NULL;--> statement-breakpoint
UPDATE "trade_plans" SET "decision" = 'no_action' WHERE "status" = 'missed' AND "decision" IS NULL;--> statement-breakpoint
UPDATE "trade_plans" SET "status" = 'draft' WHERE "status" = 'pending';--> statement-breakpoint
UPDATE "trade_plans" SET "status" = 'closed' WHERE "status" IN ('executed','missed','cancelled');--> statement-breakpoint
ALTER TABLE "trade_plans" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "trade_plans" ADD CONSTRAINT "trade_plans_status_chk" CHECK ("trade_plans"."status" IN ('draft','closed'));
