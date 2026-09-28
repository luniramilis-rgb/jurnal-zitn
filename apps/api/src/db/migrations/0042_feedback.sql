CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"type" varchar(16) NOT NULL,
	"message" text NOT NULL,
	"page_url" varchar(2048) NOT NULL,
	"source" varchar(16) DEFAULT 'jurnal' NOT NULL,
	"status" varchar(16) DEFAULT 'baru' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_type_chk" CHECK ("feedback"."type" IN ('bug','feature','general','question')),
	CONSTRAINT "feedback_source_chk" CHECK ("feedback"."source" IN ('jurnal','lembar')),
	CONSTRAINT "feedback_status_chk" CHECK ("feedback"."status" IN ('baru','ditinjau','direncanakan','selesai','ditolak'))
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_user_id_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_status_created_idx" ON "feedback" USING btree ("status","created_at");