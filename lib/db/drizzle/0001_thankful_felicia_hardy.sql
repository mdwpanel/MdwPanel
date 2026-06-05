ALTER TABLE "users" ADD COLUMN "profanity_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "frozen_until" timestamp;