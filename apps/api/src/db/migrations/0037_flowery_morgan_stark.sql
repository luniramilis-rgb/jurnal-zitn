CREATE TABLE "sso_consumed_tokens" (
	"jti" varchar(128) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "zitn_user_id" varchar(64);--> statement-breakpoint
CREATE INDEX "sso_consumed_tokens_expires_at_idx" ON "sso_consumed_tokens" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_zitn_user_id_unique" UNIQUE("zitn_user_id");