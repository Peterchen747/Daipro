CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"date" date,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_pending_payment" boolean DEFAULT false NOT NULL;