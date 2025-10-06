CREATE TABLE "global_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"filename" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general',
	"file_size" integer,
	"download_count" integer DEFAULT 0,
	"is_public" boolean DEFAULT true,
	"uploaded_by" integer,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "global_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general',
	"is_external" boolean DEFAULT true,
	"click_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "global_mentorships" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"youtube_url" text,
	"uploaded_video" text,
	"original_name" text,
	"file_size" integer,
	"mime_type" text,
	"view_count" integer DEFAULT 0,
	"duration" integer,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trading_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"goal_type" text NOT NULL,
	"target_value" numeric(10, 2) NOT NULL,
	"current_value" numeric(10, 2) DEFAULT '0.00',
	"deadline" timestamp,
	"is_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trading_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_date" timestamp DEFAULT now(),
	"duration" integer,
	"trades_count" integer DEFAULT 0,
	"profit_loss" numeric(10, 2) DEFAULT '0.00',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"unique_id" text NOT NULL,
	"progress" numeric(5, 2) DEFAULT '0.00',
	"profile_photo" text DEFAULT 'trader1',
	"trading_level" text DEFAULT 'beginner',
	"account_balance" numeric(12, 2) DEFAULT '0.00',
	"total_trades" integer DEFAULT 0,
	"win_rate" numeric(5, 2) DEFAULT '0.00',
	"risk_tolerance" text DEFAULT 'moderate',
	"favorite_pairs" text DEFAULT 'EUR/USD,GBP/USD,USD/JPY',
	"last_active" timestamp DEFAULT now(),
	"joined_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"notifications" boolean DEFAULT true,
	"preferred_timeframe" text DEFAULT 'daily',
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_unique_id_unique" UNIQUE("unique_id")
);
