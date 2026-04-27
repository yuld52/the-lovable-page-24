ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "paypal_capture_id" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "paypal_currency" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "paypal_amount_minor" integer;
