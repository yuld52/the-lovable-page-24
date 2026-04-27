ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_source" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_medium" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_campaign" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_content" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "utm_term" text;
