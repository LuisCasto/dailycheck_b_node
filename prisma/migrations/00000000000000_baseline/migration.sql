CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "hashed_password" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "habits" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "icon" TEXT,
  "daily_task" TEXT NOT NULL,
  "target_value" INTEGER,
  "unit" TEXT,
  "frequency" TEXT,
  "times_per_period" INTEGER,
  "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "habits" ADD COLUMN IF NOT EXISTS "frequency" TEXT;
ALTER TABLE "habits" ADD COLUMN IF NOT EXISTS "times_per_period" INTEGER;
CREATE INDEX IF NOT EXISTS "habits_user_id_idx" ON "habits"("user_id");
DO $$ BEGIN
  ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "habit_logs" (
  "id" UUID NOT NULL,
  "habit_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "completed" BOOLEAN,
  "note" TEXT,
  "logged_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "habit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_habit_log_per_day" UNIQUE ("habit_id", "date")
);
CREATE INDEX IF NOT EXISTS "habit_logs_user_id_idx" ON "habit_logs"("user_id");
DO $$ BEGIN
  ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
